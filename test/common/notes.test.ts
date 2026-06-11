/**
 * Story 4.2 — `notes.ts` unit tests.
 *
 * Coverage:
 *   - sanitizeSingleLineContent: newlines → space, control chars stripped,
 *     trailing whitespace trimmed (leading preserved)
 *   - sanitizeMultiLineContent: newlines preserved, control chars
 *     stripped, per-line trailing whitespace trimmed, trailing blank
 *     lines dropped
 *   - deriveSingleLineTitle: slice at 80 chars (boundary cases)
 *   - deriveMultiLineTitle: first non-empty line sliced
 *   - buildNoteAddArg: returns JSON when content has substance;
 *     undefined when whitespace-only
 */
import { describe, expect, it } from 'vitest'
import {
  buildNoteAddArg,
  deriveMultiLineTitle,
  deriveSingleLineTitle,
  sanitizeMultiLineContent,
  sanitizeSingleLineContent,
} from '../../src/common/notes'

describe('sanitizeSingleLineContent', () => {
  it('replaces \\n with a single space', () => {
    expect(sanitizeSingleLineContent('line one\nline two')).toBe('line one line two')
  })

  it('replaces \\r\\n (CRLF) with a single space', () => {
    expect(sanitizeSingleLineContent('a\r\nb')).toBe('a b')
  })

  it('strips NUL, ESC, and other C0 control characters', () => {
    const input = 'A\x00B\x1BC\x07D'
    expect(sanitizeSingleLineContent(input)).toBe('ABCD')
  })

  it('preserves leading whitespace (paste-safe)', () => {
    expect(sanitizeSingleLineContent('  - bullet point')).toBe('  - bullet point')
  })

  it('trims trailing spaces and tabs', () => {
    expect(sanitizeSingleLineContent('hello world   ')).toBe('hello world')
    expect(sanitizeSingleLineContent('hello\t')).toBe('hello')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(sanitizeSingleLineContent('   \n   ')).toBe('')
  })

  it('preserves internal multi-space spacing (no collapsing)', () => {
    expect(sanitizeSingleLineContent('a  b   c')).toBe('a  b   c')
  })
})

describe('sanitizeMultiLineContent (Story 4.3 helper)', () => {
  it('preserves embedded newlines', () => {
    expect(sanitizeMultiLineContent('line one\nline two')).toBe('line one\nline two')
  })

  it('strips control characters but keeps newlines', () => {
    expect(sanitizeMultiLineContent('a\x00\nb\x07')).toBe('a\nb')
  })

  it('trims trailing whitespace per line', () => {
    expect(sanitizeMultiLineContent('a   \nb\t')).toBe('a\nb')
  })

  it('drops trailing blank lines', () => {
    expect(sanitizeMultiLineContent('a\nb\n\n\n')).toBe('a\nb')
  })

  it('preserves internal blank lines (paragraph breaks)', () => {
    expect(sanitizeMultiLineContent('para 1\n\npara 2')).toBe('para 1\n\npara 2')
  })
})

describe('deriveSingleLineTitle (Story 4.2 / FR-016)', () => {
  it('returns content unchanged when ≤ 80 chars', () => {
    const input = 'a'.repeat(80)
    expect(deriveSingleLineTitle(input)).toBe(input)
    expect(deriveSingleLineTitle(input)).toHaveLength(80)
  })

  it('truncates content at 80 chars when longer', () => {
    const input = 'a'.repeat(100)
    expect(deriveSingleLineTitle(input)).toHaveLength(80)
  })

  it('boundary at exactly 81 chars truncates the last one', () => {
    const input = 'a'.repeat(80) + 'B'
    expect(deriveSingleLineTitle(input)).toBe('a'.repeat(80))
  })

  it('returns an empty string for empty input', () => {
    expect(deriveSingleLineTitle('')).toBe('')
  })
})

describe('deriveMultiLineTitle (Story 4.3 helper)', () => {
  it('returns the first non-empty line', () => {
    expect(deriveMultiLineTitle('first\nsecond')).toBe('first')
  })

  it('skips leading blank lines', () => {
    expect(deriveMultiLineTitle('\n\n  first\nsecond')).toBe('  first')
  })

  it('truncates at 80 chars', () => {
    const input = 'a'.repeat(100) + '\nsecond'
    expect(deriveMultiLineTitle(input)).toHaveLength(80)
  })

  it('returns empty string when every line is blank', () => {
    expect(deriveMultiLineTitle('\n\n\n')).toBe('')
  })
})

describe('buildNoteAddArg', () => {
  it('returns a JSON payload with slug, id, content, and recordName', () => {
    const arg = buildNoteAddArg({ slug: 'people', id: 'rec_1', content: 'hello', recordName: 'Jane' })
    expect(arg).toBeDefined()
    expect(JSON.parse(arg!)).toEqual({ slug: 'people', id: 'rec_1', content: 'hello', recordName: 'Jane' })
  })

  it('omits recordName when undefined', () => {
    const arg = buildNoteAddArg({ slug: 'companies', id: 'rec_x', content: 'hi' })
    expect(JSON.parse(arg!)).toEqual({ slug: 'companies', id: 'rec_x', content: 'hi' })
  })

  it('omits recordName when empty string', () => {
    const arg = buildNoteAddArg({ slug: 'companies', id: 'rec_x', content: 'hi', recordName: '' })
    expect(JSON.parse(arg!)).toEqual({ slug: 'companies', id: 'rec_x', content: 'hi' })
  })

  it('returns undefined when content is empty', () => {
    expect(buildNoteAddArg({ slug: 'people', id: 'rec_1', content: '' })).toBeUndefined()
  })

  it('returns undefined when content is whitespace-only', () => {
    expect(buildNoteAddArg({ slug: 'people', id: 'rec_1', content: '   \t\n   ' })).toBeUndefined()
  })

  it('preserves the raw (unsanitized) content — worker sanitizes on its end', () => {
    const arg = buildNoteAddArg({ slug: 'people', id: 'rec_1', content: 'line 1\nline 2' })
    expect(JSON.parse(arg!).content).toBe('line 1\nline 2')
  })
})
