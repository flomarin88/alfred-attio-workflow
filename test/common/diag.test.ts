/**
 * Story 1.8 — `diag.ts` unit tests.
 *
 * Coverage targets:
 *   - 7 rows when DIAG_INCLUDE_IDENTITY is true; 6 when false
 *   - Rows 1, 2, 4 show `—` when no identity / no PAT
 *   - Row 3 toggles "Token: configured" vs "Token: missing" without bytes
 *   - Cache ages render in fixed order (tasks · people · companies · deals · schemas)
 *   - formatAge: seconds, minutes, hours, days
 *   - Privacy floor: no PAT bytes, no SHA-256 hash, no raw UUID
 *     in any title or subtitle (snapshot assertion per AC)
 */
import { describe, expect, it } from 'vitest'
import type { Identity } from '../../src/common/attio/identity'
import {
  type DiagInputs,
  buildDiagRows,
  formatAge,
  formatCacheAges,
  formatLifecycleWarnings,
} from '../../src/common/diag'
import { type Strings, createStrings } from '../../src/common/strings'

const SAMPLE_IDENTITY: Identity = {
  workspaceId: 'wks_abc',
  workspaceSlug: 'studio-florian-marin',
  workspaceName: 'Studio Florian Marin',
  workspaceMemberId: '8c910ee4-aaaa-bbbb-cccc-dddddddddddd',
}

function makeStrings(): Strings {
  return createStrings({ localeOverride: 'en' })
}

function defaults(overrides: Partial<DiagInputs> = {}): DiagInputs {
  return {
    identity: undefined,
    patPresent: false,
    cacheAges: {},
    lastError: undefined,
    workflowVersion: '0.1.0',
    includeIdentity: true,
    ...overrides,
  }
}

describe('formatAge', () => {
  it.each([
    [500, '0s'],
    [1_000, '1s'],
    [59_000, '59s'],
    [60_000, '1m'],
    [59 * 60_000, '59m'],
    [60 * 60_000, '1h'],
    [23 * 60 * 60_000, '23h'],
    [24 * 60 * 60_000, '1d'],
    [7 * 24 * 60 * 60_000, '7d'],
  ])('renders %d ms as %s', (ms, expected) => {
    expect(formatAge(ms)).toBe(expected)
  })

  it('renders undefined as a dash', () => {
    expect(formatAge(undefined)).toBe('—')
  })

  it('renders negative ages as a dash (clock skew defensiveness)', () => {
    expect(formatAge(-1000)).toBe('—')
  })
})

describe('formatCacheAges', () => {
  it('renders categories in fixed order: tasks · people · companies · deals · schemas', () => {
    expect(
      formatCacheAges({
        schemas: 24 * 60 * 60_000,
        deals: 8 * 60 * 60_000,
        companies: 60 * 60_000,
        people: 8 * 60_000,
        tasks: 30_000,
      }),
    ).toBe('tasks 30s · people 8m · companies 1h · deals 8h · schemas 1d')
  })

  it('renders missing categories as `—`', () => {
    expect(formatCacheAges({ tasks: 1_000 })).toBe('tasks 1s · people — · companies — · deals — · schemas —')
  })
})

describe('buildDiagRows — row count + skeleton', () => {
  it('emits 7 rows when includeIdentity is true', () => {
    const rows = buildDiagRows(defaults({ includeIdentity: true }), makeStrings())
    expect(rows).toHaveLength(7)
    expect(rows.map((r) => r.uid)).toEqual(['diag-0', 'diag-1', 'diag-2', 'diag-3', 'diag-4', 'diag-5', 'diag-6'])
  })

  it('emits 6 rows when includeIdentity is false (row 2 suppressed)', () => {
    const rows = buildDiagRows(defaults({ includeIdentity: false }), makeStrings())
    expect(rows).toHaveLength(6)
    expect(rows.map((r) => r.uid)).not.toContain('diag-2')
  })

  it('every row is non-actionable (valid: false, arg: "")', () => {
    const rows = buildDiagRows(defaults({ identity: SAMPLE_IDENTITY, patPresent: true }), makeStrings())
    for (const r of rows) {
      expect(r.valid).toBe(false)
      expect(r.arg).toBe('')
    }
  })
})

