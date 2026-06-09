/**
 * Story 1.9 — `runRefresh` orchestration tests.
 *
 * Coverage targets:
 *   - Happy path: cache wiped, identity cleared then re-saved, objects +
 *     attributes re-fetched, HTML scrubbed, RefreshResult counts match
 *   - getSelf failure short-circuits and forwards the WorkflowError
 *   - listObjects failure short-circuits
 *   - getObjectAttributes failure short-circuits (counts partial)
 *   - htmlCacheDir absent → htmlFilesDeleted = 0 (no scrub attempt)
 *   - cache.clearAll + clearIdentity + clearLastError run BEFORE any fetch
 *   - Order of operations: clear → fetch identity → save identity →
 *     list objects → attributes per object
 */
import { describe, expect, it, vi } from 'vitest'
import type { AttioClient } from '../../src/common/attio/client'
import type { ConfigStore, Identity } from '../../src/common/attio/identity'
import { Cache, type CacheBackend } from '../../src/common/cache'
import { recordLastError } from '../../src/common/diag-state'
import { type Result, type WorkflowError, err, ok } from '../../src/common/error'
import type { QuicklookFs } from '../../src/common/quicklook'
import { runRefresh } from '../../src/common/refresh'

// ---------------------------------------------------------------------------
// Stub backends
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

class MemoryConfig implements ConfigStore {
  readonly store = new Map<string, unknown>()
  get(key: string): unknown {
    return this.store.get(key)
  }
  set(key: string, value: unknown): void {
    this.store.set(key, value)
  }
  delete(key: string): void {
    this.store.delete(key)
  }
}

const IDENTITY: Identity = {
  workspaceId: 'wks_abc',
  workspaceSlug: 'studio',
  workspaceName: 'Studio',
  workspaceMemberId: 'mem_1',
}

const OBJECTS = [
  { id: 'obj_people', slug: 'people', singularNoun: 'Person', pluralNoun: 'People' },
  { id: 'obj_companies', slug: 'companies', singularNoun: 'Company', pluralNoun: 'Companies' },
]

interface StubClient {
  getSelf: ReturnType<typeof vi.fn>
  listObjects: ReturnType<typeof vi.fn>
  getObjectAttributes: ReturnType<typeof vi.fn>
}

function makeClient(overrides: Partial<StubClient> = {}): StubClient {
  return {
    getSelf: vi.fn().mockResolvedValue(ok(IDENTITY)),
    listObjects: vi.fn().mockResolvedValue(ok(OBJECTS)),
    getObjectAttributes: vi.fn().mockResolvedValue(ok([])),
    ...overrides,
  }
}

function asClient(stub: StubClient): AttioClient {
  return stub as unknown as AttioClient
}

function makeFs(entries: string[] = []): QuicklookFs {
  return {
    readdir: vi.fn().mockResolvedValue(entries),
    unlink: vi.fn().mockResolvedValue(undefined),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runRefresh — happy path', () => {
  it('returns RefreshResult with counts on full success', async () => {
    const client = makeClient()
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()
    const fs = makeFs(['cache.html', 'note.txt', 'old.html'])

    const result = await runRefresh({
      client: asClient(client),
      cache,
      config,
      htmlCacheDir: '/tmp/wf',
      fs,
    })

    expect(result).toEqual({
      ok: true,
      data: { objectCount: 2, attributeSetCount: 2, htmlFilesDeleted: 2 },
    })
  })

  it('saves the freshly-fetched identity to the config store', async () => {
    const client = makeClient()
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    await runRefresh({ client: asClient(client), cache, config })

    expect(config.get('identity.workspaceId')).toBe('wks_abc')
    expect(config.get('identity.workspaceName')).toBe('Studio')
  })

  it('re-fetches attributes once per discovered object', async () => {
    const client = makeClient()
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    await runRefresh({ client: asClient(client), cache, config })

    expect(client.getObjectAttributes).toHaveBeenCalledTimes(2)
    expect(client.getObjectAttributes).toHaveBeenNthCalledWith(1, 'people')
    expect(client.getObjectAttributes).toHaveBeenNthCalledWith(2, 'companies')
  })

  it('wipes the cache, identity, and last-error BEFORE any re-fetch', async () => {
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    // Seed pre-existing state.
    cache.setObjects(['stale'])
    config.set('identity.workspaceId', 'OLD')
    config.set('identity.workspaceSlug', 'OLD')
    config.set('identity.workspaceName', 'OLD')
    config.set('identity.workspaceMemberId', 'OLD')
    recordLastError(config, { endpoint: '/v2/x', httpStatus: 500 })

    // Sentinel: when getSelf fires, the OLD state must already be gone.
    const seen = { cacheEmpty: false, identityCleared: false, lastErrorCleared: false }
    const client = makeClient({
      getSelf: vi.fn().mockImplementation(async () => {
        seen.cacheEmpty = cache.getObjects() === undefined
        seen.identityCleared = config.get('identity.workspaceId') === undefined
        seen.lastErrorCleared = config.get('diag.lastError') === undefined
        return ok(IDENTITY)
      }),
    })

    await runRefresh({ client: asClient(client), cache, config })

    expect(seen).toEqual({ cacheEmpty: true, identityCleared: true, lastErrorCleared: true })
  })

  it('skips the HTML scrub when htmlCacheDir is not provided', async () => {
    const client = makeClient()
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    const result = await runRefresh({ client: asClient(client), cache, config })

    expect(result).toMatchObject({ ok: true, data: { htmlFilesDeleted: 0 } })
  })
})

describe('runRefresh — failure paths', () => {
  it('forwards a getSelf error verbatim and does not call listObjects', async () => {
    const transportErr: WorkflowError = { kind: 'auth-invalid', httpStatus: 401 }
    const client = makeClient({
      getSelf: vi.fn().mockResolvedValue(err(transportErr)),
    })
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    const result: Result<unknown, WorkflowError> = await runRefresh({
      client: asClient(client),
      cache,
      config,
    })

    expect(result).toEqual({ ok: false, error: transportErr })
    expect(client.listObjects).not.toHaveBeenCalled()
    expect(client.getObjectAttributes).not.toHaveBeenCalled()
  })

  it('forwards a listObjects error and does not re-fetch attributes', async () => {
    const transportErr: WorkflowError = { kind: 'unreachable', cause: 'socket' }
    const client = makeClient({
      listObjects: vi.fn().mockResolvedValue(err(transportErr)),
    })
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    const result = await runRefresh({ client: asClient(client), cache, config })

    expect(result).toEqual({ ok: false, error: transportErr })
    expect(client.getObjectAttributes).not.toHaveBeenCalled()
  })

  it('forwards the first failing getObjectAttributes error (partial loop)', async () => {
    const transportErr: WorkflowError = { kind: 'rate-limit', httpStatus: 429, retryAfter: 2 }
    const client = makeClient({
      getObjectAttributes: vi
        .fn()
        .mockResolvedValueOnce(ok([])) // people: success
        .mockResolvedValueOnce(err(transportErr)), // companies: fails
    })
    const cache = new Cache(new MemoryBackend())
    const config = new MemoryConfig()

    const result = await runRefresh({ client: asClient(client), cache, config })

    expect(result).toEqual({ ok: false, error: transportErr })
    expect(client.getObjectAttributes).toHaveBeenCalledTimes(2)
  })
})
