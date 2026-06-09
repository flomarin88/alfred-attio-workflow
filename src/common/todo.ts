/**
 * `todo` keyword row builder — Story 1.10.
 *
 * Pure functions only. Consumes already-fetched tasks (Story 1.7's
 * `listTasks`) and pre-resolved linked-record display names, emits the
 * Alfred-row spec the keyword script outputs.
 *
 * Behaviors codified here (FR-001 / FR-002 / FR-003 / FR-004 / FR-008 /
 * FR-022 / FR-023):
 *   - PAT absent → single setup-prompt row pointing at the README.
 *   - Tasks filtered to `is_completed=false` + (`deadline_at <= EOD today`
 *     OR no deadline). Overdue (deadline strictly before today) split
 *     into the OVERDUE group at the top; remainder is the today group.
 *   - Sort: deadline_at asc within each group, created_at desc as
 *     tiebreaker. Tasks without a deadline sort to the end of "today".
 *   - Cap on TASK rows = 9 (the OVERDUE heading + Offline prefix do
 *     not consume the cap).
 *   - Subtitle: linked person · linked deal · linked company, missing
 *     links silently dropped.
 *   - Empty (post-filter): single empty-state row.
 *   - Offline (caller's choice): "Offline — showing cached data" row
 *     prepended.
 *
 * Linked-record name resolution is the caller's job (see
 * `src/main/todo.ts`). The builder reads names from a `Map<"slug:id",
 * string>`; unresolved entries are omitted from the subtitle.
 */
import type { Identity } from './attio/identity'
import type { Task } from './attio/schemas'
import { ATTIO_APP_BASE_URL, DEFAULT_RESULT_LIMIT, type IconKey, README_SETUP_URL } from './constants'
import type { Strings } from './strings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TodoInputs {
  /** Resolved identity. Required for URL building when patPresent is true. */
  identity?: Identity
  /** Tasks returned by `client.listTasks`. The builder filters + groups. */
  tasks: Task[]
  /**
   * Display-name map keyed by `"slug:recordId"` (e.g. `"people:rec_abc"`).
   * Entries the builder cannot find are silently dropped from subtitles.
   */
  linkedRecordNames: Map<string, string>
  /** True when a PAT is configured. Drives the setup-prompt branch. */
  patPresent: boolean
  /**
   * True when the caller is rendering stale-but-cached tasks because
   * Attio is unreachable. Prepends the FR-007 offline-prefix row.
   */
  offline?: boolean
  /** Defaults to `new Date()`. Overridable for deterministic tests. */
  now?: Date
  /** Defaults to 9 (DEFAULT_RESULT_LIMIT / FR-011). */
  cap?: number
}

