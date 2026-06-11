/**
 * Story 4.3 — `multiLinePrompt` unit tests.
 *
 * Coverage:
 *   - Spawns `osascript -l JavaScript {script} {recordName} {promptText}`
 *   - Exit 0 + non-empty stdout → `{ accepted: true, content }`
 *   - Exit 1 (Cancel) → `{ accepted: false, content: '' }`
 *   - Exit 0 + empty stdout → `{ accepted: false, content: '' }`
 *   - Spawn error → `{ accepted: false }` (never throws)
 *   - Builds the script path from `bundleDir` (trailing slash safe)
 */
import { describe, expect, it, vi } from 'vitest'
import { type SpawnFn, multiLinePrompt } from '../../src/common/prompt'

function fakeSpawn(result: { exitCode: number | null; stdout: string }): {
  spawn: SpawnFn
  calls: Array<{ command: string; args: string[] }>
} {
  const calls: Array<{ command: string; args: string[] }> = []
  const spawn: SpawnFn = vi.fn().mockImplementation(async (command: string, args: string[]) => {
    calls.push({ command, args })
    return result
  })
  return { spawn, calls }
}

describe('multiLinePrompt — happy path', () => {
  it('returns accepted=true with the captured content on exit 0', async () => {
    const { spawn } = fakeSpawn({ exitCode: 0, stdout: 'first line\nsecond line' })
    const result = await multiLinePrompt(
      { recordName: 'Jane Doe', promptText: 'Add a note linked to Jane Doe', bundleDir: '/bundle' },
      { spawn },
    )
    expect(result).toEqual({ accepted: true, content: 'first line\nsecond line' })
  })

  it('invokes osascript with -l JavaScript + script path + recordName + promptText args', async () => {
    const { spawn, calls } = fakeSpawn({ exitCode: 0, stdout: 'x' })
    await multiLinePrompt({ recordName: 'Acme Inc.', promptText: 'Prompt text', bundleDir: '/Users/me/wf' }, { spawn })
    expect(calls).toHaveLength(1)
    expect(calls[0].command).toBe('osascript')
    expect(calls[0].args).toEqual([
      '-l',
      'JavaScript',
      '/Users/me/wf/assets/scripts/note-prompt.js',
      'Acme Inc.',
      'Prompt text',
    ])
  })

  it('strips trailing slash from bundleDir when building the script path', async () => {
    const { spawn, calls } = fakeSpawn({ exitCode: 0, stdout: 'x' })
    await multiLinePrompt({ recordName: 'X', promptText: 'P', bundleDir: '/bundle/' }, { spawn })
    expect(calls[0].args[2]).toBe('/bundle/assets/scripts/note-prompt.js')
  })
})

describe('multiLinePrompt — cancel path (AC: osascript exit code)', () => {
  it('returns accepted=false with empty content on exit 1', async () => {
    const { spawn } = fakeSpawn({ exitCode: 1, stdout: '' })
    const result = await multiLinePrompt({ recordName: 'Jane', promptText: 'P', bundleDir: '/x' }, { spawn })
    expect(result).toEqual({ accepted: false, content: '' })
  })

  it('returns accepted=false on non-zero exit even if stdout is non-empty (defensive)', async () => {
    const { spawn } = fakeSpawn({ exitCode: 2, stdout: 'leftover' })
    const result = await multiLinePrompt({ recordName: 'Jane', promptText: 'P', bundleDir: '/x' }, { spawn })
    expect(result.accepted).toBe(false)
  })

  it('returns accepted=false when exit code is 0 but stdout is empty', async () => {
    const { spawn } = fakeSpawn({ exitCode: 0, stdout: '' })
    const result = await multiLinePrompt({ recordName: 'Jane', promptText: 'P', bundleDir: '/x' }, { spawn })
    expect(result).toEqual({ accepted: false, content: '' })
  })
})

describe('multiLinePrompt — spawn failure (never throws)', () => {
  it('returns accepted=false when spawn rejects', async () => {
    const spawn: SpawnFn = vi.fn().mockRejectedValue(new Error('ENOENT'))
    const result = await multiLinePrompt({ recordName: 'Jane', promptText: 'P', bundleDir: '/x' }, { spawn })
    expect(result).toEqual({ accepted: false, content: '' })
  })

  it('returns accepted=false on synchronous spawn throw', async () => {
    const spawn: SpawnFn = vi.fn().mockImplementation(() => {
      throw new Error('sync')
    })
    const result = await multiLinePrompt({ recordName: 'Jane', promptText: 'P', bundleDir: '/x' }, { spawn })
    expect(result.accepted).toBe(false)
  })
})