describe('buildDiagRows — unconfigured workflow', () => {
  it('rows 1, 2, 4 show `—` and row 3 shows "Token: missing"', () => {
    const rows = buildDiagRows(defaults(), makeStrings())
    const byUid = (uid: string) => rows.find((r) => r.uid === uid)!

    expect(byUid('diag-1').title).toBe('Workspace: —')
    expect(byUid('diag-1').subtitle).toBe('—')

    expect(byUid('diag-2').subtitle).toBe('—')

    expect(byUid('diag-3').title).toBe('Token: missing')

    expect(byUid('diag-4').subtitle).toBe('—')
  })
})

describe('buildDiagRows — configured workflow', () => {
  it('row 1 shows workspace name + slug from identity', () => {
    const rows = buildDiagRows(defaults({ identity: SAMPLE_IDENTITY, patPresent: true }), makeStrings())
    const row1 = rows.find((r) => r.uid === 'diag-1')!
    expect(row1.title).toBe('Workspace: Studio Florian Marin')
    expect(row1.subtitle).toBe('slug: studio-florian-marin')
  })

  it('row 2 shows the workspace_member_id when identity is present', () => {
    const rows = buildDiagRows(defaults({ identity: SAMPLE_IDENTITY, patPresent: true }), makeStrings())
    const row2 = rows.find((r) => r.uid === 'diag-2')!
    expect(row2.title).toBe('Me')
    expect(row2.subtitle).toBe(`id: ${SAMPLE_IDENTITY.workspaceMemberId}`)
  })

  it('row 3 shows "Token: configured" without bytes', () => {
    const rows = buildDiagRows(defaults({ patPresent: true }), makeStrings())
    const row3 = rows.find((r) => r.uid === 'diag-3')!
    expect(row3.title).toBe('Token: configured')
    expect(row3.subtitle).toBe('')
  })

  it('row 4 renders all five cache categories', () => {
    const rows = buildDiagRows(
      defaults({
        patPresent: true,
        cacheAges: { tasks: 30_000, people: 5 * 60_000, companies: 60 * 60_000, deals: 10 * 60_000 },
      }),
      makeStrings(),
    )
    const row4 = rows.find((r) => r.uid === 'diag-4')!
    expect(row4.title).toBe('Cache age')
    expect(row4.subtitle).toBe('tasks 30s · people 5m · companies 1h · deals 10m · schemas —')
  })

  it('row 5 surfaces the persisted lastError subtitle verbatim', () => {
    const rows = buildDiagRows(
      defaults({
        patPresent: true,
        lastError: {
          iso: '2026-06-09T10:00:00.000Z',
          httpStatus: 422,
          endpointPattern: 'PATCH /v2/objects/people/records/<redacted>',
        },
      }),
      makeStrings(),
    )
    const row5 = rows.find((r) => r.uid === 'diag-5')!
    expect(row5.subtitle).toBe('2026-06-09T10:00:00.000Z · 422 · PATCH /v2/objects/people/records/<redacted>')
  })

  it('row 5 falls back to `—` when no lastError is persisted', () => {
    const rows = buildDiagRows(defaults({ patPresent: true }), makeStrings())
    expect(rows.find((r) => r.uid === 'diag-5')!.subtitle).toBe('—')
  })

  it('row 5 handles socket-level lastError (no httpStatus)', () => {
    const rows = buildDiagRows(
      defaults({
        patPresent: true,
        lastError: {
          iso: '2026-06-09T10:00:00.000Z',
          endpointPattern: 'GET /v2/self',
        },
      }),
      makeStrings(),
    )
    expect(rows.find((r) => r.uid === 'diag-5')!.subtitle).toBe('2026-06-09T10:00:00.000Z · — · GET /v2/self')
  })

  it('row 6 surfaces the workflow version', () => {
    const rows = buildDiagRows(defaults({ workflowVersion: '1.2.3' }), makeStrings())
    const row6 = rows.find((r) => r.uid === 'diag-6')!
    expect(row6.title).toBe('Workflow version')
    expect(row6.subtitle).toBe('1.2.3')
  })
})

