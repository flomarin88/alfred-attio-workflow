/**
 * Person Quick Look fiche renderer — Story 3.2.
 *
 * Collects the field rows from a resolved person struct and delegates
 * the HTML document to the shared `renderFicheShell` (`fiche.ts`).
 * Field order follows addendum §E: job title, primary email, primary
 * phone, linked company, LinkedIn URL, last-updated. Missing fields are
 * silently omitted (FR-036) — the shell never emits empty `<dd>`s.
 */
import { type FicheOptions, type FicheRow, formatLastUpdated, renderFicheShell } from './fiche'
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

export type PersonFicheOptions = FicheOptions

function collectRows(input: PersonFicheInput, strings: Strings, now: Date): FicheRow[] {
  const t = strings.t.bind(strings)
  const rows: FicheRow[] = []
  if (input.jobTitle) rows.push({ label: t('fiche.label.jobTitle'), value: input.jobTitle })
  if (input.primaryEmail) rows.push({ label: t('fiche.label.email'), value: input.primaryEmail })
  if (input.primaryPhone) rows.push({ label: t('fiche.label.phone'), value: input.primaryPhone })
  if (input.linkedCompanyName) rows.push({ label: t('fiche.label.company'), value: input.linkedCompanyName })
  if (input.linkedinUrl) rows.push({ label: t('fiche.label.linkedin'), value: input.linkedinUrl })
  const updated = formatLastUpdated(input.lastUpdatedAt, strings.locale, now)
  if (updated) rows.push({ label: t('fiche.label.lastUpdated'), value: updated })
  return rows
}

export function renderPersonFiche(input: PersonFicheInput, opts: PersonFicheOptions): string {
  const now = opts.now ?? new Date()
  return renderFicheShell(
    {
      name: input.name,
      kindTag: opts.strings.t('fiche.kind.person').toUpperCase(),
      rows: collectRows(input, opts.strings, now),
    },
    opts,
  )
}
