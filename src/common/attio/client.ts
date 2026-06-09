/**
 * AttioClient — Story 1.7 read paths.
 *
 * - Public `request(method, path, body?)` returns raw response data; the
 *   `IdentityProber` contract from Story 1.6 consumes this directly.
 * - Typed wrappers (`getSelf`, `listObjects`, `getObjectAttributes`,
 *   `listTasks`, `queryRecords`) parse the response with a zod schema,
 *   integrate the cache layer, and return `Result<T, WorkflowError>`.
 * - NFR-005 retry: one retry on HTTP 429 (sleep per `Retry-After`) and
 *   on HTTP 5xx / socket failure (sleep `RETRY_INITIAL_DELAY_MS`). A
 *   second failure surfaces as `rate-limit` or `unreachable`.
 * - FR-051 status mapping: 401/403/404/422 → corresponding WorkflowError
 *   kinds; zod parse failures → `validation` WITHOUT httpStatus.
 *
 * This is the ONLY file in the project allowed to import the global
 * `fetch` — see `eslint.config.mjs` boundary rules.
 */
import { createHash } from 'node:crypto'
import type { z } from 'zod'
import type { Cache } from '../cache'
import { API_BASE_URL, RETRY_INITIAL_DELAY_MS, RETRY_MAX_DELAY_MS } from '../constants'
import { type Result, type WorkflowError, err, ok } from '../error'
import { type Identity, IdentitySchema } from './identity'
import {
  type AttributeDef,
  AttributeDefSchema,
  type ObjectInfo,
  ObjectInfoSchema,
  type RecordItem,
  RecordSchema,
  type Task,
  TaskSchema,
  listResponseSchema,
} from './schemas'

// ---------------------------------------------------------------------------
// Types + options
// ---------------------------------------------------------------------------

export interface AttioClientOptions {
  accessToken: string
  cache: Cache
  /** Override the API base URL (for testing). */
  baseUrl?: string
  /** Override fetch (for testing). Defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch
  /** Override sleep (for testing retry path). Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>
}

export interface TaskFilter {
  assigneeWorkspaceMemberId?: string
  isCompleted?: boolean
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_SLEEP = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function hashFilter(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16)
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 1
  const seconds = Number.parseInt(header, 10)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 1
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function extractAttioMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
  }
  return 'Validation failed'
}

function zodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
}

function parseWith<T extends z.ZodTypeAny>(schema: T, data: unknown): Result<z.infer<T>, WorkflowError> {
  const parsed = schema.safeParse(data)
  if (parsed.success) return ok(parsed.data)
  return err<WorkflowError>({ kind: 'validation', attioMessage: zodIssues(parsed.error) })
}

function parseListWith<T extends z.ZodTypeAny>(itemSchema: T, data: unknown): Result<z.infer<T>[], WorkflowError> {
  const envelope = listResponseSchema(itemSchema).safeParse(data)
  if (envelope.success) return ok(envelope.data.data)
  return err<WorkflowError>({ kind: 'validation', attioMessage: zodIssues(envelope.error) })
}

// ---------------------------------------------------------------------------
// AttioClient
// ---------------------------------------------------------------------------

export class AttioClient {
  private readonly accessToken: string
  private readonly cache: Cache
  private readonly baseUrl: string
  private readonly fetchImpl: typeof globalThis.fetch
  private readonly sleep: (ms: number) => Promise<void>

  constructor(opts: AttioClientOptions) {
    this.accessToken = opts.accessToken
    this.cache = opts.cache
    this.baseUrl = opts.baseUrl ?? API_BASE_URL
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis)
    this.sleep = opts.sleep ?? DEFAULT_SLEEP
  }

  /**
   * Public raw request — used by typed wrappers below and by auth.ts's
   * IdentityProber wiring (Story 1.10 keyword scripts).
   *
   * Retries once on 429 (with `Retry-After`-based backoff) and on 5xx /
   * socket failure (with `RETRY_INITIAL_DELAY_MS` backoff). Maps status
   * codes to FR-051 `WorkflowError` kinds.
   */
  async request(method: string, path: string, body?: unknown): Promise<Result<unknown, WorkflowError>> {
    const url = `${this.baseUrl}${path}`
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response
      try {
        response = await this.fetchImpl(url, init)
      } catch {
        if (attempt === 0) {
          await this.sleep(RETRY_INITIAL_DELAY_MS)
          continue
        }
        return err<WorkflowError>({ kind: 'unreachable', cause: 'socket' })
      }

      if (response.status === 429) {
        if (attempt === 0) {
          const retryAfterSeconds = parseRetryAfter(response.headers.get('Retry-After'))
          await this.sleep(Math.min(retryAfterSeconds * 1000, RETRY_MAX_DELAY_MS))
          continue
        }
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'))
        return err<WorkflowError>({ kind: 'rate-limit', httpStatus: 429, retryAfter })
      }

      if (response.status >= 500) {
        if (attempt === 0) {
          await this.sleep(RETRY_INITIAL_DELAY_MS)
          continue
        }
        return err<WorkflowError>({ kind: 'unreachable', cause: 'http-5xx' })
      }

      if (response.ok) {
        return ok(await safeJson(response))
      }

      if (response.status === 401) return err<WorkflowError>({ kind: 'auth-invalid', httpStatus: 401 })
      if (response.status === 403) return err<WorkflowError>({ kind: 'auth-scope-missing', httpStatus: 403 })
      if (response.status === 404) {
        return err<WorkflowError>({ kind: 'record-not-found', httpStatus: 404, slug: '', id: '' })
      }
      if (response.status === 422) {
        const data = await safeJson(response)
        return err<WorkflowError>({
          kind: 'validation',
          httpStatus: 422,
          attioMessage: extractAttioMessage(data),
        })
      }

      return err<WorkflowError>({ kind: 'unknown', httpStatus: response.status })
    }

