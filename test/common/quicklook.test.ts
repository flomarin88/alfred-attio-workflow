/**
 * Story 1.9 — `quicklook.scrubHtmlCache` unit tests.
 *
 * Coverage:
 *   - Deletes only `*.html` entries; other files survive
 *   - Returns the count of successful unlinks
 *   - Missing / unreadable directory → returns 0 (best-effort contract)
 *   - Per-file unlink failure → swallowed; count reflects only successes
 *   - Uppercase `.HTML` extensions are matched too
 */
import { describe, expect, it, vi } from 'vitest'
import { type QuicklookFs, scrubHtmlCache } from '../../src/common/quicklook'

function makeFs(entries: string[], failOn: Set<string> = new Set()): { fs: QuicklookFs; unlinked: string[] } {
  const unlinked: string[] = []
  const fs: QuicklookFs = {
    readdir: vi.fn().mockResolvedValue(entries),
    unlink: vi.fn().mockImplementation(async (path: string) => {
      if (failOn.has(path)) throw new Error('EPERM')
      unlinked.push(path)
    }),
  }
  return { fs, unlinked }
}

describe('scrubHtmlCache', () => {
  it('deletes only .html files in the directory', async () => {
    const { fs, unlinked } = makeFs(['a.html', 'b.html', 'note.txt', 'icon.png'])
    const count = await scrubHtmlCache('/tmp/wf', fs)
    expect(count).toBe(2)
    expect(unlinked).toEqual(['/tmp/wf/a.html', '/tmp/wf/b.html'])
  })

  it('matches .HTML (uppercase) extensions too', async () => {
    const { fs, unlinked } = makeFs(['MIXED.HTML', 'lower.html', 'README.md'])
    const count = await scrubHtmlCache('/tmp/wf', fs)
    expect(count).toBe(2)
    expect(unlinked).toEqual(['/tmp/wf/MIXED.HTML', '/tmp/wf/lower.html'])
  })

  it('returns 0 when the directory is empty', async () => {
    const { fs } = makeFs([])
    expect(await scrubHtmlCache('/tmp/wf', fs)).toBe(0)
  })

  it('returns 0 when readdir throws (missing or unreadable dir)', async () => {
    const fs: QuicklookFs = {
      readdir: vi.fn().mockRejectedValue(new Error('ENOENT')),
      unlink: vi.fn(),
    }
    expect(await scrubHtmlCache('/missing', fs)).toBe(0)
    expect(fs.unlink).not.toHaveBeenCalled()
  })

  it('swallows per-file unlink errors and continues', async () => {
    const { fs, unlinked } = makeFs(['ok.html', 'broken.html', 'also-ok.html'], new Set(['/tmp/wf/broken.html']))
    const count = await scrubHtmlCache('/tmp/wf', fs)
    expect(count).toBe(2)
    expect(unlinked).toEqual(['/tmp/wf/ok.html', '/tmp/wf/also-ok.html'])
  })

  it('ignores files without an .html extension entirely (no unlink attempt)', async () => {
    const { fs } = makeFs(['data.json', 'cache.db'])
    await scrubHtmlCache('/tmp/wf', fs)
    expect(fs.unlink).not.toHaveBeenCalled()
  })
})
