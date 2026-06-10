/**
 * Story 3.5 — `renderTaskFiche` unit tests.
 *
 * AC coverage:
 *   - Task content as `display` heading WITHOUT an edit affordance (FR-040)
 *   - Deadline + assignee + linked records as labeled field rows
 *   - Overdue task → "Overdue {date}" via the shared subtitle formatter
 *   - Undated task → deadline row omitted
 *   - Task with no linked records → linked rows omitted
 *   - Snapshot diff stays stable
 */
import { describe, expect, it } from 'vitest'
import { type Strings, createStrings } from '../../src/common/strings'
import { type TaskFicheInput, renderTaskFiche } from '../../src/common/task-fiche'
import { resolveAssigneeRole } from '../../src/common/task-fiche-build'

function makeStrings(locale: 'en' | 'fr' = 'en'): Strings {
  return createStrings({ localeOverride: locale })
}

const BUNDLE_DIR = '/Users/test/Library/Alfred/workflow.bundle'
const FIXED_NOW = new Date('2026-06-10T12:00:00Z')

function defaults(overrides: Partial<TaskFicheInput> = {}): TaskFicheInput {
  return {
    id: 'task_x',
    content: 'Follow up with Jane on the contract',
    deadlineAt: '2026-06-10T15:00:00Z',
    assignee: 'me',
    linkedPersonName: 'Jane Doe',
    linkedDealName: 'Acme expansion',
    linkedCompanyName: 'Acme Inc.',
    ...overrides,
  }
}

describe('renderTaskFiche — header (FR-040 read-only)', () => {
  it('renders task content as the display heading', () => {
    const html = renderTaskFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toContain('<p class="kind">TASK</p>')
    expect(html).toContain('<h1 class="display">Follow up with Jane on the contract</h1>')
  })

  it('does NOT include an edit affordance (no contenteditable, no edit links/buttons)', () => {
    const html = renderTaskFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).not.toMatch(/contenteditable/i)
    expect(html).not.toMatch(/<button[\s>]/i)
    expect(html).not.toMatch(/<input[\s>]/i)
    expect(html).not.toMatch(/<form[\s>]/i)
    // No "edit" affordance markup from DESIGN.md (`→ edit` arrow + accent color).
    expect(html).not.toContain('→ edit')
  })

  it('falls back to "(no content)" when content is empty', () => {
    const html = renderTaskFiche(defaults({ content: '' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toContain('<h1 class="display">(no content)</h1>')
  })
})

describe('renderTaskFiche — deadline row (overdue / today / future / undated)', () => {
  it('renders an overdue deadline with the "Overdue {date}" microcopy', () => {
    const html = renderTaskFiche(defaults({ deadlineAt: '2026-06-08T15:00:00Z' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toMatch(/<dt>Deadline<\/dt><dd>Overdue [A-Z][a-z]+ \d+<\/dd>/)
  })

  it('renders a today deadline as "Today HH:MM"', () => {
    const html = renderTaskFiche(defaults({ deadlineAt: '2026-06-10T15:00:00Z' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toMatch(/<dt>Deadline<\/dt><dd>Today \d{2}:\d{2}<\/dd>/)
  })

  it('renders a future deadline as "{date} {time}"', () => {
    const html = renderTaskFiche(defaults({ deadlineAt: '2026-06-15T09:00:00Z' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toMatch(/<dt>Deadline<\/dt><dd>[A-Z][a-z]+ \d+ \d{2}:\d{2}<\/dd>/)
  })

  it('omits the deadline row entirely when the task is undated', () => {
    const html = renderTaskFiche(defaults({ deadlineAt: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Deadline</dt>')
  })
})

describe('renderTaskFiche — assignee row (no PAT leak, no UUID)', () => {
  it('renders "Me" when assignee is the current user', () => {
    const html = renderTaskFiche(defaults({ assignee: 'me' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toContain('<dt>Assignee</dt><dd>Me</dd>')
  })

  it('renders the "Other workspace member" label when assigned to someone else', () => {
    const html = renderTaskFiche(defaults({ assignee: 'other' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toContain('<dt>Assignee</dt><dd>Other workspace member</dd>')
  })

  it('omits the assignee row when no assignee resolved', () => {
    const html = renderTaskFiche(defaults({ assignee: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Assignee</dt>')
  })

  it('never surfaces a UUID in the assignee row (no listWorkspaceMembers in V1)', () => {
    const html = renderTaskFiche(defaults({ assignee: 'other' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
    expect(html).not.toMatch(UUID_RE)
  })
})

describe('renderTaskFiche — linked records', () => {
  const html = renderTaskFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it.each([
    ['Linked person', 'Jane Doe'],
    ['Linked deal', 'Acme expansion'],
    ['Linked company', 'Acme Inc.'],
  ])('renders dt %s + dd %s', (label, value) => {
    expect(html).toContain(`<dt>${label}</dt><dd>${value}</dd>`)
  })

  it('omits every linked-record row when none are resolved (AC: no linked records)', () => {
    const html = renderTaskFiche(
      defaults({ linkedPersonName: undefined, linkedDealName: undefined, linkedCompanyName: undefined }),
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).not.toContain('<dt>Linked person</dt>')
    expect(html).not.toContain('<dt>Linked deal</dt>')
    expect(html).not.toContain('<dt>Linked company</dt>')
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('—')
  })
})

describe('renderTaskFiche — component contract parity + XSS safety', () => {
  it('is a complete semantic HTML document with the shared shell', () => {
    const html = renderTaskFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<section>')
    expect(html).toContain('<dl>')
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).toMatch(/<\/html>\s*$/)
  })

  it('escapes XSS payloads in task content', () => {
    const html = renderTaskFiche(defaults({ content: '<script>alert(1)</script>' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toMatch(/<h1[^>]*><script/)
  })
})

describe('renderTaskFiche — snapshot (diff stability)', () => {
  it('matches the stored snapshot for a fully-populated task', () => {
    const html = renderTaskFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toMatchSnapshot()
  })

  it('matches the stored snapshot for an overdue undated-style minimal task', () => {
    const html = renderTaskFiche(
      { id: 'task_min', content: 'Bare task' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toMatchSnapshot()
  })
})

describe('resolveAssigneeRole — Story 3.5 helper', () => {
  const IDENTITY = {
    workspaceId: 'wks',
    workspaceSlug: 'wks',
    workspaceName: 'WKS',
    workspaceMemberId: 'me-123',
  }

  it('returns "me" when the current user is among the assignees', () => {
    const task = { assigneeIds: ['me-123', 'other-456'] } as { assigneeIds: string[] }
    expect(resolveAssigneeRole(task as never, IDENTITY)).toBe('me')
  })

  it('returns "other" when assignees are present but not the current user', () => {
    const task = { assigneeIds: ['other-456'] } as { assigneeIds: string[] }
    expect(resolveAssigneeRole(task as never, IDENTITY)).toBe('other')
  })

  it('returns undefined when there are no assignees', () => {
    const task = { assigneeIds: [] } as { assigneeIds: string[] }
    expect(resolveAssigneeRole(task as never, IDENTITY)).toBeUndefined()
  })

  it('returns "other" when no identity is supplied (cannot prove self-assignment)', () => {
    const task = { assigneeIds: ['anyone'] } as { assigneeIds: string[] }
    expect(resolveAssigneeRole(task as never, undefined)).toBe('other')
  })
})
