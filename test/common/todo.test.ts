/**
 * Story 1.10 — `todo.buildTodoRows` unit tests.
 *
 * Coverage targets (per AC):
 *   - PAT missing → single setup-prompt row pointing at the README
 *   - Filtering: completed dropped; future-dated dropped
 *   - Grouping: overdue under OVERDUE heading; today following
 *   - Sort: deadline_at asc, created_at desc tiebreaker; no-deadline
 *     tasks at the end of "today"
 *   - Cap at 9 task rows (heading + offline-prefix do not consume cap)
 *   - Empty state row with todo.empty microcopy
 *   - Offline → prefix row + cached tasks; or prefix + empty when no cached
 *   - URL construction per FR-004
 *   - Subtitle omits missing/unresolved links silently (FR-002)
 */
import { describe, expect, it } from 'vitest'
import type { Identity } from '../../src/common/attio/identity'
import type { Task } from '../../src/common/attio/schemas'
import { type TodoInputs, buildTaskUrl, buildTodoRows } from '../../src/common/todo'
import { READMEAnchor, identity, makeStrings, makeTask } from './_todo-fixtures'

const NOW = new Date('2026-06-09T12:00:00')

function defaults(overrides: Partial<TodoInputs> = {}): TodoInputs {
  return {
    identity,
    tasks: [],
    linkedRecordNames: new Map(),
    patPresent: true,
    now: NOW,
    ...overrides,
  }
}

describe('buildTodoRows — setup branch', () => {
  it('returns a single setup-prompt row when no PAT is configured', () => {
    const rows = buildTodoRows(defaults({ patPresent: false }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'setup',
      title: 'Attio API token not configured',
      subtitle: '⏎ for setup instructions',
      icon: 'info',
      valid: true,
      arg: READMEAnchor,
    })
  })
})

