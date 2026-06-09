/**
 * Quick Look HTML helpers — Story 1.9 minimal slice + Epic 3 hook.
 *
 * Story 1.9 only needs `scrubHtmlCache(dir)`: `attio:refresh` deletes
 * every `*.html` file under the Alfred workflow cache directory so a
 * stale Quick Look render doesn't survive a forced refresh. Epic 3 will
 * extend this module with the actual HTML render path.
 *
 * Boundary rules: per `eslint.config.mjs`, this file may use
 * `node:fs/promises` (it owns Quick Look cache I/O) but MAY NOT import
 * the API client or encoders, and MAY NOT use `fetch`. Tests inject the
 * `fs` deps so we never touch the real filesystem in unit runs.
 */
import { readdir, unlink } from 'node:fs/promises'

/** Minimal filesystem surface — readdir + unlink. DI'd for testing. */
export interface QuicklookFs {
  readdir(dir: string): Promise<string[]>
  unlink(path: string): Promise<void>
}

const DEFAULT_FS: QuicklookFs = {
  readdir: (dir) => readdir(dir),
  unlink: (path) => unlink(path),
}

/**
 * Deletes every `*.html` entry in `dir` and returns the count of
 * successful unlinks. Best-effort:
 *   - Missing or unreadable directory → returns 0 (refresh keeps going).
 *   - Per-file unlink failure → swallowed; that file is skipped.
 *
 * Pass `fs` to mock `readdir` / `unlink` in tests.
 */
export async function scrubHtmlCache(dir: string, fs: QuicklookFs = DEFAULT_FS): Promise<number> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return 0
  }

  let deleted = 0
  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith('.html')) continue
    try {
      await fs.unlink(`${dir}/${entry}`)
      deleted += 1
    } catch {
      // Per-file failure — leave count as-is and continue.
    }
  }
  return deleted
}