    return err<WorkflowError>({ kind: 'unknown' })
  }

  // -------------------------------------------------------------------------
  // Typed read methods
  // -------------------------------------------------------------------------

  async getSelf(): Promise<Result<Identity, WorkflowError>> {
    const raw = await this.request('GET', '/v2/self')
    if (!raw.ok) return raw
    return parseWith(IdentitySchema, raw.data)
  }

  async listObjects(): Promise<Result<ObjectInfo[], WorkflowError>> {
    const cached = this.cache.getObjects<ObjectInfo[]>()
    if (cached) return ok(cached)

    const raw = await this.request('GET', '/v2/objects')
    if (!raw.ok) return raw
    const parsed = parseListWith(ObjectInfoSchema, raw.data)
    if (parsed.ok) this.cache.setObjects(parsed.data)
    return parsed
  }

  async getObjectAttributes(slug: string): Promise<Result<AttributeDef[], WorkflowError>> {
    const cached = this.cache.getAttributes<AttributeDef[]>(slug)
    if (cached) return ok(cached)

    const raw = await this.request('GET', `/v2/objects/${encodeURIComponent(slug)}/attributes`)
    if (!raw.ok) return raw
    const parsed = parseListWith(AttributeDefSchema, raw.data)
    if (parsed.ok) this.cache.setAttributes(slug, parsed.data)
    return parsed
  }

  async listTasks(filter: TaskFilter = {}): Promise<Result<Task[], WorkflowError>> {
    const queryHash = hashFilter(filter)
    const cached = this.cache.getList<Task>('tasks', queryHash)
    if (cached) return ok(cached)

    const search = new URLSearchParams()
    if (filter.assigneeWorkspaceMemberId) search.set('assignee', filter.assigneeWorkspaceMemberId)
    if (filter.isCompleted !== undefined) search.set('is_completed', String(filter.isCompleted))
    const qs = search.toString()
    const path = qs ? `/v2/tasks?${qs}` : '/v2/tasks'

    const raw = await this.request('GET', path)
    if (!raw.ok) return raw
    const parsed = parseListWith(TaskSchema, raw.data)
    if (parsed.ok) this.cache.setList('tasks', queryHash, parsed.data)
    return parsed
  }

  /**
   * Fetches a single record by `(slug, id)`. Story 1.10 needs this for
   * linked-record name resolution in the `todo` keyword; future stories
   * (Quick Look, edit-action drill-down) consume it as well.
   *
   * On 404 the WorkflowError is enriched with the caller's `slug`/`id`
   * — the internal `request` returns empty strings, but `getRecord`
   * knows the context.
   */
  async getRecord(slug: string, id: string): Promise<Result<RecordItem, WorkflowError>> {
    const cached = this.cache.getRecord<RecordItem>(slug, id)
    if (cached) return ok(cached)

    const raw = await this.request('GET', `/v2/objects/${encodeURIComponent(slug)}/records/${encodeURIComponent(id)}`)
    if (!raw.ok) {
      if (raw.error.kind === 'record-not-found') {
        return err<WorkflowError>({ kind: 'record-not-found', httpStatus: 404, slug, id })
      }
      return raw
    }
    // GET /v2/objects/{slug}/records/{id} returns `{ data: Record }`.
    const envelope = raw.data as { data?: unknown } | null
    const parsed = parseWith(RecordSchema, envelope?.data)
    if (parsed.ok) this.cache.setRecord(slug, id, parsed.data)
    return parsed
  }

  async queryRecords(slug: string, body: unknown): Promise<Result<RecordItem[], WorkflowError>> {
    const queryHash = hashFilter({ slug, body })
    const cached = this.cache.getList<RecordItem>(slug, queryHash)
    if (cached) return ok(cached)

    const raw = await this.request('POST', `/v2/objects/${encodeURIComponent(slug)}/records/query`, body)
    if (!raw.ok) return raw
    const parsed = parseListWith(RecordSchema, raw.data)
    if (parsed.ok) this.cache.setList(slug, queryHash, parsed.data)
    return parsed
  }
}
