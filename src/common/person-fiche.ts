/**
 * Person Quick Look fiche renderer — Story 3.2.
 *
 * Pure HTML generator. Consumes a resolved field struct (the keyword
 * script does the Attio plumbing in `src/main/person.ts`) and emits a
 * full HTML document for `${cacheDir}/quicklook/person-{id}.html`.
 *
 * Field order is fixed (addendum §E): job title, primary email, primary
 * phone, linked company, LinkedIn URL, last-updated. Missing fields are
 * silently omitted per FR-036 — the rendered HTML never carries an empty
 * `<dd>`, a literal `—`, or a `null`. Semantic HTML (`<section>`, `<dl>`,
 * `<dt>`, `<dd>`) carries the structure; the layout `<style>` block
 * styles those tags directly so the markup stays minimal.
 *
 * Light + dark are handled in one HTML file via
 * `prefers-color-scheme` (see `getStyles('auto')`). Renderer is
 * boundary-clean: no API client, no `fetch`, no PAT visibility.
 */
import { type Html, getFontFace, getStyles, html, raw } from './quicklook'
import type { Strings } from './strings'

export interface PersonFicheInput {
  /** Record ID — used by callers to build the filename, not rendered. */
  id: string
  /** Required. Renders as the `display` heading. */
  name: string
  jobTitle?: string
  primaryEmail?: string
  primaryPhone?: string
  linkedCompanyName?: string
  linkedinUrl?: string
  /** ISO timestamp. Formatted via Intl per active strings locale. */
  lastUpdatedAt?: string
}

export interface PersonFicheOptions {
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
</style>`

interface FicheRow {
  label: string
  value: string
}

function formatLastUpdated(iso: string | undefined, locale: 'en' | 'fr', now: Date): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  // Same day → time, otherwise → date. Both via Intl so Epic 6 translations
  // pick up local conventions for free.
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (sameDay) {
    return new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  }
  return new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function collectRows(input: PersonFicheInput, opts: PersonFicheOptions): FicheRow[] {
  const t = opts.strings.t.bind(opts.strings)
  const rows: FicheRow[] = []
  if (input.jobTitle) rows.push({ label: t('fiche.label.jobTitle'), value: input.jobTitle })
  if (input.primaryEmail) rows.push({ label: t('fiche.label.email'), value: input.primaryEmail })
  if (input.primaryPhone) rows.push({ label: t('fiche.label.phone'), value: input.primaryPhone })
  if (input.linkedCompanyName) rows.push({ label: t('fiche.label.company'), value: input.linkedCompanyName })
  if (input.linkedinUrl) rows.push({ label: t('fiche.label.linkedin'), value: input.linkedinUrl })
  const updated = formatLastUpdated(input.lastUpdatedAt, opts.strings.locale, opts.now ?? new Date())
  if (updated) rows.push({ label: t('fiche.label.lastUpdated'), value: updated })
  return rows
}

function renderRow(row: FicheRow): Html {
  // prettier-ignore
  return html`<dt>${row.label}</dt><dd>${row.value}</dd>`
}

/**
 * Renders the full Quick Look HTML document for a person record. All
 * interpolations flow through the `html\`\`` tag — names, job titles,
 * emails, phones, company names, URLs, and dates are XSS-escaped before
 * reaching the output. Callers never need to pre-escape.
 */
export function renderPersonFiche(input: PersonFicheInput, opts: PersonFicheOptions): string {
  const rows = collectRows(input, opts)
  const kind = opts.strings.t('fiche.kind.person').toUpperCase()
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
<p class="kind">${kind}</p>
<h1 class="display">${input.name}</h1>
<dl>
${rows.map(renderRow)}
</dl>
</section>
</main>
</body>
</html>`

  return String(document)
}
