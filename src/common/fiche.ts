/**
 * Quick Look fiche shell — Story 3.2 (person) extracted for reuse in
 * Story 3.3 (company), 3.4 (deal), 3.5 (task).
 *
 * Each per-object renderer collects its own `FicheRow[]` from the Attio
 * record's fields, then hands the rows + kind label + display name to
 * `renderFicheShell`, which produces the full HTML document. The shell
 * owns:
 *   - `<!doctype>` + `<html lang>` + `<head>` (font face, design tokens,
 *     fiche layout)
 *   - `<body><main><section>` wrapper
 *   - PERSON / COMPANY / DEAL / TASK kind tag (already uppercased)
 *   - Display heading
 *   - `<dl>` of `<dt>label</dt><dd>value</dd>` pairs
 *
 * Missing fields are the caller's responsibility — anything the caller
 * decides to omit simply does not appear in `rows`. The shell never
 * inserts `—`, `null`, or empty `<dd>`. All interpolations flow through
 * the XSS-safe `html\`\`` tag from `quicklook.ts`.
 */
import { type Html, getFontFace, getStyles, html, raw } from './quicklook'
import type { Strings } from './strings'

export interface FicheRow {
  label: string
  /**
   * Plain string (XSS-escaped at render time) OR an `Html` fragment
   * previously rendered by the caller via the safe `html\`\`` tag.
   * Story 3.4 introduces the `Html` variant for the deal stage pill.
   */
  value: string | Html
}

export interface FicheShellInput {
  /** Display heading — the record's primary name. */
  name: string
  /**
   * Already-uppercased kind tag (`PERSON`, `COMPANY`, etc.). Computed
   * by the caller from `strings.t('fiche.kind.<kind>').toUpperCase()`
   * so per-object renderers stay i18n-aware.
   */
  kindTag: string
  /** Field rows in render order. Empty array → fiche has only the heading. */
  rows: FicheRow[]
}

export interface FicheOptions {
  /** Absolute path to the workflow bundle (drives `@font-face` URLs). */
  bundleDir: string
  strings: Strings
  /** Override `new Date()` for deterministic snapshots. */
  now?: Date
}

const FICHE_LAYOUT_STYLES = `<style>
main {
  margin: 0;
  padding: 20px;
  max-width: 540px;
}
section {
  background: var(--surface);
  border: 1px solid var(--divider);
  border-radius: 8px;
  padding: 20px;
}
.kind {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-tertiary);
}
h1.display {
  margin: 0 0 16px;
  font-family: 'Inter Display', 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ink-primary);
}
dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  row-gap: 8px;
  column-gap: 16px;
  margin: 0;
}
dt {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-tertiary);
}
dd {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.01em;
  color: var(--ink-primary);
  word-break: break-word;
}
.pill-status {
  display: inline-block;
  background: var(--surface-raised);
  border: 1px solid var(--outline);
  border-radius: 9999px;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: var(--ink-primary);
}
</style>`

function renderRow(row: FicheRow): Html {
  // prettier-ignore
  return html`<dt>${row.label}</dt><dd>${row.value}</dd>`
}

/**
 * Renders the full Quick Look HTML document for a record. All
 * interpolations flow through `html\`\``, so labels and values are
 * XSS-escaped before reaching the output. Caller-supplied `kindTag`
 * is rendered as-is; pre-process it (e.g. `.toUpperCase()`) at the call
 * site.
 */
export function renderFicheShell(input: FicheShellInput, opts: FicheOptions): string {
  const fontFace = raw(getFontFace(opts.bundleDir))
  const tokenStyles = raw(getStyles('auto'))
  const layoutStyles = raw(FICHE_LAYOUT_STYLES)
  const lang = opts.strings.locale === 'fr' ? 'fr' : 'en'

  // prettier-ignore
  const document = html`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${input.name}</title>
${fontFace}
${tokenStyles}
${layoutStyles}
</head>
<body>
<main>
<section>
<p class="kind">${input.kindTag}</p>
<h1 class="display">${input.name}</h1>
<dl>
${input.rows.map(renderRow)}
</dl>
</section>
</main>
</body>
</html>`

  return String(document)
}

/**
 * Renders an ISO timestamp as either `HH:MM` (same calendar day as
 * `now`) or a localized short date. Returns `undefined` when the input
 * is missing or unparseable so callers can omit the row entirely.
 */
export function formatLastUpdated(iso: string | undefined, locale: 'en' | 'fr', now: Date): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (sameDay) {
    return new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  }
  return new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}