describe('buildTodoRows — empty branch', () => {
  it('returns the empty-state row when no tasks survive the filter', () => {
    const rows = buildTodoRows(defaults({ tasks: [] }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'empty',
      title: 'No tasks due today',
      subtitle: "You're all caught up",
      icon: 'info',
      valid: false,
      arg: '',
    })
  })

  it('drops completed tasks before evaluating emptiness', () => {
    const done = makeTask({ id: 't1', isCompleted: true, deadlineAt: '2026-06-09T10:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [done] }), makeStrings())
    expect(rows[0].uid).toBe('empty')
  })

  it('drops future-dated tasks (deadline strictly after today)', () => {
    const future = makeTask({ id: 't1', deadlineAt: '2026-06-15T10:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [future] }), makeStrings())
    expect(rows[0].uid).toBe('empty')
  })
})

describe('buildTodoRows — grouping + sorting', () => {
  // Local time fixture: NOW = 2026-06-09 12:00:00 local.
  const overdueEarlier = makeTask({
    id: 'overdue-A',
    content: 'Earlier overdue',
    deadlineAt: '2026-06-08T09:00:00',
    createdAt: '2026-06-01T08:00:00',
  })
  const overdueLater = makeTask({
    id: 'overdue-B',
    content: 'Later overdue',
    deadlineAt: '2026-06-08T15:00:00',
    createdAt: '2026-06-01T08:00:00',
  })
  const todayMorning = makeTask({
    id: 'today-A',
    content: 'Today morning',
    deadlineAt: '2026-06-09T09:00:00',
    createdAt: '2026-06-09T07:00:00',
  })
  const todayEvening = makeTask({
    id: 'today-B',
    content: 'Today evening',
    deadlineAt: '2026-06-09T18:00:00',
    createdAt: '2026-06-09T07:00:00',
  })
  const noDeadlineNew = makeTask({
    id: 'no-dl-new',
    content: 'No deadline new',
    deadlineAt: undefined,
    createdAt: '2026-06-09T11:00:00',
  })
  const noDeadlineOld = makeTask({
    id: 'no-dl-old',
    content: 'No deadline old',
    deadlineAt: undefined,
    createdAt: '2026-06-01T08:00:00',
  })

  it('emits overdue tasks before today tasks (no separator heading)', () => {
    const rows = buildTodoRows(
      defaults({ tasks: [todayEvening, overdueLater, overdueEarlier, todayMorning] }),
      makeStrings(),
    )
    const uids = rows.map((r) => r.uid)
    expect(uids).toEqual(['task-overdue-A', 'task-overdue-B', 'task-today-A', 'task-today-B'])
    expect(rows.find((r) => r.uid === 'heading-overdue')).toBeUndefined()
  })

  it('sorts within each group by deadline asc, created desc as tiebreaker', () => {
    const dupeEarlier = makeTask({
      id: 'overdue-A2',
      content: 'Same deadline, older',
      deadlineAt: '2026-06-08T09:00:00',
      createdAt: '2026-05-30T08:00:00',
    })
    const rows = buildTodoRows(defaults({ tasks: [dupeEarlier, overdueEarlier] }), makeStrings())
    // Both share deadline → newer created_at wins (overdue-A created 2026-06-01)
    expect(rows.map((r) => r.uid)).toEqual(['task-overdue-A', 'task-overdue-A2'])
  })

  it('places no-deadline tasks at the end of "today" sorted by created desc', () => {
    const rows = buildTodoRows(defaults({ tasks: [noDeadlineOld, noDeadlineNew, todayMorning] }), makeStrings())
    expect(rows.map((r) => r.uid)).toEqual(['task-today-A', 'task-no-dl-new', 'task-no-dl-old'])
  })
})

describe('buildTodoRows — 9-task cap', () => {
  it('caps task rows at 9; offline prefix does not consume the cap', () => {
    const tasks: Task[] = Array.from({ length: 12 }, (_, i) =>
      makeTask({
        id: `o-${i}`,
        content: `Overdue ${i}`,
        deadlineAt: `2026-06-08T${String(i % 24).padStart(2, '0')}:00:00`,
      }),
    )
    const rows = buildTodoRows(defaults({ tasks, offline: true }), makeStrings())
    const taskRows = rows.filter((r) => r.uid.startsWith('task-'))
    expect(taskRows).toHaveLength(9)
    // 1 offline + 9 tasks
    expect(rows).toHaveLength(10)
    expect(rows[0].uid).toBe('offline')
  })
})

describe('buildTodoRows — subtitle (Qui · Quand)', () => {
  it('joins person · deal · company · deadline in fixed order', () => {
    const task = makeTask({
      id: 't1',
      content: 'Call lead',
      deadlineAt: '2026-06-09T15:00:00',
      linkedRecords: [
        { targetObject: 'companies', targetRecordId: 'c1' },
        { targetObject: 'people', targetRecordId: 'p1' },
        { targetObject: 'deals', targetRecordId: 'd1' },
      ],
    })
    const names = new Map<string, string>([
      ['people:p1', 'Jane Doe'],
      ['deals:d1', 'Acme expansion'],
      ['companies:c1', 'Acme Inc.'],
    ])
    const rows = buildTodoRows(defaults({ tasks: [task], linkedRecordNames: names }), makeStrings())
    expect(rows[0].subtitle).toBe('Jane Doe · Acme expansion · Acme Inc. · Today 15:00')
  })

  it('silently omits missing or unresolved links but keeps the deadline', () => {
    const task = makeTask({
      id: 't1',
      content: 'Call lead',
      deadlineAt: '2026-06-09T15:00:00',
      linkedRecords: [
        { targetObject: 'companies', targetRecordId: 'c1' },
        { targetObject: 'people', targetRecordId: 'p_unresolved' },
      ],
    })
    const names = new Map<string, string>([['companies:c1', 'Acme Inc.']])
    const rows = buildTodoRows(defaults({ tasks: [task], linkedRecordNames: names }), makeStrings())
    expect(rows[0].subtitle).toBe('Acme Inc. · Today 15:00')
  })

  it('shows only the deadline when no linked records', () => {
    const task = makeTask({ id: 't1', deadlineAt: '2026-06-09T15:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [task] }), makeStrings())
    expect(rows[0].subtitle).toBe('Today 15:00')
  })

  it('shows only the linked records when no deadline (no-deadline task)', () => {
    const task = makeTask({
      id: 't1',
      deadlineAt: undefined,
      linkedRecords: [{ targetObject: 'people', targetRecordId: 'p1' }],
    })
    const names = new Map<string, string>([['people:p1', 'Jane Doe']])
    const rows = buildTodoRows(defaults({ tasks: [task], linkedRecordNames: names }), makeStrings())
    expect(rows[0].subtitle).toBe('Jane Doe')
  })

  it('renders an empty subtitle when there is neither a link nor a deadline', () => {
    const task = makeTask({ id: 't1', deadlineAt: undefined })
    const rows = buildTodoRows(defaults({ tasks: [task] }), makeStrings())
    expect(rows[0].subtitle).toBe('')
  })

  it('formats overdue deadlines as "Overdue <short date>"', () => {
    const task = makeTask({ id: 't1', deadlineAt: '2026-06-08T09:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [task] }), makeStrings())
    expect(rows[0].subtitle).toBe('Overdue Jun 8')
  })
})

describe('buildTodoRows — URL construction (FR-004)', () => {
  it('builds the task URL using identity.workspaceSlug', () => {
    const task = makeTask({ id: 'task_abc', deadlineAt: '2026-06-09T15:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [task] }), makeStrings())
    expect(rows[0].arg).toBe('https://app.attio.com/studio-florian-marin/tasks?command-menu-page=task&id=task_abc')
  })

  it('exposes buildTaskUrl as a pure helper', () => {
    expect(buildTaskUrl('studio', 't1')).toBe('https://app.attio.com/studio/tasks?command-menu-page=task&id=t1')
  })

  it('URL-encodes special characters in slug and id', () => {
    expect(buildTaskUrl('odd slug', 'task/slash')).toBe(
      'https://app.attio.com/odd%20slug/tasks?command-menu-page=task&id=task%2Fslash',
    )
  })
})

describe('buildTodoRows — offline state (NFR-007)', () => {
  it('prepends the offline-prefix row when offline=true', () => {
    const task = makeTask({ id: 't1', deadlineAt: '2026-06-09T15:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [task], offline: true }), makeStrings())
    expect(rows[0]).toMatchObject({
      uid: 'offline',
      title: 'Offline — showing cached data',
      valid: false,
      arg: '',
    })
    expect(rows[1].uid).toBe('task-t1')
  })

  it('keeps the offline prefix even when the empty state fires', () => {
    const rows = buildTodoRows(defaults({ tasks: [], offline: true }), makeStrings())
    expect(rows.map((r) => r.uid)).toEqual(['offline', 'empty'])
  })
})

describe('buildTodoRows — row hygiene', () => {
  it('task rows are selectable; info/offline/empty rows are not', () => {
    const overdue = makeTask({ id: 't1', deadlineAt: '2026-06-08T09:00:00' })
    const todayDated = makeTask({ id: 't2', deadlineAt: '2026-06-09T15:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [overdue, todayDated], offline: true }), makeStrings())
    // Selectable + arg parity is asserted as a single shape — `toEqual` rejects
    // any non-task row that leaked a non-empty `arg`.
    const flat = rows.map((row) => {
      const selectable = row.uid.startsWith('task-')
      return { uid: row.uid, valid: row.valid, argIsEmpty: row.arg === '', selectable }
    })
    expect(flat.every((r) => r.valid === r.selectable)).toBe(true)
    expect(flat.every((r) => r.selectable || r.argIsEmpty)).toBe(true)
  })

  it('falls back to "(no content)" for empty task content', () => {
    const blank = makeTask({ id: 't1', content: '', deadlineAt: '2026-06-09T15:00:00' })
    const rows = buildTodoRows(defaults({ tasks: [blank] }), makeStrings())
    expect(rows[0].title).toBe('(no content)')
  })
})

// Type-checker hint: silence unused-import warning for Identity.
const _identityType: Identity = identity
void _identityType
