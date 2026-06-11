/**
 * `task <query>` keyword row builder — Story 2.4.
 *
 * Pure functions only. The keyword script (`src/main/task.ts`) fetches
 * a batch of tasks via `client.listTasks` (no API-level content filter,
 * so the substring match runs client-side) and hands the input set to
 * `buildTaskRows`.
 *
 * Behaviors:
 *   - PAT absent       → setup-prompt row.
 *   - Empty query      → most-recent tasks (sorted by createdAt desc).
 *   - Non-empty query  → substring match on task content.
 *   - 0 matching       → empty row, query echoed in subtitle when set.
 *   - Each row         → title = task content,
 *                        subtitle = `{deadline} · {Open|Completed}`
 *                        (FR-013, distinct from `todo`'s FR-002 mapping
 *                        which shows linked records).
 *   - ⏎                → opens the Attio web URL.
 *   - ⌘⏎               → degrades silently to the Attio URL; first time
 *                         a fallback hint is shown (shared with `person`
 *                         and `deal` via `cmd_enter_hint_dismissed`).
 */
import type { Identity } from './attio/identity'
import type { Task } from './attio/schemas'
import { type IconKey, README_SETUP_URL } from './constants'
import { formatDeadlineSubtitle } from './format'
import { buildNoteAddArg } from './notes'
import type { Strings } from './strings'
import { buildTaskUrl } from './todo'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskInputs {
  identity?: Identity
  /** Tasks fetched by the keyword script (no upstream content filter). */
  tasks: Task[]
  /** Whitespace-trimmed query. When empty, all tasks pass through. */
  query: string
  /** True when a PAT is configured. Drives the setup-prompt branch. */
  patPresent: boolean
  /**
   * Legacy field from Story 2.4 — `cmd_enter_hint_dismissed`-driven
   * fallback hint. Story 4.1 supersedes the fallback with a real
   * mark-complete action, so this is no longer consulted. Kept optional
   * to avoid breaking callers; ignored by the builder.
   *
   * @deprecated Story 4.1 — remove in a follow-up cleanup.
   */
  showCmdHint?: boolean
  /** Override `new Date()` for deterministic tests. */
  now?: Date
  /** Cap on emitted task rows. Defaults to 9 (DEFAULT_RESULT_LIMIT). */
  cap?: number
}

export interface TaskMod {
  arg: string
  valid: boolean
  subtitle: string
}

export interface TaskRow {
  uid: string
  title: string
  subtitle: string
  icon: IconKey
  valid: boolean
  arg: string
  mods?: { cmd?: TaskMod; alt?: TaskMod }
  /** Set by the keyword script after the Quick Look fiche is written. */
  quicklookurl?: string
}

const DEFAULT_CAP = 9

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function compareByCreated(a: Task, b: Task): number {
  const ac = Date.parse(a.createdAt) || 0
  const bc = Date.parse(b.createdAt) || 0
  return bc - ac
}

function buildSubtitle(task: Task, now: Date, strings: Strings): string {
  const parts: string[] = []
  const deadline = formatDeadlineSubtitle(task.deadlineAt, now, strings)
  if (deadline) parts.push(deadline)
  parts.push(task.isCompleted ? strings.t('task.status.completed') : strings.t('task.status.open'))
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------
// Public — buildTaskRows
// ---------------------------------------------------------------------------

export function buildTaskRows(inputs: TaskInputs, strings: Strings): TaskRow[] {
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

  const cap = inputs.cap ?? DEFAULT_CAP
  const now = inputs.now ?? new Date()
  const query = inputs.query.toLowerCase()
  const workspaceSlug = inputs.identity?.workspaceSlug ?? ''

  // Client-side substring match on content. Tasks endpoint has no
  // server-side content filter, so this is the only available path.
  const filtered = query ? inputs.tasks.filter((t) => t.content.toLowerCase().includes(query)) : [...inputs.tasks]

  if (filtered.length === 0) {
    return [
      {
        uid: 'empty',
        title: strings.t('search.empty.tasks.title'),
        subtitle: inputs.query ? strings.t('search.empty.tasks.subtitle', { query: inputs.query }) : '',
        icon: 'info',
        valid: false,
        arg: '',
      },
    ]
  }

  filtered.sort(compareByCreated)
  const limited = filtered.slice(0, cap)

  return limited.map((task): TaskRow => {
    const webUrl = buildTaskUrl(workspaceSlug, task.id)
    // Story 4.1: ⌘⏎ now marks the task complete via the PATCH worker
    // wired in info.plist. The arg carries the task ID so the worker
    // knows what to PATCH. `cmd_enter_hint_dismissed` is intentionally
    // NOT consulted here — it tracks the deal/person fallback hint
    // (FR-015), not this distinct mark-complete affordance.
    const cmd: TaskMod = {
      arg: task.id,
      valid: true,
      subtitle: strings.t('task.mod.markComplete.subtitle'),
    }
    const altArg = buildNoteAddArg({
      slug: 'tasks',
      id: task.id,
      content: inputs.query,
      recordName: task.content || task.id,
    })
    const alt: TaskMod | undefined = altArg
      ? { arg: altArg, valid: true, subtitle: strings.t('note.add.subtitle') }
      : undefined
    return {
      uid: `task-${task.id}`,
      title: task.content || '(no content)',
      subtitle: buildSubtitle(task, now, strings),
      icon: 'task',
      valid: true,
      arg: webUrl,
      mods: { cmd, ...(alt !== undefined ? { alt } : {}) },
    }
  })
}
