/**
 * Company Quick Look fiche renderer — Story 3.3.
 *
 * Collects field rows from a resolved company struct and delegates the
 * HTML document to `renderFicheShell` (`fiche.ts`). Field order follows
 * addendum §E: domain, industry, location, linked-people count,
 * last-updated. Linked-people count renders as a single field row, not
 * a list. Missing fields are silently omitted (FR-036).
 */
import { type FicheOptions, type FicheRow, formatLastUpdated, renderFicheShell } from './fiche'
import type { Strings } from './strings'

export interface CompanyFicheInput {
  /** Record ID — used by callers to build the filename, not rendered. */
  id: string
  /** Required. Renders as the `display` heading. */
  name: string
  domain?: string
  industry?: string
  location?: string
  /**
   * Count of linked people (Attio `team` attribute). `undefined` skips
   * the row; `0` renders as `0` so users see the empty-team signal.
   */
  teamCount?: number
  /** ISO timestamp. Formatted via Intl per active strings locale. */
  lastUpdatedAt?: string
}

export type CompanyFicheOptions = FicheOptions

function collectRows(input: CompanyFicheInput, strings: Strings, now: Date): FicheRow[] {
  const t = strings.t.bind(strings)
  const rows: FicheRow[] = []
  if (input.domain) rows.push({ label: t('fiche.label.domain'), value: input.domain })
  if (input.industry) rows.push({ label: t('fiche.label.industry'), value: input.industry })
  if (input.location) rows.push({ label: t('fiche.label.location'), value: input.location })
  if (input.teamCount !== undefined) {
    rows.push({ label: t('fiche.label.team'), value: String(input.teamCount) })
  }
  const updated = formatLastUpdated(input.lastUpdatedAt, strings.locale, now)
  if (updated) rows.push({ label: t('fiche.label.lastUpdated'), value: updated })
  return rows
}

export function renderCompanyFiche(input: CompanyFicheInput, opts: CompanyFicheOptions): string {
  const now = opts.now ?? new Date()
  return renderFicheShell(
    {
      name: input.name,
      kindTag: opts.strings.t('fiche.kind.company').toUpperCase(),
      rows: collectRows(input, opts.strings, now),
    },
    opts,
  )
}
