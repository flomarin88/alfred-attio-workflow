/**
 * Story 1.5 unit tests for `src/common/notify.ts`.
 *
 * Coverage targets:
 *   - `success` / `error` / `info` all invoke `osascript -e 'display notification ...'`
 *   - The notification title is the workflow name; the body is the message
 *   - AppleScript string-literal quoting escapes backslashes and double-quotes
 *   - Synchronous spawn failure returns Result.err with `kind: 'unknown'`
 *   - Asynchronous spawn errors are swallowed (no rejection / throw)
 *   - The returned Result.ok value satisfies `Result<void, WorkflowError>`
 */
import { describe, expect, it, vi } from 'vitest'
import { type SpawnFn, createNotify, quoteAppleScript } from '../../src/common/notify'

/**
 * Stub ChildProcess that exposes the minimal `on` surface we depend on.
 * The cast suppresses the structural mismatch with the real
 * `node:child_process.ChildProcess`.
 */
function fakeChild(): { on: ReturnType<typeof vi.fn> } {
  return { on: vi.fn() }
}

describe('quoteAppleScript', () => {
  it('wraps the value in double quotes', () => {
    expect(quoteAppleScript('Hello')).toBe('"Hello"')
  })

  it('escapes embedded double quotes', () => {
    expect(quoteAppleScript('He said "hi"')).toBe('"He said \\"hi\\""')
  })

  it('escapes backslashes', () => {
    expect(quoteAppleScript('a\\b')).toBe('"a\\\\b"')
  })

  it('handles empty strings', () => {
    expect(quoteAppleScript('')).toBe('""')
  })
})

describe('createNotify — happy path', () => {
  it('spawns osascript with the right script for success()', () => {
    const spawn = vi.fn(() => fakeChild() as never) as unknown as SpawnFn
    const notify = createNotify({ workflowName: 'Alfred Attio', spawn })

    const result = notify.success('Connected to Studio')
    expect(result).toEqual({ ok: true, data: undefined })

    expect(spawn).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenCalledWith(
      'osascript',
      ['-e', 'display notification "Connected to Studio" with title "Alfred Attio"'],
      expect.objectContaining({ stdio: 'ignore', detached: false }),
    )
  })

  it('uses the configured workflow name as the AppleScript title', () => {
    const spawn = vi.fn(() => fakeChild() as never) as unknown as SpawnFn
    const notify = createNotify({ workflowName: 'My Custom Workflow', spawn })

    notify.error('Token invalid')

    const callArgs = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(callArgs[1][1]).toContain('with title "My Custom Workflow"')
    expect(callArgs[1][1]).toContain('display notification "Token invalid"')
  })

  it('falls back to the default workflow name when none is provided', () => {
    const spawn = vi.fn(() => fakeChild() as never) as unknown as SpawnFn
    const notify = createNotify({ spawn })

    notify.info('Cache cleared')
    const callArgs = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(callArgs[1][1]).toContain('with title "Alfred Attio"')
  })

  it('all three semantic methods invoke osascript', () => {
    const spawn = vi.fn(() => fakeChild() as never) as unknown as SpawnFn
    const notify = createNotify({ spawn })

    notify.success('a')
    notify.error('b')
    notify.info('c')

    expect(spawn).toHaveBeenCalledTimes(3)
  })

  it('escapes user-controlled messages — no command injection possible', () => {
    const spawn = vi.fn(() => fakeChild() as never) as unknown as SpawnFn
    const notify = createNotify({ spawn })

    // Message contains characters that would be dangerous if not escaped.
    notify.success('Title with " quote and \\ backslash')

    const callArgs = (spawn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const script = callArgs[1][1]
    // Script must contain the escaped form, not the literal sequence.
    expect(script).toContain('Title with \\" quote and \\\\ backslash')
  })

  it('attaches an async error handler to swallow post-spawn failures', () => {
    const child = fakeChild()
    const spawn = vi.fn(() => child as never) as unknown as SpawnFn
    const notify = createNotify({ spawn })

    notify.success('hello')

    // The implementation must register at least one `error` listener.
    expect(child.on).toHaveBeenCalledWith('error', expect.any(Function))

    // Simulating an async error invokes the listener — the test verifies
    // it does NOT throw (swallowed) by simply calling the registered fn.
    const errorListener = child.on.mock.calls.find((c) => c[0] === 'error')?.[1] as (e: unknown) => void
    expect(errorListener).toBeDefined()
    expect(() => errorListener(new Error('osascript not found'))).not.toThrow()
  })
})

describe('createNotify — failure paths', () => {
  it('returns err({ kind: "unknown" }) when spawn throws synchronously', () => {
    const spawn = vi.fn(() => {
      throw new Error('EACCES')
    }) as unknown as SpawnFn
    const notify = createNotify({ spawn })

    const result = notify.success('x')

    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: 'unknown',
        raw: expect.stringContaining('EACCES'),
      },
    })
  })

  it('does not leak the raw spawn error message into anything user-visible', () => {
    // The Result returned to the caller is structural; the caller is
    // responsible for FR-051 microcopy resolution. notify itself does
    // not render anything; this test asserts that fact (no console.log,
    // no print).
    const spawn = vi.fn(() => {
      throw new Error('sensitive system path /Users/x/Library')
    }) as unknown as SpawnFn
    const notify = createNotify({ spawn })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    notify.success('x')
    expect(consoleSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
