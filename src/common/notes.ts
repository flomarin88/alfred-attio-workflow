/**
 * Note content helpers — Story 4.2 (single-line, ⌥⏎) shared with
 * Story 4.3 (multi-line, ⇧⌥⏎ — sanitization differs slightly there).
 *
 * Sanitization contract per FR-016 + Story 4.2 AC:
 *   - Single-line mode collapses newlines (`\r?\n`) to a single space.
 *   - Control characters (NUL, ESC, etc. — anything in the C0 range
 *     except SPACE) are stripped from both modes; user input never
 *     carries them intentionally.
 *   - Trailing whitespace is trimmed; leading whitespace is preserved
 *     because users sometimes paste a list-item that opens with " - ".
 *
 * The title is derived AFTER sanitization so the 80-char window never
 * lands mid-control sequence.
 */

const TITLE_MAX_LEN = 80
// All C0 control chars (0x00–0x1F) and DEL (0x7F), excluding SPACE
// (handled separately) and TAB / LF / CR (handled by the newline pass
// in single-line mode).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

function stripControl(input: string): string {
  return input.replace(CONTROL_CHARS_RE, '')
}

function trimTrailing(input: string): string {
  return input.replace(/[ \t]+$/g, '')
}

/**
 * Sanitizes a single-line note body: newlines → space, control chars
 * stripped, trailing whitespace trimmed. Preserves leading whitespace
 * and internal spacing.
 */
export function sanitizeSingleLineContent(input: string): string {
  return trimTrailing(stripControl(input.replace(/\r?\n/g, ' ')))
}

/**
 * Sanitizes a multi-line note body: newlines preserved, control chars
 * stripped, trailing whitespace per-line trimmed (and the trailing
 * blank lines collapsed away). Multi-line is Story 4.3.
 */
export function sanitizeMultiLineContent(input: string): string {
  const lines = stripControl(input).split(/\r?\n/).map(trimTrailing)
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

/**
 * Derives the note title from already-sanitized SINGLE-LINE content by
 * slicing the first 80 characters. Returns an empty string when content
 * is empty (caller is expected to short-circuit before calling).
 */
export function deriveSingleLineTitle(content: string): string {
  return content.slice(0, TITLE_MAX_LEN)
}

/**
 * Derives the note title from already-sanitized MULTI-LINE content:
 * first non-empty line, sliced to 80 chars. Story 4.3.
 */
export function deriveMultiLineTitle(content: string): string {
  const firstNonEmpty = content.split('\n').find((line) => line.length > 0) ?? ''
  return firstNonEmpty.slice(0, TITLE_MAX_LEN)
}

/**
 * Payload shape consumed by `src/main/note-add.ts`. Each record-bearing
 * row builder packs one of these as the JSON arg behind `mods.alt`.
 * Slug is the Attio object slug (e.g. `people`, `companies`).
 */
export interface NoteAddArg {
  slug: string
  id: string
  /** Raw Alfred query; worker sanitizes per FR-016. */
  content: string
  /** Optional display name for the success notification interpolation. */
  recordName?: string
}

/**
 * Returns the JSON-encoded payload for `mods.alt.arg`, or `undefined`
 * when the content is whitespace-only — the row builder should drop
 * the alt mod entirely in that case so ⌥⏎ has no effect (we won't
 * create a blank note).
 */
export function buildNoteAddArg(input: NoteAddArg): string | undefined {
  if (!input.content.trim()) return undefined
  const payload: NoteAddArg = {
    slug: input.slug,
    id: input.id,
    content: input.content,
    ...(input.recordName !== undefined && input.recordName.length > 0 ? { recordName: input.recordName } : {}),
  }
  return JSON.stringify(payload)
}
