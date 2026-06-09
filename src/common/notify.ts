/**
 * macOS notification helper — Architecture §Cross-Cutting Concerns:
 * fast-alfred exposes no notification primitive, so we shell out to
 * `osascript -e 'display notification ... with title ...'`. This is the
 * ONLY file in the project that spawns child processes (boundary rule).
 *
 * Story 1.5 — notify is fire-and-forget. Synchronous spawn failures (bad
 * args) return `err({ kind: 'unknown' })`; asynchronous failures from the
 * `osascript` process itself are swallowed via a no-op `error` handler so
 * the keyword script can exit without waiting on the notification.
 *
 * Per FR-051 / FR-005 / FR-016 / FR-017 / FR-025 / FR-043, the title is
 * always the workflow name; the body is the caller's message. Caller is
 * responsible for resolving microcopy through `strings.t(...)` before
 * passing the string in.
 */
import { spawn as defaultSpawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { type Result, type WorkflowError, err, ok } from './error'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal subset of `child_process.spawn` we depend on, so tests can
 * substitute a mock without pulling in `node:child_process`.
 */
export type SpawnFn = (command: string, args: readonly string[], options?: object) => ChildProcess

export interface NotifyOptions {
  /** Workflow name shown as the notification title. */
  workflowName?: string
  /** Spawn implementation — defaults to `node:child_process` `spawn`. */
  spawn?: SpawnFn
}

export interface Notifier {
  success(message: string): Result<void, WorkflowError>
  error(message: string): Result<void, WorkflowError>
  info(message: string): Result<void, WorkflowError>
}

// ---------------------------------------------------------------------------
// AppleScript string-literal escaping
// ---------------------------------------------------------------------------

/**
 * Quotes a value as an AppleScript string literal. Backslashes and
 * double-quotes are escaped; nothing else is interpreted (no template
 * substitution at the AppleScript layer).
 */
export function quoteAppleScript(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// ---------------------------------------------------------------------------
// Internal — build and dispatch the osascript command
// ---------------------------------------------------------------------------

function buildScript(title: string, message: string): string {
  return `display notification ${quoteAppleScript(message)} with title ${quoteAppleScript(title)}`
}

function send(spawn: SpawnFn, title: string, message: string): Result<void, WorkflowError> {
  const script = buildScript(title, message)
  try {
    const child = spawn('osascript', ['-e', script], {
      stdio: 'ignore',
      detached: false,
    })
    // Asynchronous spawn errors (e.g. osascript missing) are swallowed —
    // fire-and-forget. We don't want notification failures to block or
    // delay the keyword script.
    child.on('error', () => {
      /* swallow */
    })
    return ok(undefined)
  } catch (e) {
    return err<WorkflowError>({ kind: 'unknown', raw: String(e) })
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DEFAULT_WORKFLOW_NAME = 'Alfred Attio'

export function createNotify(opts: NotifyOptions = {}): Notifier {
  const spawn = opts.spawn ?? (defaultSpawn as SpawnFn)
  const title = opts.workflowName ?? DEFAULT_WORKFLOW_NAME

  // All three semantic methods share the same dispatch in V1. They exist
  // as separate entry points so callers can express intent at call sites
  // (`notify.error(...)` vs `notify.success(...)`); future stories may
  // differentiate sound or subtitle per kind.
  return {
    success: (message) => send(spawn, title, message),
    error: (message) => send(spawn, title, message),
    info: (message) => send(spawn, title, message),
  }
}
