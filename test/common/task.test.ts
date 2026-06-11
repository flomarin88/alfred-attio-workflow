/**
 * Story 2.4 — `buildTaskRows` unit tests.
 *
 * Coverage targets:
 *   - PAT missing → setup-prompt row
 *   - Empty query → all tasks pass through; cap at 9 (sorted by createdAt desc)
 *   - Non-empty query → client-side substring match on content (case-insensitive)
 *   - 0 results → empty row, query echoed when non-empty
 *   - Subtitle = `{deadline} · {Open|Completed}` (FR-013 — distinct from `todo`)
 *   - ⌘⏎ degrades to web_url; subtitle differs by `showCmdHint` flag
 *   - FR-002 vs FR-013 divergence: the same task renders different
 *     subtitles in todo vs task<q>
 */
import { describe, expect, it } from 'vitest'
import type { Task } from '../../src/common/attio/schemas'
import { type Strings, createStrings } from '../../src/common/strings'
import { type TaskInputs, buildTaskRows } from '../../src/common/task'
import { type TodoInputs, buildTodoRows } from '../../src/common/todo'

const NOW = new Date('2026-06-09T12:00:00')

const SAMPLE_IDENTITY = {
  workspaceId: 'wks_abc',
  workspaceSlug: 'studio-florian-marin',
  workspaceName: 'Studio Florian Marin',
  workspaceMemberId: 'mem_xyz',
}

function makeStrings(): Strings {
  return createStrings({ localeOverride: 'en' })
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't_default',
    content: 'Default task',
    deadlineAt: undefined,
    isCompleted: false,
    assigneeIds: ['mem_xyz'],
    linkedRecords: [],
    createdAt: '2026-06-09T08:00:00',
    ...overrides,
  }
}

function defaults(overrides: Partial<TaskInputs> = {}): TaskInputs {
  return {
    identity: SAMPLE_IDENTITY,
    tasks: [],
    query: '',
    patPresent: true,
    showCmdHint: false,
    now: NOW,
    ...overrides,
  }
}

describe('buildTaskRows — setup branch', () => {
  it('returns the setup row when no PAT is configured', () => {
    const rows = buildTaskRows(defaults({ patPresent: false }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'setup',
      title: 'Attio API token not configured',
      valid: true,
      arg: 'https://github.com/flomarin88/alfred-attio-workflow#setup',
    })
  })
})

describe('buildTaskRows — empty results', () => {
  it('returns the empty-state row when no tasks match', () => {
    const t = makeTask({ id: 't1', content: 'Follow up with Acme' })
    const rows = buildTaskRows(defaults({ tasks: [t], query: 'banana' }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'empty',
      title: 'No tasks found',
      subtitle: 'Query: banana',
    })
  })

  it('omits the query from the subtitle when the query was empty', () => {
    const rows = buildTaskRows(defaults({ tasks: [], query: '' }), makeStrings())
    expect(rows[0].subtitle).toBe('')
  })
})

describe('buildTaskRows — substring filter (FR-012, client-side)', () => {
  const tasks = [
    makeTask({ id: 'a', content: 'Follow up with Acme' }),
    makeTask({ id: 'b', content: 'Send proposal to Beta Corp' }),
    makeTask({ id: 'c', content: 'Acme renewal review' }),
  ]

  it('keeps only tasks whose content contains the query (case-insensitive)', () => {
    const rows = buildTaskRows(defaults({ tasks, query: 'acme' }), makeStrings())
    expect(rows.map((r) => r.uid)).toEqual(['task-a', 'task-c'])
  })

  it('passes through every task when the query is empty', () => {
    const rows = buildTaskRows(defaults({ tasks, query: '' }), makeStrings())
    expect(rows.map((r) => r.uid)).toEqual(['task-a', 'task-b', 'task-c'])
  })

  it('caps at 9 task rows when more match', () => {
    const many: Task[] = Array.from({ length: 12 }, (_, i) =>
      makeTask({
        id: `t-${i}`,
        content: `Acme step ${i}`,
        createdAt: `2026-06-09T${String(i).padStart(2, '0')}:00:00`,
      }),
    )
    const rows = buildTaskRows(defaults({ tasks: many, query: 'acme' }), makeStrings())
    expect(rows).toHaveLength(9)
  })
})

