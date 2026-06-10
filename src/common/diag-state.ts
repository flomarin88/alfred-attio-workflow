/**
 * Diagnostic state persistence for Story 1.8 — the "last error" entry
 * surfaced by `attio:diag` row 5.
 *
 * Two responsibilities:
 *   1. Strip record IDs from endpoint paths before persistence (UUID v4
 *      pattern → `<redacted>`). The diag row must be safely pastable into
 *      a public GitHub issue — see EXPERIENCE.md §`attio:diag` and
 *      UX-DR9 (privacy floor).
 *   2. Read / write the persisted entry against any `ConfigStore`
 *      (typically `alfredClient.config`). The stored shape is loosely
 *      validated on read so a corrupt or stale entry surfaces as
 *      "no last error" rather than crashing the diag keyword.
 *
 * Boundary: this module does not touch the cache or the API client. It
 * is a thin store wrapper consumed by keyword scripts on error and by
 * the diag builder on render.
 */
import type { ConfigStore } from './attio/identity'

const KEY = 'diag.lastError'
const LIFECYCLE_KEY = 'diag.lifecycleWarnings'
const REDACTED = '<redacted>'
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * Objects covered by FR-033 lifecycle config. Tasks are intentionally
 * excluded — `is_completed` already serves as their lifecycle marker.
 */
export type LifecycleObject = 'person' | 'company' | 'deal'

export interface DiagLifecycleWarnings {
  person?: string
  company?: string
  deal?: string
}

export interface DiagLastError {
  /** ISO-8601 UTC timestamp captured when the error was recorded. */
  iso: string
  /** HTTP status code, when applicable. Absent for socket-level failures. */
  httpStatus?: number
  /**
   * Endpoint pattern with record IDs replaced by `<redacted>`. Example:
   * `PATCH /v2/objects/people/records/<redacted>`.
   */
  endpointPattern: string
}

export interface RecordErrorInput {
  /** Raw endpoint path; IDs will be redacted by `recordLastError`. */
  endpoint: string
  httpStatus?: number
}

/**
 * Replaces every UUID-v4-shaped substring with `<redacted>`. Workspace
 * slugs (kebab-case) and Attio short-form IDs are not affected — only
 * the dashed UUID format used for record/task/attribute identifiers.
 */
export function redactRecordIds(endpoint: string): string {
  return endpoint.replace(UUID_RE, REDACTED)
}

/**
 * Persists the latest error for `attio:diag` consumption. The endpoint
 * is redacted before storage so even a corrupt read surfaces the safe
 * shape.
 */
export function recordLastError(
  config: ConfigStore,
  input: RecordErrorInput,
  now: () => Date = () => new Date(),
): void {
  const entry: DiagLastError = {
    iso: now().toISOString(),
    endpointPattern: redactRecordIds(input.endpoint),
    ...(input.httpStatus !== undefined ? { httpStatus: input.httpStatus } : {}),
  }
  config.set(KEY, entry)
}

/**
 * Returns the persisted last error, or `undefined` if the entry is
 * missing or malformed. Defensive parsing: an unexpected shape never
 * crashes the diag keyword.
 */
export function readLastError(config: ConfigStore): DiagLastError | undefined {
  const raw = config.get(KEY)
  if (raw === null || typeof raw !== 'object') return undefined
  const obj = raw as Partial<DiagLastError>
  if (typeof obj.iso !== 'string' || typeof obj.endpointPattern !== 'string') return undefined
  return {
    iso: obj.iso,
    endpointPattern: obj.endpointPattern,
    ...(typeof obj.httpStatus === 'number' ? { httpStatus: obj.httpStatus } : {}),
  }
}

/** Removes the persisted last error. Used by `attio:refresh` (Story 1.9). */
export function clearLastError(config: ConfigStore): void {
  config.delete(KEY)
}

/**
 * Convenience wrapper used by keyword scripts on error paths. Extracts
 * `httpStatus` from a WorkflowError-like object (any variant that
 * carries one) and persists the last-error record. Logs nothing — the
 * caller is in charge of sending a free-form line to `alfredClient.log`
 * when extra detail is useful.
 */
export function persistWorkflowError(
  config: ConfigStore,
  endpoint: string,
  error: { kind: string; httpStatus?: number; cause?: string } & Record<string, unknown>,
): void {
  const httpStatus = typeof error.httpStatus === 'number' ? error.httpStatus : undefined
  recordLastError(config, { endpoint, httpStatus })
}

/**
 * Persists a "lifecycle slug not found in schema" warning for the given
 * object. Called by `person`/`company`/`deal` keyword scripts when the
 * configured `LIFECYCLE_ATTRIBUTE_*` env var doesn't match any attribute
 * in the workspace schema (FR-033 / Story 2.5). Idempotent: writing the
 * same slug twice does not duplicate state.
 */
export function recordLifecycleMissingSlug(config: ConfigStore, object: LifecycleObject, slug: string): void {
  const current = readLifecycleWarnings(config) ?? {}
  if (current[object] === slug) return
  current[object] = slug
  config.set(LIFECYCLE_KEY, current)
}

/**
 * Clears any persisted lifecycle warning for the given object. Called
 * when the configured slug now resolves (recovery path), or when the
 * env var has been cleared.
 */
export function clearLifecycleMissingSlug(config: ConfigStore, object: LifecycleObject): void {
  const current = readLifecycleWarnings(config)
  if (!current || current[object] === undefined) return
  delete current[object]
  if (Object.keys(current).length === 0) {
    config.delete(LIFECYCLE_KEY)
  } else {
    config.set(LIFECYCLE_KEY, current)
  }
}

/**
 * Returns the persisted lifecycle warnings, or `undefined` when none.
 * Defensive parsing: unexpected shapes resolve to `undefined`.
 */
export function readLifecycleWarnings(config: ConfigStore): DiagLifecycleWarnings | undefined {
  const raw = config.get(LIFECYCLE_KEY)
  if (raw === null || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const out: DiagLifecycleWarnings = {}
  if (typeof obj.person === 'string' && obj.person.length > 0) out.person = obj.person
  if (typeof obj.company === 'string' && obj.company.length > 0) out.company = obj.company
  if (typeof obj.deal === 'string' && obj.deal.length > 0) out.deal = obj.deal
  return Object.keys(out).length > 0 ? out : undefined
}
