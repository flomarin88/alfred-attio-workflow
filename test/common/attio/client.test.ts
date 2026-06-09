/**
 * Story 1.7 unit tests for `src/common/attio/client.ts`.
 *
 * Coverage targets:
 *   - `request()` happy path (Authorization header, JSON body, status mapping)
 *   - FR-051 status → WorkflowError mapping (401, 403, 404, 422, unknown 4xx)
 *   - NFR-005 retry: 429 + 429, 429 + 200, 5xx + 5xx, 5xx + 200, socket failures
 *   - zod parse failure surfaces as `validation` WITHOUT httpStatus
 *   - Cache integration: hit path skips fetch, miss path stores result
 *   - Typed wrappers: getSelf, listObjects, getObjectAttributes, listTasks, queryRecords
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AttioClient } from '../../../src/common/attio/client'
import { Cache, type CacheBackend } from '../../../src/common/cache'
import { RETRY_INITIAL_DELAY_MS, RETRY_MAX_DELAY_MS } from '../../../src/common/constants'

// ---------------------------------------------------------------------------
// In-memory cache backend
// ---------------------------------------------------------------------------

class MemoryBackend implements CacheBackend {
  readonly store = new Map<string, unknown>()
  setWithTTL(key: string, value: unknown): void {
    this.store.set(key, value)
  }
  get(key: string): unknown {
    return this.store.get(key)
  }
  has(key: string): boolean {
    return this.store.has(key)
  }
  delete(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

// ---------------------------------------------------------------------------
// Wire fixtures (inline — small enough that a fixtures directory would be overkill)
// ---------------------------------------------------------------------------

const SELF_WIRE = {
  workspace_id: 'wks_abc',
  workspace_slug: 'studio-florian-marin',
  workspace_name: 'Studio Florian Marin',
  authorized_by_workspace_member_id: 'mem_xyz',
}

const OBJECTS_WIRE = {
  data: [
    {
      id: { object_id: 'obj_people' },
      api_slug: 'people',
      singular_noun: 'Person',
      plural_noun: 'People',
    },
    {
      id: { object_id: 'obj_deals' },
      api_slug: 'deals',
      singular_noun: 'Deal',
      plural_noun: 'Deals',
    },
  ],
}

const ATTRIBUTES_WIRE = {
  data: [
    {
      id: { attribute_id: 'attr_email' },
      api_slug: 'email_addresses',
      title: 'Email',
      type: 'email-address',
      is_archived: false,
      is_system_attribute: false,
      is_writable: true,
    },
  ],
}

const TASKS_WIRE = {
  data: [
    {
      id: { task_id: 'task_1' },
      content_plaintext: 'Follow up with Acme',
      deadline_at: '2026-07-01T12:00:00.000Z',
      is_completed: false,
      assignees: [{ workspace_member_id: 'mem_xyz' }],
      linked_records: [{ target_object: 'companies', target_record_id: 'comp_acme' }],
      created_at: '2026-06-01T08:00:00.000Z',
    },
  ],
}

const RECORDS_WIRE = {
  data: [
    {
      id: { record_id: 'rec_jane' },
      web_url: 'https://app.attio.com/x/people/rec_jane',
      values: { name: 'Jane Doe' },
      created_at: '2026-05-01T10:00:00.000Z',
    },
  ],
}

// ---------------------------------------------------------------------------
// Default options factory — supplies a fresh fake fetch and sleep per test
// ---------------------------------------------------------------------------

function makeClient(fetchImpl: typeof globalThis.fetch, sleep = vi.fn().mockResolvedValue(undefined)) {
  const cache = new Cache(new MemoryBackend())
  const client = new AttioClient({
    accessToken: 'pat_test',
    cache,
    baseUrl: 'https://api.attio.test',
    fetch: fetchImpl,
    sleep,
  })
  return { client, cache, sleep }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// request() — happy path + headers + body
// ---------------------------------------------------------------------------

describe('AttioClient.request — transport contract', () => {
  it('sends Bearer token in Authorization header and JSON body for POST', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    const { client } = makeClient(fetchImpl)

    await client.request('POST', '/v2/foo', { hello: 'world' })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.attio.test/v2/foo')
    expect((init as RequestInit).method).toBe('POST')
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe('Bearer pat_test')
    expect(((init as RequestInit).headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect((init as RequestInit).body).toBe(JSON.stringify({ hello: 'world' }))
  })

  it('omits body on GET', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const { client } = makeClient(fetchImpl)
    await client.request('GET', '/v2/self')
    const [, init] = fetchImpl.mock.calls[0]
    expect((init as RequestInit).body).toBeUndefined()
  })

  it('returns parsed JSON on 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { foo: 42 }))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: true, data: { foo: 42 } })
  })
})

// ---------------------------------------------------------------------------
// FR-051 status mapping
// ---------------------------------------------------------------------------

describe('AttioClient.request — FR-051 status mapping', () => {
  it.each([
    [401, { kind: 'auth-invalid', httpStatus: 401 }],
    [403, { kind: 'auth-scope-missing', httpStatus: 403 }],
  ])('maps HTTP %d to the corresponding WorkflowError kind', async (status, expectedError) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(status, {}))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: false, error: expectedError })
  })

  it('maps 404 to record-not-found with empty slug/id (caller can override)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(404, {}))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({
      ok: false,
      error: { kind: 'record-not-found', httpStatus: 404, slug: '', id: '' },
    })
  })

  it('maps 422 to validation and surfaces the Attio message verbatim', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(422, { message: 'email_addresses[0]: must be a valid email' }))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('POST', '/v2/x', {})
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'validation',
        httpStatus: 422,
        attioMessage: 'email_addresses[0]: must be a valid email',
      },
    })
  })

  it('falls back to "Validation failed" if the 422 body has no message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(422, {}))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('POST', '/v2/x', {})
    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'validation', httpStatus: 422, attioMessage: 'Validation failed' },
    })
  })

  it('buckets unmapped 4xx into kind: "unknown" with httpStatus', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(418, {}))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: false, error: { kind: 'unknown', httpStatus: 418 } })
  })
})

// ---------------------------------------------------------------------------
// NFR-005 retry semantics
// ---------------------------------------------------------------------------

describe('AttioClient.request — NFR-005 retry', () => {
  it('retries once on 429 using Retry-After (seconds), then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    const { client, sleep } = makeClient(fetchImpl)

    const result = await client.request('GET', '/v2/x')

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(2000)
    expect(result).toEqual({ ok: true, data: { ok: true } })
  })

  it('caps Retry-After backoff at RETRY_MAX_DELAY_MS', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'Retry-After': '999' }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
    const { sleep, client } = makeClient(fetchImpl)
    await client.request('GET', '/v2/x')
    expect(sleep).toHaveBeenCalledWith(RETRY_MAX_DELAY_MS)
  })

  it('returns rate-limit after a second 429', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'Retry-After': '4' }))
    const { client } = makeClient(fetchImpl)

    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({
      ok: false,
      error: { kind: 'rate-limit', httpStatus: 429, retryAfter: 4 },
    })
  })

  it('defaults Retry-After to 1 second when the header is missing', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(429, {})).mockResolvedValueOnce(jsonResponse(200, {}))
    const { sleep, client } = makeClient(fetchImpl)
    await client.request('GET', '/v2/x')
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('retries once on 5xx and succeeds on the second attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    const { client, sleep } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: true, data: { ok: true } })
    expect(sleep).toHaveBeenCalledWith(RETRY_INITIAL_DELAY_MS)
  })

  it('returns unreachable (cause: http-5xx) after a second 5xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(500, {})).mockResolvedValueOnce(jsonResponse(502, {}))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: false, error: { kind: 'unreachable', cause: 'http-5xx' } })
  })

  it('retries once on a socket-level fetch failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }))
    const { client, sleep } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: true, data: { ok: 1 } })
    expect(sleep).toHaveBeenCalledWith(RETRY_INITIAL_DELAY_MS)
  })

  it('returns unreachable (cause: socket) when both fetches throw', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
    const { client } = makeClient(fetchImpl)
    const result = await client.request('GET', '/v2/x')
    expect(result).toEqual({ ok: false, error: { kind: 'unreachable', cause: 'socket' } })
  })
})

// ---------------------------------------------------------------------------
// getSelf — IdentitySchema parse + error forwarding
// ---------------------------------------------------------------------------

describe('AttioClient.getSelf', () => {
  it('returns the parsed camelCase identity on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, SELF_WIRE))
    const { client } = makeClient(fetchImpl)
    const result = await client.getSelf()
    expect(result).toEqual({
      ok: true,
      data: {
        workspaceId: 'wks_abc',
        workspaceSlug: 'studio-florian-marin',
        workspaceName: 'Studio Florian Marin',
        workspaceMemberId: 'mem_xyz',
      },
    })
  })

  it('forwards a transport error verbatim', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, {}))
    const { client } = makeClient(fetchImpl)
    const result = await client.getSelf()
    expect(result).toEqual({ ok: false, error: { kind: 'auth-invalid', httpStatus: 401 } })
  })

  it('returns validation WITHOUT httpStatus when the wire shape diverges', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { workspace_id: 42 }))
    const { client } = makeClient(fetchImpl)
    const result = await client.getSelf()
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'validation',
        attioMessage: expect.stringContaining('workspace_id'),
      },
    })
  })
})

// ---------------------------------------------------------------------------
// listObjects — cache integration + schema parsing
// ---------------------------------------------------------------------------

describe('AttioClient.listObjects', () => {
  it('returns parsed ObjectInfo[] with camelCase on cache miss', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, OBJECTS_WIRE))
    const { client, cache } = makeClient(fetchImpl)
    const result = await client.listObjects()
    expect(result).toEqual({
      ok: true,
      data: [
        { id: 'obj_people', slug: 'people', singularNoun: 'Person', pluralNoun: 'People' },
        { id: 'obj_deals', slug: 'deals', singularNoun: 'Deal', pluralNoun: 'Deals' },
      ],
    })
    // Cache populated for the next call.
    expect(cache.getObjects()).toEqual([
      { id: 'obj_people', slug: 'people', singularNoun: 'Person', pluralNoun: 'People' },
      { id: 'obj_deals', slug: 'deals', singularNoun: 'Deal', pluralNoun: 'Deals' },
    ])
  })

  it('skips fetch on cache hit', async () => {
    const fetchImpl = vi.fn()
    const { client, cache } = makeClient(fetchImpl)
    cache.setObjects([{ id: 'pre', slug: 'cached', singularNoun: 'C', pluralNoun: 'Cs' }])
    const result = await client.listObjects()
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: true,
      data: [{ id: 'pre', slug: 'cached', singularNoun: 'C', pluralNoun: 'Cs' }],
    })
  })

  it('surfaces a zod parse failure as validation without httpStatus', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ id: 'wrong shape' }] }))
    const { client } = makeClient(fetchImpl)
    const result = await client.listObjects()
    // `toEqual` rejects extra keys → absence of `httpStatus` is verified structurally,
    // distinguishing client-side parse failures from Attio 422 (FR-051).
    expect(result).toEqual({
      ok: false,
      error: { kind: 'validation', attioMessage: expect.any(String) },
    })
  })
})

// ---------------------------------------------------------------------------
// getObjectAttributes — cache integration + per-slug key
// ---------------------------------------------------------------------------

describe('AttioClient.getObjectAttributes', () => {
  it('parses the attribute definitions on cache miss and stores per slug', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, ATTRIBUTES_WIRE))
    const { client, cache } = makeClient(fetchImpl)
    const result = await client.getObjectAttributes('people')
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 'attr_email',
          slug: 'email_addresses',
          title: 'Email',
          type: 'email-address',
          isArchived: false,
          isSystem: false,
          isWritable: true,
        },
      ],
    })
    expect(cache.getAttributes('people')).toBeDefined()
    expect(cache.getAttributes('companies')).toBeUndefined()
  })

  it('encodes the slug into the URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [] }))
    const { client } = makeClient(fetchImpl)
    await client.getObjectAttributes('odd slug')
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.attio.test/v2/objects/odd%20slug/attributes')
  })

  it('skips fetch on cache hit for the same slug', async () => {
    const fetchImpl = vi.fn()
    const { client, cache } = makeClient(fetchImpl)
    cache.setAttributes('people', [
      { id: 'pre', slug: 'x', title: 'X', type: 'text', isArchived: false, isSystem: false, isWritable: true },
    ])
    const result = await client.getObjectAttributes('people')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// listTasks — filter → query-string + cache by filter hash
// ---------------------------------------------------------------------------

describe('AttioClient.listTasks', () => {
  it('builds the query string from the filter', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [] }))
    const { client } = makeClient(fetchImpl)
    await client.listTasks({ assigneeWorkspaceMemberId: 'mem_xyz', isCompleted: false })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.attio.test/v2/tasks?assignee=mem_xyz&is_completed=false')
  })

  it('hits /v2/tasks with no query string when filter is empty', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [] }))
    const { client } = makeClient(fetchImpl)
    await client.listTasks()
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.attio.test/v2/tasks')
  })

  it('parses tasks into camelCase shape on cache miss', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, TASKS_WIRE))
    const { client } = makeClient(fetchImpl)
    const result = await client.listTasks({ isCompleted: false })
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 'task_1',
          content: 'Follow up with Acme',
          deadlineAt: '2026-07-01T12:00:00.000Z',
          isCompleted: false,
          assigneeIds: ['mem_xyz'],
          linkedRecords: [{ targetObject: 'companies', targetRecordId: 'comp_acme' }],
          createdAt: '2026-06-01T08:00:00.000Z',
        },
      ],
    })
  })

  it('uses different cache keys for different filters', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ ...TASKS_WIRE.data[0], id: { task_id: 'A' } }] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ ...TASKS_WIRE.data[0], id: { task_id: 'B' } }] }))
    const { client } = makeClient(fetchImpl)
    const a = await client.listTasks({ isCompleted: false })
    const b = await client.listTasks({ isCompleted: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(a).toMatchObject({ ok: true, data: [{ id: 'A' }] })
    expect(b).toMatchObject({ ok: true, data: [{ id: 'B' }] })
  })

  it('skips fetch on cache hit for the same filter', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, TASKS_WIRE))
    const { client } = makeClient(fetchImpl)
    await client.listTasks({ isCompleted: false })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await client.listTasks({ isCompleted: false })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// queryRecords — POST + body + per-(slug, body) cache
// ---------------------------------------------------------------------------

describe('AttioClient.queryRecords', () => {
  it('POSTs the body to /v2/objects/{slug}/records/query', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, RECORDS_WIRE))
    const { client } = makeClient(fetchImpl)
    await client.queryRecords('people', { filter: { name: 'jane' } })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.attio.test/v2/objects/people/records/query')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBe(JSON.stringify({ filter: { name: 'jane' } }))
  })

  it('returns records in camelCase shape', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, RECORDS_WIRE))
    const { client } = makeClient(fetchImpl)
    const result = await client.queryRecords('people', {})
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 'rec_jane',
          webUrl: 'https://app.attio.com/x/people/rec_jane',
          values: { name: 'Jane Doe' },
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    })
  })

  it('skips fetch on cache hit for identical (slug, body)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, RECORDS_WIRE))
    const { client } = makeClient(fetchImpl)
    await client.queryRecords('people', { filter: { name: 'jane' } })
    await client.queryRecords('people', { filter: { name: 'jane' } })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('uses different cache keys for the same slug with different bodies', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, RECORDS_WIRE))
    const { client } = makeClient(fetchImpl)
    await client.queryRecords('people', { filter: { name: 'jane' } })
    await client.queryRecords('people', { filter: { name: 'john' } })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('produces stable cache keys regardless of object-key insertion order', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, RECORDS_WIRE))
    const { client } = makeClient(fetchImpl)
    await client.queryRecords('people', { a: 1, b: 2 })
    await client.queryRecords('people', { b: 2, a: 1 })
    // Same content → cache hit on the second call.
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