export interface TodoRow {
  uid: string
  title: string
  subtitle: string
  icon: IconKey
  /** True for selectable task rows; false for headings / info rows. */
  valid: boolean
  /** Open-on-⏎ URL. Empty string for non-actionable rows. */
  arg: string
  quicklookurl?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds the Attio web URL for a task per FR-004.
 *
 * URL shape: `https://app.attio.com/{workspace_slug}/tasks?command-menu-page=task&id={task_id}`.
 */
export function buildTaskUrl(workspaceSlug: string, taskId: string): string {
  const slug = encodeURIComponent(workspaceSlug)
  const id = encodeURIComponent(taskId)
  return `${ATTIO_APP_BASE_URL}/${slug}/tasks?command-menu-page=task&id=${id}`
}

/** Returns `[startOfToday, startOfTomorrow)` in the local timezone. */
function dayBoundaries(now: Date): { startOfToday: Date; startOfTomorrow: Date } {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return { startOfToday, startOfTomorrow }
}

/**
 * Tasks the user should see in `todo`: not completed, AND
 * (no deadline OR deadline < startOfTomorrow). Overdue is the strict
 * subset where deadline < startOfToday.
 */
function partition(tasks: Task[], now: Date): { overdue: Task[]; today: Task[] } {
  const { startOfToday, startOfTomorrow } = dayBoundaries(now)
  const overdue: Task[] = []
  const today: Task[] = []

  for (const t of tasks) {
    if (t.isCompleted) continue
    if (!t.deadlineAt) {
      // No-deadline tasks sit in the today group.
      today.push(t)
      continue
    }
    const d = new Date(t.deadlineAt)
    if (d < startOfToday) {
      overdue.push(t)
    } else if (d < startOfTomorrow) {
      today.push(t)
    }
    // Tasks deadlined after today are silently dropped (out of scope).
  }

  return { overdue, today }
}

const FAR_FUTURE = Number.POSITIVE_INFINITY

/**
 * Comparator per FR-003: deadline_at asc, created_at desc as tiebreaker.
 * Tasks without a deadline sort after every dated task within the group.
 */
function compareTasks(a: Task, b: Task): number {
  const ad = a.deadlineAt ? Date.parse(a.deadlineAt) : FAR_FUTURE
  const bd = b.deadlineAt ? Date.parse(b.deadlineAt) : FAR_FUTURE
  if (ad !== bd) return ad - bd
  const ac = Date.parse(a.createdAt) || 0
  const bc = Date.parse(b.createdAt) || 0
  return bc - ac
}

/**
 * Picks the first linked record of `targetObject` and resolves its
 * display name from the caller-supplied map. Returns `undefined` when
 * either the link is missing or the name was not resolved.
 */
function pickLinkedName(task: Task, targetObject: string, names: Map<string, string>): string | undefined {
  const link = task.linkedRecords.find((l) => l.targetObject === targetObject)
  if (!link) return undefined
  return names.get(`${link.targetObject}:${link.targetRecordId}`)
}

/**
 * Renders the "Quand" part of the subtitle:
 *   - Today           → `Today 14:00`           (via todo.deadline.today microcopy)
 *   - Overdue         → `Overdue Jun 8`         (via todo.deadline.overdue microcopy)
 *   - No deadline     → `undefined` (omitted)
 *
 * Intl date/time formatting uses the active strings locale so Epic 6
 * translations pick up local conventions for free.
 */
function formatDeadline(deadlineAt: string | undefined, now: Date, strings: Strings): string | undefined {
  if (!deadlineAt) return undefined
  const d = new Date(deadlineAt)
  if (Number.isNaN(d.getTime())) return undefined

  const intlLocale = strings.locale === 'fr' ? 'fr-FR' : 'en-US'
  const { startOfToday, startOfTomorrow } = dayBoundaries(now)

  if (d < startOfToday) {
    const date = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' }).format(d)
    return strings.t('todo.deadline.overdue', { date })
  }
  if (d < startOfTomorrow) {
    const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return strings.t('todo.deadline.today', { time })
  }
  // Future deadlines are filtered out upstream; if one slips through we
  // still surface a usable date rather than nothing.
  const date = new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' }).format(d)
  return date
}

/**
 * Subtitle = "Who · When":
 *   - Who: linked person · deal · company, missing links omitted (FR-002 order).
 *   - When: deadline rendered via {@link formatDeadline}, omitted if absent.
 */
function buildSubtitle(task: Task, names: Map<string, string>, now: Date, strings: Strings): string {
  const parts: string[] = []
  const person = pickLinkedName(task, 'people', names)
  if (person) parts.push(person)
  const deal = pickLinkedName(task, 'deals', names)
  if (deal) parts.push(deal)
  const company = pickLinkedName(task, 'companies', names)
  if (company) parts.push(company)
  const when = formatDeadline(task.deadlineAt, now, strings)
  if (when) parts.push(when)
  return parts.join(' · ')
}

function taskRow(task: Task, workspaceSlug: string, names: Map<string, string>, now: Date, strings: Strings): TodoRow {
  return {
    uid: `task-${task.id}`,
    title: task.content || '(no content)',
    subtitle: buildSubtitle(task, names, now, strings),
    icon: 'task',
    valid: true,
    arg: buildTaskUrl(workspaceSlug, task.id),
  }
}

// ---------------------------------------------------------------------------
// Public — buildTodoRows
// ---------------------------------------------------------------------------

export function buildTodoRows(inputs: TodoInputs, strings: Strings): TodoRow[] {
  // FR-022 — setup prompt when no PAT.
  if (!inputs.patPresent) {
    return [
      {
        uid: 'setup',
        title: strings.t('setup.title'),
        subtitle: strings.t('setup.subtitle'),
        icon: 'info',
        valid: true,
        arg: README_SETUP_URL,
      },
    ]
  }

  const cap = inputs.cap ?? DEFAULT_RESULT_LIMIT
  const now = inputs.now ?? new Date()
  const workspaceSlug = inputs.identity?.workspaceSlug ?? ''

  // Filter + group.
  const { overdue, today } = partition(inputs.tasks, now)
  overdue.sort(compareTasks)
  today.sort(compareTasks)

  // Cap on TASK rows only — offline-prefix does not consume the cap.
  let remaining = cap
  const rows: TodoRow[] = []

  if (inputs.offline) {
    rows.push({
      uid: 'offline',
      title: strings.t('todo.offline.title'),
      subtitle: '',
      icon: 'warning',
      valid: false,
      arg: '',
    })
  }

  // Overdue tasks are emitted before today's tasks — the visual heading row
  // has been retired (Florian's call). Sort order still ensures every overdue
  // task ranks above every today task.
  for (const t of overdue) {
    if (remaining <= 0) break
    rows.push(taskRow(t, workspaceSlug, inputs.linkedRecordNames, now, strings))
    remaining -= 1
  }

  for (const t of today) {
    if (remaining <= 0) break
    rows.push(taskRow(t, workspaceSlug, inputs.linkedRecordNames, now, strings))
    remaining -= 1
  }

  const renderedTaskCount = rows.filter((r) => r.uid.startsWith('task-')).length
  if (renderedTaskCount === 0) {
    // Empty state — FR-008. Keep the offline prefix when present.
    const prefix = inputs.offline ? rows.slice(0, 1) : []
    return [
      ...prefix,
      {
        uid: 'empty',
        title: strings.t('todo.empty.title'),
        subtitle: strings.t('todo.empty.subtitle'),
        icon: 'info',
        valid: false,
        arg: '',
      },
    ]
  }

  return rows
}
