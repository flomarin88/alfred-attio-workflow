/**
 * Deal Quick Look fiche renderer — Story 3.4.
 *
 * Collects field rows from a resolved deal struct and delegates the
 * HTML document to `renderFicheShell`. Field order per addendum §E:
 * stage, value, linked company, primary contact, close date,
 * last-updated. Stage is rendered as a status pill (`.pill-status` from
 * `fiche.ts`) using the workspace's actual option label verbatim per
 * FR-039 — no semantic color, no fill, just an outline.
 *
 * Missing fields silently omitted (FR-036).
 */
import { type FicheOptions, type FicheRow, formatLastUpdated, renderFicheShell } from './fiche'
import { html } from './quicklook'
import type { Strings } from './strings'

export interface DealFicheInput {
  /** Record ID — used by callers to build the filename, not rendered. */
  id: string
  /** Required. Renders as the `display` heading. */
  name: string
  /** Workspace stage label (status type). Rendered inside `.pill-status`. */
  stage?: string
  /** Already-formatted currency string (e.g. `$50,000`). */
  value?: string
  linkedCompanyName?: string
  primaryPersonName?: string
  /** ISO timestamp. Formatted as a localized short date. */
  closeDateAt?: string
  lastUpdatedAt?: string
}

export type DealFicheOptions = FicheOptions

function formatDate(iso: string | undefined, locale: 'en' | 'fr'): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  return new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function collectRows(input: DealFicheInput, strings: Strings, now: Date): FicheRow[] {
  const t = strings.t.bind(strings)
  const rows: FicheRow[] = []
  if (input.stage) {
    // Stage value is workspace-defined — escape via html`` to preserve
    // non-Latin characters and prevent XSS.
    // prettier-ignore
    const pill = html`<span class="pill-status">${input.stage}</span>`
    rows.push({ label: t('fiche.label.stage'), value: pill })
  }
  if (input.value) rows.push({ label: t('fiche.label.value'), value: input.value })
  if (input.linkedCompanyName) rows.push({ label: t('fiche.label.company'), value: input.linkedCompanyName })
  if (input.primaryPersonName) {
    rows.push({ label: t('fiche.label.primaryPerson'), value: input.primaryPersonName })
  }
  const closeDate = formatDate(input.closeDateAt, strings.locale)
  if (closeDate) rows.push({ label: t('fiche.label.closeDate'), value: closeDate })
  const updated = formatLastUpdated(input.lastUpdatedAt, strings.locale, now)
  if (updated) rows.push({ label: t('fiche.label.lastUpdated'), value: updated })
  return rows
}

export function renderDealFiche(input: DealFicheInput, opts: DealFicheOptions): string {
  const now = opts.now ?? new Date()
  return renderFicheShell(
    {
      name: input.name,
      kindTag: opts.strings.t('fiche.kind.deal').toUpperCase(),
      rows: collectRows(input, opts.strings, now),
    },
    opts,
  )
}
