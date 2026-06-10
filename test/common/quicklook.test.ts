/**
 * Story 1.9 — `quicklook.scrubHtmlCache` unit tests.
 * Story 3.1 — `html` tagged template + `getStyles` + `getFontFace`.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  Html,
  type QuicklookFs,
  escapeHtml,
  getFontFace,
  getStyles,
  html,
  scrubHtmlCache,
} from '../../src/common/quicklook'

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

// ---------------------------------------------------------------------------
// Story 3.1 — escapeHtml + html tagged template
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
  })

  it('leaves benign characters untouched', () => {
    expect(escapeHtml('hello world 123 _-.,!?')).toBe('hello world 123 _-.,!?')
  })

  it('escapes every occurrence (not just the first)', () => {
    expect(escapeHtml('<<<')).toBe('&lt;&lt;&lt;')
  })
})

describe('html — XSS escape (5+ payloads)', () => {
  function render(payload: string): string {
    return String(html`<h1>${payload}</h1>`)
  }

  it.each([
    ['<script>alert(1)</script>', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    ['" onerror="alert(1)', '&quot; onerror=&quot;alert(1)'],
    ["javascript:alert('x')", 'javascript:alert(&#39;x&#39;)'],
    ['<img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)&gt;'],
    ['<svg/onload=alert(1)>', '&lt;svg/onload=alert(1)&gt;'],
    ['"><iframe src=javascript:alert(1)></iframe>', '&quot;&gt;&lt;iframe src=javascript:alert(1)&gt;&lt;/iframe&gt;'],
  ])('escapes payload %#: %s', (payload, expectedEscaped) => {
    const rendered = render(payload)
    expect(rendered).toContain(expectedEscaped)
    // No live <script> tag can be parsed in the result. (The literal
    // `<h1>` from the template is fine; we test the interpolated value.)
    expect(rendered).not.toContain(`<${payload.split('<')[1]?.split('>')[0] ?? ''}>`.replace('<>', 'no-tag'))
    expect(rendered).not.toMatch(/<script[\s>]/i)
    expect(rendered).not.toMatch(/<iframe[\s>]/i)
    expect(rendered).not.toMatch(/<img[\s>]/i)
    expect(rendered).not.toMatch(/<svg[\s>]/i)
  })

  it('leaves literal template chunks untouched (only interpolations escape)', () => {
    expect(String(html`<h1>hello</h1>`)).toBe('<h1>hello</h1>')
  })

  it('renders null / undefined / false as empty string', () => {
    expect(String(html`<p>${null}</p>`)).toBe('<p></p>')
    expect(String(html`<p>${undefined}</p>`)).toBe('<p></p>')
    expect(String(html`<p>${false}</p>`)).toBe('<p></p>')
  })

  it('renders numbers and booleans-true via String()', () => {
    expect(String(html`<p>${42}</p>`)).toBe('<p>42</p>')
    expect(String(html`<p>${true}</p>`)).toBe('<p>true</p>')
  })

  it('passes through nested Html fragments without re-escaping', () => {
    const inner = html`<strong>${'<b>bold</b>'}</strong>`
    const outer = html`<section>${inner}</section>`
    expect(String(outer)).toBe('<section><strong>&lt;b&gt;bold&lt;/b&gt;</strong></section>')
  })

  it('renders arrays by joining without separator and escaping each entry', () => {
    const rows = ['<a>', '<b>']
    const items = rows.map((r) => html`<li>${r}</li>`)
    // prettier-ignore
    const out = html`<ul>${items}</ul>`
    expect(String(out)).toBe('<ul><li>&lt;a&gt;</li><li>&lt;b&gt;</li></ul>')
  })

  it('returns an Html instance (branded fragment)', () => {
    expect(html`<p>x</p>`).toBeInstanceOf(Html)
  })
})

// ---------------------------------------------------------------------------
// Story 3.1 — getStyles
// ---------------------------------------------------------------------------

describe('getStyles', () => {
  it('emits light tokens at :root and a dark-mode media query in auto mode', () => {
    const styles = getStyles('auto')
    expect(styles).toMatch(/^<style>/)
    expect(styles).toMatch(/<\/style>$/)
    expect(styles).toContain('--ink-primary: #1c1d1f;') // light
    expect(styles).toContain('--background: #ffffff;') // light
    expect(styles).toContain('@media (prefers-color-scheme: dark)')
    expect(styles).toContain('--ink-primary: #f5f5f7;') // dark override
    expect(styles).toContain('--background: #101113;') // dark override
  })

  it('defaults to auto mode', () => {
    expect(getStyles()).toBe(getStyles('auto'))
  })

  it('emits a single-set light block (no media query) in light mode', () => {
    const styles = getStyles('light')
    expect(styles).toContain('--ink-primary: #1c1d1f;')
    expect(styles).not.toContain('@media')
    expect(styles).not.toContain('#f5f5f7') // no dark token
  })

  it('emits a single-set dark block (no media query) in dark mode', () => {
    const styles = getStyles('dark')
    expect(styles).toContain('--ink-primary: #f5f5f7;')
    expect(styles).toContain('--background: #101113;')
    expect(styles).not.toContain('@media')
    expect(styles).not.toContain('#1c1d1f') // no light token
  })

  it('declares every DESIGN.md color token (light)', () => {
    const styles = getStyles('light')
    for (const token of [
      '--background',
      '--surface',
      '--surface-raised',
      '--ink-primary',
      '--ink-secondary',
      '--ink-tertiary',
      '--divider',
      '--outline',
      '--accent',
      '--accent-hover',
      '--on-accent',
      '--success',
      '--warning',
      '--error',
      '--on-error',
      '--highlight',
    ]) {
      expect(styles).toContain(`${token}:`)
    }
  })

  it('declares the same token set in dark mode as in light (no drift)', () => {
    const tokensIn = (s: string): string[] => Array.from(s.matchAll(/(--[a-z-]+):/g)).map((m) => m[1])
    const light = new Set(tokensIn(getStyles('light')))
    const dark = new Set(tokensIn(getStyles('dark')))
    expect(dark).toEqual(light)
  })

  it('emits baseline body styles using the tokens', () => {
    const styles = getStyles('light')
    expect(styles).toContain('background: var(--background);')
    expect(styles).toContain('color: var(--ink-primary);')
    expect(styles).toContain("font-family: 'Inter'")
  })
})

// ---------------------------------------------------------------------------
// Story 3.1 — getFontFace
// ---------------------------------------------------------------------------

describe('getFontFace', () => {
  it('emits @font-face for Inter pointing at the bundled WOFF2 path', () => {
    const css = getFontFace('/Users/me/Alfred/workflow.bundle')
    expect(css).toContain("@font-face {\n  font-family: 'Inter';")
    expect(css).toContain("url('file:///Users/me/Alfred/workflow.bundle/assets/fonts/Inter.woff2')")
    expect(css).toContain("format('woff2-variations')")
  })

  it('emits @font-face for JetBrains Mono pointing at the bundled WOFF2 path', () => {
    const css = getFontFace('/path/to/bundle')
    expect(css).toContain("@font-face {\n  font-family: 'JetBrains Mono';")
    expect(css).toContain("url('file:///path/to/bundle/assets/fonts/JetBrainsMono.woff2')")
  })

  it('does NOT embed base64 font data — only file:// URLs', () => {
    const css = getFontFace('/some/bundle')
    expect(css).not.toContain('data:')
    expect(css).not.toContain('base64')
  })

  it('does NOT declare Inter Display — covered by the DESIGN.md fallback chain', () => {
    const css = getFontFace('/some/bundle')
    expect(css).not.toContain('Inter Display')
    expect(css).not.toContain('InterDisplay')
    expect(css).not.toContain('Inter-Display')
  })

  it('uses font-display: swap to avoid invisible-text flash', () => {
    expect(getFontFace('/x')).toContain('font-display: swap;')
  })

  it('wraps output in <style></style>', () => {
    const css = getFontFace('/x')
    expect(css.startsWith('<style>')).toBe(true)
    expect(css.endsWith('</style>')).toBe(true)
  })
})
