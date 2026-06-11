/**
 * Multi-line note prompt — Story 4.3.
 *
 * Spawns `osascript -l JavaScript {script} {recordName} {promptText}`
 * where `{script}` is `assets/scripts/note-prompt.js` bundled at the
 * workflow root. The JXA script displays an `NSAlert` with a multi-line
 * `NSTextView` accessoryView; the user's input is captured on OK and
 * returned via stdout (newlines preserved). Cancel exits the child
 * process with code 1 → caller receives `{ accepted: false }`.
 *
 * Boundary: this module is the ONLY place outside `src/common/notify.ts`
 * allowed to spawn a child process. Spawn is dependency-injected so the
 * test suite never actually invokes `osascript`.
 */
import { type SpawnOptions, spawn as nodeSpawn } from 'node:child_process'

export interface MultiLinePromptResult {
  /** True when the user pressed OK and the dialog returned non-empty content. */
  accepted: boolean
  /** Raw multi-line input (unsanitized). Empty when `accepted=false`. */
  content: string
}

export interface MultiLinePromptInput {
  /** Display name interpolated into the alert title (`Add note — {recordName}`). */
  recordName: string
  /** Body copy for the alert (typically `strings.t('notes.multiline-prompt', …)`). */
  promptText: string
  /** Absolute path to the workflow bundle (`process.cwd()` at runtime). */
  bundleDir: string
}

export interface SpawnedResult {
  exitCode: number | null
  stdout: string
}

/**
 * Minimal spawn surface — accepts a command + args + options and
 * resolves once the child closes. DI'd for tests.
 */
export type SpawnFn = (command: string, args: string[], options?: SpawnOptions) => Promise<SpawnedResult>

const DEFAULT_SPAWN: SpawnFn = (command, args, options) =>
  new Promise<SpawnedResult>((resolve, reject) => {
    let stdout = ''
    let child: ReturnType<typeof nodeSpawn>
    try {
      child = nodeSpawn(command, args, options ?? {})
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
      return
    }
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ exitCode: code, stdout })
    })
  })

/**
 * Displays the multi-line note alert and resolves with the user's
 * response. Cancel or empty content → `{ accepted: false, content: '' }`.
 * Never throws (caller always gets a result).
 */
export async function multiLinePrompt(
  input: MultiLinePromptInput,
  opts: { spawn?: SpawnFn } = {},
): Promise<MultiLinePromptResult> {
  const spawnFn = opts.spawn ?? DEFAULT_SPAWN
  const scriptPath = `${input.bundleDir.replace(/\/$/, '')}/assets/scripts/note-prompt.js`
  try {
    const { exitCode, stdout } = await spawnFn('osascript', [
      '-l',
      'JavaScript',
      scriptPath,
      input.recordName,
      input.promptText,
    ])
    if (exitCode !== 0) return { accepted: false, content: '' }
    if (stdout.length === 0) return { accepted: false, content: '' }
    return { accepted: true, content: stdout }
  } catch {
    return { accepted: false, content: '' }
  }
}
