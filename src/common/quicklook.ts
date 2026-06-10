/**
 * Quick Look HTML helpers — Story 1.9 cache scrub + Story 3.1 render
 * primitives (tagged-template HTML, design-token styles, bundled-font
 * @font-face). Per-object fiche renderers (Stories 3.2–3.5) consume
 * these primitives.
 *
 * Boundary rules: per `eslint.config.mjs`, this file may use
 * `node:fs/promises` (it owns Quick Look cache I/O) but MAY NOT import
 * the API client or encoders, and MAY NOT use `fetch`. Tests inject the
 * `fs` deps so we never touch the real filesystem in unit runs.
 */
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'

/**
 * Minimal filesystem surface used by Quick Look helpers. DI'd for
 * testing. The renderer / writer pair lives in this module because
 * `eslint.config.mjs` grants `quicklook.ts` the sole permission to use
 * `node:fs/promises` outside `cache.ts`.
 */
export interface QuicklookFs {
  readdir(dir: string): Promise<string[]>
  unlink(path: string): Promise<void>
  mkdir(dir: string, opts: { recursive: true }): Promise<unknown>
  writeFile(path: string, data: string): Promise<void>
}

const DEFAULT_FS: QuicklookFs = {
  readdir: (dir) => readdir(dir),
  unlink: (path) => unlink(path),
  mkdir: (dir, opts) => mkdir(dir, opts),
  writeFile: (path, data) => writeFile(path, data, 'utf8'),
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

// ---------------------------------------------------------------------------
// Story 3.1 — `html` tagged template (XSS-safe interpolation)
// ---------------------------------------------------------------------------

/**
 * Branded HTML fragment. The `html\`\`` tag returns an `Html` instance
 * instead of a raw string so nested interpolations (`html\`<section>${html\`<h1>x</h1>\`}</section>\``)
 * pass through without double-escaping. `String(fragment)` and
 * `fragment.toString()` yield the rendered markup; per-fiche renderers
 * (Stories 3.2–3.5) write `String(html\`…\`)` to the cache file.
 */
export class Html {
  constructor(public readonly value: string) {}
  toString(): string {
    return this.value
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes the five HTML-significant characters. */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === false) return ''
  if (value instanceof Html) return value.value
  if (Array.isArray(value)) return value.map(renderValue).join('')
  return escapeHtml(String(value))
}

/**
 * Tagged template that XSS-escapes every interpolated value by default.
 * Pass an `Html` instance (typically from a nested `html\`\``) to opt
 * out per-interpolation; arrays are mapped through the same rules and
 * joined without separator.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  let out = strings[0]
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i]) + strings[i + 1]
  }
  return new Html(out)
}

/**
 * Wraps an already-trusted HTML string as an `Html` fragment so it
 * passes through `html\`\`` interpolation unescaped. Use ONLY for HTML
 * the workflow itself produced — never user-supplied content. The
 * Story 3.1 helpers (`getStyles`, `getFontFace`) return plain strings
 * to keep their own unit-test API ergonomic; per-object fiche renderers
 * (Stories 3.2–3.5) re-wrap their output via `raw()` before
 * interpolation.
 */
export function raw(value: string): Html {
  return new Html(value)
}

// ---------------------------------------------------------------------------
// Story 3.1 — `getStyles(mode)` (DESIGN.md color tokens as CSS variables)
// ---------------------------------------------------------------------------

export type ColorMode = 'auto' | 'light' | 'dark'

/**
 * Light-mode color tokens lifted verbatim from
 * `_bmad-output/planning-artifacts/ux-designs/.../DESIGN.md` §Colors.
 * Keep this map and DARK_TOKENS in 1:1 correspondence — every key in
 * one MUST exist in the other so the dark `@media` override is
 * complete.
 */
const LIGHT_TOKENS: Readonly<Record<string, string>> = {
  '--background': '#ffffff',
  '--surface': '#ffffff',
  '--surface-raised': '#fafafa',
  '--ink-primary': '#1c1d1f',
  '--ink-secondary': '#54565b',
  '--ink-tertiary': '#6e7077',
  '--divider': '#e8e9eb',
  '--outline': '#9ea0a6',
  '--accent': '#266df0',
  '--accent-hover': '#1f5dd1',
  '--on-accent': '#ffffff',
  '--success': '#0fc27b',
  '--warning': '#f5b900',
  '--error': '#ff5b59',
  '--on-error': '#ffffff',
  '--highlight': '#fff8d6',
}

const DARK_TOKENS: Readonly<Record<string, string>> = {
  '--background': '#101113',
  '--surface': '#101113',
  '--surface-raised': '#1a1c1f',
  '--ink-primary': '#f5f5f7',
  '--ink-secondary': '#b7b9be',
  '--ink-tertiary': '#9b9da3',
  '--divider': '#26282c',
  '--outline': '#5e6066',
  '--accent': '#4a86ff',
  '--accent-hover': '#6a9bff',
  '--on-accent': '#ffffff',
  '--success': '#10cc82',
  '--warning': '#ffc827',
  '--error': '#ff6e6c',
  '--on-error': '#ffffff',
  '--highlight': '#3a3415',
}

function renderTokenBlock(tokens: Readonly<Record<string, string>>, indent: string): string {
  return Object.entries(tokens)
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n')
}

const BASE_BODY_STYLES = `body {
  margin: 0;
  background: var(--background);
  color: var(--ink-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 500;
  letter-spacing: -0.01em;
  font-size: 14px;
  line-height: 1.5;
}`

/**
 * Returns a `<style>` block declaring DESIGN.md color tokens as
 * top-level CSS variables. `mode` controls dark-mode handling:
 *   - `light` / `dark`: single set of tokens, no media query.
 *   - `auto`: light tokens at the root + `@media (prefers-color-scheme: dark)`
 *     overriding to dark tokens. This is the canonical fiche mode.
 *
 * The block also carries minimal body styling so the fiche has a
 * baseline background, color, and font-family. Per-fiche layout is
 * added by the renderers in Stories 3.2–3.5.
 */
export function getStyles(mode: ColorMode = 'auto'): string {
  if (mode === 'light') {
    return `<style>
:root {
${renderTokenBlock(LIGHT_TOKENS, '  ')}
}
${BASE_BODY_STYLES}
</style>`
  }
  if (mode === 'dark') {
    return `<style>
:root {
${renderTokenBlock(DARK_TOKENS, '  ')}
}
${BASE_BODY_STYLES}
</style>`
  }
  return `<style>
:root {
${renderTokenBlock(LIGHT_TOKENS, '  ')}
}
@media (prefers-color-scheme: dark) {
  :root {
${renderTokenBlock(DARK_TOKENS, '    ')}
  }
}
${BASE_BODY_STYLES}
</style>`
}

// ---------------------------------------------------------------------------
// Story 3.1 — `getFontFace(bundleDir)` (bundled WOFF2 @font-face)
// ---------------------------------------------------------------------------

/**
 * Returns a `<style>` block with `@font-face` rules pointing at the
 * bundled WOFF2 files via `file://` URLs. Two families are bundled —
 * Inter (variable) and JetBrains Mono — both at `assets/fonts/` under
 * the workflow bundle. The DESIGN.md `font-family` chain
 * (`Inter Display, Inter, system-ui, …`) handles the absent Inter
 * Display WOFF2 by falling back to Inter (rsms/inter v4 collapsed the
 * Display optical-size variant into Inter's `opsz` axis — see
 * `assets/fonts/README.md`).
 */
export function getFontFace(bundleDir: string): string {
  const inter = `file://${bundleDir}/assets/fonts/Inter.woff2`
  const mono = `file://${bundleDir}/assets/fonts/JetBrainsMono.woff2`
  return `<style>
@font-face {
  font-family: 'Inter';
  src: url('${inter}') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('${mono}') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
</style>`
}

// ---------------------------------------------------------------------------
// Story 3.2 — fiche writer (HTML → cache file)
// ---------------------------------------------------------------------------

/**
 * Writes a rendered HTML fiche to `${cacheDir}/quicklook/${filename}`
 * and returns the absolute path written. Creates the `quicklook/`
 * subdirectory if needed. Returns `undefined` when any I/O step fails —
 * callers degrade silently (the row omits `quicklookurl` and ⇧ falls
 * back to no preview).
 *
 * `cacheDir` is typically `alfredClient.alfredInfo.cache()`. `filename`
 * must include the extension (e.g. `person-rec_abc.html`).
 */
export async function writeQuicklookHtml(
  cacheDir: string,
  filename: string,
  html: string,
  fs: QuicklookFs = DEFAULT_FS,
): Promise<string | undefined> {
  const dir = `${cacheDir.replace(/\/$/, '')}/quicklook`
  const path = `${dir}/${filename}`
  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path, html)
    return path
  } catch {
    return undefined
  }
}
