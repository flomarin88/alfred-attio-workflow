/**
 * Shared error model and `Result<T, E>` wrapper.
 *
 * Story 1.2 — Architecture §Core Architectural Decisions / §Implementation
 * Patterns. Every async call site that can fail returns a `Result` instead
 * of throwing. Throwing is reserved for programmer errors (zod validation
 * failure, type contract breach), not for control flow.
 *
 * `errorRow(error)` builds the Alfred row used to surface an error to the
 * user. Title and subtitle reference the FR-051 microcopy key family
 * (`errors.{kind}`); the actual EN/FR resolution lives in `strings.ts`
 * (Story 1.4) and is applied at output time.
 */
import type { IconKey } from './constants'

// ---------------------------------------------------------------------------
// Result<T, E>
// ---------------------------------------------------------------------------

export type Result<T, E = WorkflowError> = { ok: true; data: T } | { ok: false; error: E }

/** Constructs a successful Result. */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data }
}

/** Constructs a failed Result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/** Type guard for the success branch. */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T } {
  return result.ok
}

/** Type guard for the failure branch. */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}

// ---------------------------------------------------------------------------
// WorkflowError — the seven `kind` variants from Architecture
// ---------------------------------------------------------------------------

export type WorkflowError =
  | { kind: 'auth-invalid'; httpStatus: 401 }
  | { kind: 'auth-scope-missing'; httpStatus: 403; fieldSlug?: string }
  | { kind: 'record-not-found'; httpStatus: 404; slug: string; id: string }
  | { kind: 'validation'; httpStatus?: 422; attioMessage: string; fieldSlug?: string }
  | { kind: 'rate-limit'; httpStatus: 429; retryAfter: number }
  | { kind: 'unreachable'; cause?: 'socket' | 'http-5xx' }
  | { kind: 'unknown'; httpStatus?: number; raw?: string }

export type WorkflowErrorKind = WorkflowError['kind']

// ---------------------------------------------------------------------------
// FR-051 microcopy key derivation
// ---------------------------------------------------------------------------

/**
 * Returns the title microcopy key for the given error kind. Keys follow
 * the dot-notation convention from Architecture §Naming Patterns and are
 * resolved against `src/strings/{en,fr}.json` in Story 1.4.
 */
export function titleKeyFor(error: WorkflowError): string {
  return `errors.${error.kind}.title`
}

/**
 * Returns the subtitle microcopy key for the given error kind. The
 * subtitle conventionally hints at remediation (per the EXPERIENCE.md
 * microcopy catalog).
 */
export function subtitleKeyFor(error: WorkflowError): string {
  return `errors.${error.kind}.subtitle`
}

/**
 * Extracts placeholder substitutions for the microcopy keys. Story 1.4's
 * `strings.t(key, params)` consumes the returned record.
 *
 * Variant-specific fields that are NOT safe to surface verbatim (e.g. the
 * `unknown` kind's `raw` HTTP body) are deliberately excluded — see the
 * NFR-009/NFR-010 privacy floor.
 */
export function errorParams(error: WorkflowError): Record<string, string | number> {
  switch (error.kind) {
    case 'auth-invalid':
      return {}
    case 'auth-scope-missing':
      return error.fieldSlug ? { fieldSlug: error.fieldSlug } : {}
    case 'record-not-found':
      return { slug: error.slug, id: error.id }
    case 'validation':
      // FR-051: 422 messages are surfaced verbatim (translating loses precision).
      return error.fieldSlug
        ? { attioMessage: error.attioMessage, fieldSlug: error.fieldSlug }
        : { attioMessage: error.attioMessage }
    case 'rate-limit':
      return { retryAfter: error.retryAfter }
    case 'unreachable':
      return {}
    case 'unknown':
      // `raw` and `httpStatus` are deliberately omitted from user-visible
      // params — they go to alfredClient.log for support, not to the row.
      return {}
  }
}

// ---------------------------------------------------------------------------
// errorRow — Alfred row spec for a single-row error
// ---------------------------------------------------------------------------

/**
 * The shape of an Alfred ScriptFilter list item, narrowed to what
 * `errorRow` produces. We avoid importing fast-alfred's full type here so
 * the error module stays runtime-agnostic and testable in isolation.
 *
 * Story 1.5's `row()` builder will reconcile this with the canonical
 * `AlfredListItem` from fast-alfred and inject the icon path resolution.
 */
export interface ErrorRowSpec {
  uid: string
  /** Microcopy key — resolved via `strings.t` at output time (Story 1.4). */
  title: string
  /** Microcopy key — resolved via `strings.t` at output time (Story 1.4). */
  subtitle: string
  /** Placeholder substitutions for `title` / `subtitle`. */
  params: Record<string, string | number>
  /** Icon-registry key. Resolved to a PNG path in Story 1.5. */
  icon: IconKey
  /** Errors are never selectable from Alfred. */
  valid: false
  /** Empty arg — no downstream action. */
  arg: ''
}

/**
 * Builds an Alfred row for a workflow error. Title and subtitle are the
 * FR-051 microcopy keys; the caller (Story 1.4 onward) post-processes with
 * `strings.t(key, params)` before passing to `alfredClient.output`.
 *
 * No raw HTTP bodies, no PAT bytes, and no `error.raw` field leak through
 * this function — per NFR-009 and NFR-010.
 */
export function errorRow(error: WorkflowError): ErrorRowSpec {
  return {
    uid: `error-${error.kind}`,
    title: titleKeyFor(error),
    subtitle: subtitleKeyFor(error),
    params: errorParams(error),
    icon: iconForKind(error.kind),
    valid: false,
    arg: '',
  }
}

/** Maps an error kind to the row's leading icon. */
function iconForKind(kind: WorkflowErrorKind): IconKey {
  switch (kind) {
    case 'auth-invalid':
    case 'auth-scope-missing':
    case 'record-not-found':
    case 'validation':
    case 'unknown':
      return 'error'
    case 'rate-limit':
    case 'unreachable':
      return 'warning'
  }
}
