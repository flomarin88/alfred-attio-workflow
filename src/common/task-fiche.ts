/**
 * Task Quick Look fiche renderer — Story 3.5.
 *
 * Collects field rows from a resolved task struct and delegates the
 * HTML document to `renderFicheShell`. Task content is rendered as the
 * `display` heading WITHOUT an edit affordance — FR-040 narrows the
 * writable surface for tasks; the fiche is read-only.
 *
 * Field order per addendum §E: deadline, assignee, linked person,
 * linked deal, linked company. Missing fields are silently omitted
 * (FR-036).
 */
import { type FicheOptions, type FicheRow, renderFicheShell } from './fiche'
import { formatDeadlineSubtitle } from './format'
import type { Strings } from './strings'

export type TaskAssigneeRole = 'me' | 'other'

export interface TaskFicheInput {
  /** Record ID — used by callers to build the filename, not rendered. */
  id: string
  /** Task content (plain text). Rendered as `display` heading. */
  content: string
  /** ISO timestamp. Surfaced as overdue / today / upcoming via shared formatter. */
  deadlineAt?: string
  /**
   * Resolved assignee role. `undefined` skips the row entirely.
   * The renderer NEVER surfaces a workspace_member_id directly — the
   * keyword script compares against `identity.workspaceMemberId` and
   * sets `'me'` for self-assigned tasks, `'other'` otherwise.
   */
  assignee?: TaskAssigneeRole
  linkedPersonName?: string
  linkedDealName?: string
  linkedCompanyName?: string
}

export type TaskFicheOptions = FicheOptions

function assigneeLabelValue(role: TaskAssigneeRole, strings: Strings): string {
  return role === 'me' ? strings.t('fiche.value.assignee.me') : strings.t('fiche.value.assignee.other')
}

function collectRows(input: TaskFicheInput, strings: Strings, now: Date): FicheRow[] {
  const t = strings.t.bind(strings)
  const rows: FicheRow[] = []
  const deadline = formatDeadlineSubtitle(input.deadlineAt, now, strings)
  if (deadline) rows.push({ label: t('fiche.label.deadline'), value: deadline })
  if (input.assignee)
    rows.push({ label: t('fiche.label.assignee'), value: assigneeLabelValue(input.assignee, strings) })
  if (input.linkedPersonName) rows.push({ label: t('fiche.label.linkedPerson'), value: input.linkedPersonName })
  if (input.linkedDealName) rows.push({ label: t('fiche.label.linkedDeal'), value: input.linkedDealName })
  if (input.linkedCompanyName) {
    rows.push({ label: t('fiche.label.linkedCompany'), value: input.linkedCompanyName })
  }
  return rows
}

export function renderTaskFiche(input: TaskFicheInput, opts: TaskFicheOptions): string {
  const now = opts.now ?? new Date()
  return renderFicheShell(
    {
      name: input.content || '(no content)',
      kindTag: opts.strings.t('fiche.kind.task').toUpperCase(),
      rows: collectRows(input, opts.strings, now),
    },
    opts,
  )
}