describe('buildTaskRows — subtitle (FR-013: deadline · status)', () => {
  it('renders `Today HH:mm · Open` for an open task due today', () => {
    const t = makeTask({ id: 't1', content: 'X', deadlineAt: '2026-06-09T15:00:00', isCompleted: false })
    const rows = buildTaskRows(defaults({ tasks: [t] }), makeStrings())
    expect(rows[0].subtitle).toBe('Today 15:00 · Open')
  })

  it('renders `Overdue Jun 8 · Completed` for a completed overdue task', () => {
    const t = makeTask({ id: 't1', content: 'X', deadlineAt: '2026-06-08T09:00:00', isCompleted: true })
    const rows = buildTaskRows(defaults({ tasks: [t] }), makeStrings())
    expect(rows[0].subtitle).toBe('Overdue Jun 8 · Completed')
  })

  it('formats future deadlines with date + time', () => {
    const t = makeTask({ id: 't1', content: 'X', deadlineAt: '2026-06-15T09:00:00', isCompleted: false })
    const rows = buildTaskRows(defaults({ tasks: [t] }), makeStrings())
    expect(rows[0].subtitle).toBe('Jun 15 09:00 · Open')
  })

  it('omits the deadline segment when no deadline is set', () => {
    const t = makeTask({ id: 't1', content: 'X', deadlineAt: undefined, isCompleted: true })
    const rows = buildTaskRows(defaults({ tasks: [t] }), makeStrings())
    expect(rows[0].subtitle).toBe('Completed')
  })
})

describe('buildTaskRows — ⏎ + ⌘⏎ (Story 4.1 mark-complete)', () => {
  const baseTask = makeTask({ id: 'rec_t', content: 'X', deadlineAt: '2026-06-09T15:00:00' })

  it('arg = task URL (⏎ still opens in Attio)', () => {
    const rows = buildTaskRows(defaults({ tasks: [baseTask] }), makeStrings())
    expect(rows[0].arg).toBe('https://app.attio.com/studio-florian-marin/tasks?command-menu-page=task&id=rec_t')
  })

  it('mods.cmd.arg = task ID (Story 4.1 — feeds the PATCH worker)', () => {
    const rows = buildTaskRows(defaults({ tasks: [baseTask] }), makeStrings())
    expect(rows[0].mods?.cmd?.arg).toBe('rec_t')
  })

  it('mods.cmd.subtitle = "⌘⏎ Mark task complete" (no fallback hint)', () => {
    const rows = buildTaskRows(defaults({ tasks: [baseTask] }), makeStrings())
    expect(rows[0].mods?.cmd?.subtitle).toBe('⌘⏎ Mark task complete')
  })

  it('ignores the deprecated showCmdHint flag (Story 4.1 supersedes Story 2.4 fallback)', () => {
    const rowsHint = buildTaskRows(defaults({ tasks: [baseTask], showCmdHint: true }), makeStrings())
    const rowsNoHint = buildTaskRows(defaults({ tasks: [baseTask], showCmdHint: false }), makeStrings())
    expect(rowsHint[0].mods?.cmd?.subtitle).toBe(rowsNoHint[0].mods?.cmd?.subtitle)
  })
})

describe('buildTaskRows — FR-002 vs FR-013 divergence with todo', () => {
  it('renders the same task with a deadline+status subtitle (task) vs linked-records subtitle (todo)', () => {
    const linkedTask = makeTask({
      id: 't_with_links',
      content: 'Call Jane at Acme',
      deadlineAt: '2026-06-09T15:00:00',
      isCompleted: false,
      linkedRecords: [
        { targetObject: 'people', targetRecordId: 'p1' },
        { targetObject: 'companies', targetRecordId: 'c1' },
      ],
    })
    const names = new Map<string, string>([
      ['people:p1', 'Jane Doe'],
      ['companies:c1', 'Acme Inc.'],
    ])

    // `task <q>` keyword — FR-013 mapping.
    const taskRows = buildTaskRows(defaults({ tasks: [linkedTask] }), makeStrings())
    expect(taskRows[0].subtitle).toBe('Today 15:00 · Open')

    // `todo` keyword — FR-002 mapping.
    const todoInputs: TodoInputs = {
      identity: SAMPLE_IDENTITY,
      tasks: [linkedTask],
      linkedRecordNames: names,
      patPresent: true,
      now: NOW,
    }
    const todoRows = buildTodoRows(todoInputs, makeStrings())
    expect(todoRows[0].subtitle).toBe('Jane Doe · Acme Inc. · Today 15:00')
  })
})