describe('formatLifecycleWarnings — Story 2.5', () => {
  it('returns empty string when no warnings', () => {
    expect(formatLifecycleWarnings(undefined)).toBe('')
    expect(formatLifecycleWarnings({})).toBe('')
  })

  it('renders one entry per object in fixed order person · company · deal', () => {
    expect(formatLifecycleWarnings({ deal: 'd', person: 'p', company: 'c' })).toBe('person: p · company: c · deal: d')
  })

  it('skips missing entries', () => {
    expect(formatLifecycleWarnings({ company: 'tier' })).toBe('company: tier')
  })
})

describe('buildDiagRows — lifecycle warnings (Story 2.5)', () => {
  it('does NOT insert a lifecycle row when warnings are undefined', () => {
    const rows = buildDiagRows(defaults({ patPresent: true }), makeStrings())
    expect(rows.map((r) => r.uid)).not.toContain('diag-lifecycle')
    expect(rows).toHaveLength(7)
  })

  it('does NOT insert a lifecycle row when the warnings object is empty', () => {
    const rows = buildDiagRows(defaults({ patPresent: true, lifecycleWarnings: {} }), makeStrings())
    expect(rows.map((r) => r.uid)).not.toContain('diag-lifecycle')
    expect(rows).toHaveLength(7)
  })

  it('inserts the lifecycle row BEFORE diag-5 when at least one warning exists', () => {
    const rows = buildDiagRows(
      defaults({ patPresent: true, lifecycleWarnings: { person: 'lifecycle_stage' } }),
      makeStrings(),
    )
    expect(rows.map((r) => r.uid)).toEqual([
      'diag-0',
      'diag-1',
      'diag-2',
      'diag-3',
      'diag-4',
      'diag-lifecycle',
      'diag-5',
      'diag-6',
    ])
  })

  it('renders the warning subtitle with all configured objects', () => {
    const rows = buildDiagRows(
      defaults({
        patPresent: true,
        lifecycleWarnings: { person: 'lifecycle_stage', company: 'tier', deal: 'pipeline' },
      }),
      makeStrings(),
    )
    const row = rows.find((r) => r.uid === 'diag-lifecycle')!
    expect(row.title).toBe('Lifecycle slug not found in schema')
    expect(row.subtitle).toBe('person: lifecycle_stage · company: tier · deal: pipeline')
    expect(row.icon).toBe('warning')
  })
})

describe('buildDiagRows — privacy floor (UX-DR9 / NFR-009 / NFR-010)', () => {
  // A long PAT-shaped value the test owns. Asserting it doesn't leak.
  const PAT = 'attio_pat_1234567890abcdefghijklmnopqrstuvwxyz'
  const PAT_HASH = 'a'.repeat(64) // SHA-256 hex shape

  it('no PAT bytes appear in any row when the PAT is "present"', () => {
    const rows = buildDiagRows(
      defaults({
        identity: SAMPLE_IDENTITY,
        patPresent: true,
        cacheAges: { tasks: 30_000 },
        lastError: {
          iso: '2026-06-09T10:00:00.000Z',
          httpStatus: 422,
          endpointPattern: '/v2/objects/people/records/<redacted>',
        },
        workflowVersion: '1.0.0',
      }),
      makeStrings(),
    )
    const serialized = JSON.stringify(rows)
    expect(serialized).not.toContain(PAT)
    expect(serialized).not.toContain(PAT_HASH)
  })

  it('no UUID outside row 2 (workspace_member_id is the only intentional UUID)', () => {
    const rows = buildDiagRows(
      defaults({
        identity: SAMPLE_IDENTITY,
        patPresent: true,
        lastError: {
          iso: '2026-06-09T10:00:00.000Z',
          httpStatus: 404,
          endpointPattern: '/v2/objects/people/records/<redacted>',
        },
      }),
      makeStrings(),
    )
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
    for (const row of rows) {
      if (row.uid === 'diag-2') continue // member_id is the documented exception
      expect(row.title).not.toMatch(UUID_RE)
      expect(row.subtitle).not.toMatch(UUID_RE)
    }
  })

  it('row 3 subtitle is empty — no length hint, no prefix, no hash byte', () => {
    const rows = buildDiagRows(defaults({ patPresent: true }), makeStrings())
    expect(rows.find((r) => r.uid === 'diag-3')!.subtitle).toBe('')
  })
})
