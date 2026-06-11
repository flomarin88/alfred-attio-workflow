/**
 * Story 2.1 — `buildPersonRows` unit tests.
 *
 * Coverage targets (per AC):
 *   - PAT missing → single setup-prompt row pointing at the README
 *   - 0 results → search.empty.people row, with `Query: …` subtitle when set
 *   - Person rows: title = primary name, subtitle = job_title · company_name
 *     in order; missing pieces silently dropped (FR-013)
 *   - `arg` = web_url (FR-014)
 *   - mods.cmd.arg = LinkedIn URL when present (FR-015)
 *   - mods.cmd.arg = web_url when LinkedIn absent; subtitle differs based
 *     on the `showLinkedInHint` flag
 *   - hasMissingLinkedIn helper detects records lacking LinkedIn
 */
import { describe, expect, it } from 'vitest'
import type { RecordItem } from '../../src/common/attio/schemas'
import {
  type PersonInputs,
  buildPersonRows,
  extractLastUpdated,
  extractPrimaryEmail,
  extractPrimaryPhone,
  hasMissingLinkedIn,
} from '../../src/common/person'
import { type Strings, createStrings } from '../../src/common/strings'

function makeStrings(): Strings {
  return createStrings({ localeOverride: 'en' })
}

function makeRecord(overrides: Partial<RecordItem> & { values?: Record<string, unknown> } = {}): RecordItem {
  return {
    id: 'rec_default',
    webUrl: 'https://app.attio.com/x/people/rec_default',
    values: {},
    createdAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  } as RecordItem
}

function personValues(opts: { name?: string; jobTitle?: string; linkedinUrl?: string; companyId?: string }) {
  const values: Record<string, unknown> = {}
  if (opts.name !== undefined) values.name = [{ full_name: opts.name }]
  if (opts.jobTitle !== undefined) values.job_title = [{ value: opts.jobTitle }]
  if (opts.linkedinUrl !== undefined) values.linkedin = [{ value: opts.linkedinUrl }]
  if (opts.companyId !== undefined) values.company = [{ target_record_id: opts.companyId }]
  return values
}

function defaults(overrides: Partial<PersonInputs> = {}): PersonInputs {
  return {
    identity: undefined,
    records: [],
    companyNames: new Map(),
    query: '',
    patPresent: true,
    showLinkedInHint: false,
    ...overrides,
  }
}

describe('buildPersonRows — setup branch', () => {
  it('returns the setup row when no PAT is configured', () => {
    const rows = buildPersonRows(defaults({ patPresent: false }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'setup',
      title: 'Attio API token not configured',
      valid: true,
      arg: 'https://github.com/flomarin88/alfred-attio-workflow#setup',
    })
  })
})

describe('buildPersonRows — empty results', () => {
  it('shows the empty-state row with the query in the subtitle', () => {
    const rows = buildPersonRows(defaults({ records: [], query: 'jane' }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'empty',
      title: 'No people found',
      subtitle: 'Query: jane',
      valid: false,
      arg: '',
    })
  })

  it('renders an empty subtitle when the query was empty (recently-updated path)', () => {
    const rows = buildPersonRows(defaults({ records: [], query: '' }), makeStrings())
    expect(rows[0]).toMatchObject({ uid: 'empty', title: 'No people found', subtitle: '' })
  })
})

describe('buildPersonRows — person rows', () => {
  const baseRecord = makeRecord({
    id: 'rec_jane',
    webUrl: 'https://app.attio.com/x/people/rec_jane',
    values: personValues({
      name: 'Jane Doe',
      jobTitle: 'Head of Sales',
      linkedinUrl: 'https://linkedin.com/in/jane',
      companyId: 'comp_acme',
    }),
  })

  it('title = primary name; subtitle = job_title · company_name', () => {
    const names = new Map<string, string>([['comp_acme', 'Acme Inc.']])
    const rows = buildPersonRows(defaults({ records: [baseRecord], companyNames: names }), makeStrings())
    expect(rows[0]).toMatchObject({
      uid: 'person-rec_jane',
      title: 'Jane Doe',
      subtitle: 'Head of Sales · Acme Inc.',
      valid: true,
      arg: 'https://app.attio.com/x/people/rec_jane',
      icon: 'person',
    })
  })

  it('omits missing pieces (no job title)', () => {
    const record = makeRecord({
      id: 'r1',
      webUrl: 'https://app.attio.com/x/people/r1',
      values: personValues({ name: 'Jane', linkedinUrl: 'https://l.in/j', companyId: 'c1' }),
    })
    const rows = buildPersonRows(
      defaults({ records: [record], companyNames: new Map([['c1', 'Acme']]) }),
      makeStrings(),
    )
    expect(rows[0].subtitle).toBe('Acme')
  })

  it('omits missing pieces (no company)', () => {
    const record = makeRecord({
      id: 'r1',
      values: personValues({ name: 'Jane', jobTitle: 'CTO' }),
    })
    const rows = buildPersonRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('CTO')
  })

  it('falls back to "(no name)" when name is missing', () => {
    const record = makeRecord({ id: 'r1', values: personValues({}) })
    const rows = buildPersonRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].title).toBe('(no name)')
  })
})

describe('buildPersonRows — ⌘⏎ LinkedIn mod (FR-015)', () => {
  it('mods.cmd.arg = LinkedIn URL when present', () => {
    const record = makeRecord({
      id: 'r1',
      webUrl: 'https://app.attio.com/x/people/r1',
      values: personValues({ name: 'Jane', linkedinUrl: 'https://linkedin.com/in/jane' }),
    })
    const rows = buildPersonRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].mods?.cmd).toEqual({
      arg: 'https://linkedin.com/in/jane',
      valid: true,
      subtitle: 'Open LinkedIn profile',
    })
  })

  it('mods.cmd.arg falls back to web_url + silent subtitle when LinkedIn absent and hint dismissed', () => {
    const record = makeRecord({
      id: 'r1',
      webUrl: 'https://app.attio.com/x/people/r1',
      values: personValues({ name: 'Jane' }),
    })
    const rows = buildPersonRows(defaults({ records: [record], showLinkedInHint: false }), makeStrings())
    expect(rows[0].mods?.cmd).toEqual({
      arg: 'https://app.attio.com/x/people/r1',
      valid: true,
      subtitle: 'Open in Attio (no LinkedIn)',
    })
  })

  it('mods.cmd.subtitle surfaces the one-time hint when showLinkedInHint=true', () => {
    const record = makeRecord({
      id: 'r1',
      webUrl: 'https://app.attio.com/x/people/r1',
      values: personValues({ name: 'Jane' }),
    })
    const rows = buildPersonRows(defaults({ records: [record], showLinkedInHint: true }), makeStrings())
    expect(rows[0].mods?.cmd?.subtitle).toMatch(/last reminder/)
    // arg still degrades to web_url even with the hint
    expect(rows[0].mods?.cmd?.arg).toBe('https://app.attio.com/x/people/r1')
  })

  it('does not show the hint subtitle on rows that DO have a LinkedIn URL', () => {
    const withLinkedIn = makeRecord({
      id: 'r1',
      values: personValues({ name: 'A', linkedinUrl: 'https://l/a' }),
    })
    const withoutLinkedIn = makeRecord({
      id: 'r2',
      webUrl: 'https://app.attio.com/x/people/r2',
      values: personValues({ name: 'B' }),
    })
    const rows = buildPersonRows(
      defaults({ records: [withLinkedIn, withoutLinkedIn], showLinkedInHint: true }),
      makeStrings(),
    )
    expect(rows[0].mods?.cmd?.subtitle).toBe('Open LinkedIn profile')
    expect(rows[1].mods?.cmd?.subtitle).toMatch(/last reminder/)
  })
})

describe('buildPersonRows — lifecycle subtitle suffix (Story 2.5 / FR-033)', () => {
  function recordWithLifecycle(opts: { name: string; jobTitle?: string; lifecycle?: unknown }): RecordItem {
    const values: Record<string, unknown> = {
      name: [{ full_name: opts.name }],
    }
    if (opts.jobTitle) values.job_title = [{ value: opts.jobTitle }]
    if (opts.lifecycle !== undefined) values.lifecycle_stage = opts.lifecycle
    return makeRecord({
      id: 'rec_x',
      webUrl: 'https://app.attio.com/x/people/rec_x',
      values,
    })
  }

  it('appends lifecycle value to subtitle when slug is set and value exists (status type)', () => {
    const record = recordWithLifecycle({
      name: 'Jane',
      jobTitle: 'CTO',
      lifecycle: [{ status: { title: 'Customer' } }],
    })
    const rows = buildPersonRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('CTO · Customer')
  })

  it('appends after company too — full FR-013 + lifecycle layout', () => {
    const record = makeRecord({
      id: 'rec_x',
      webUrl: 'https://app.attio.com/x/people/rec_x',
      values: {
        name: [{ full_name: 'Jane' }],
        job_title: [{ value: 'CTO' }],
        company: [{ target_record_id: 'c1' }],
        lifecycle_stage: [{ status: { title: 'Customer' } }],
      },
    })
    const names = new Map<string, string>([['c1', 'Acme Inc.']])
    const rows = buildPersonRows(
      defaults({ records: [record], companyNames: names, lifecycleSlug: 'lifecycle_stage' }),
      makeStrings(),
    )
    expect(rows[0].subtitle).toBe('CTO · Acme Inc. · Customer')
  })

  it('uses FR-013 default (no trailing segment) when lifecycleSlug is undefined (empty config)', () => {
    const record = recordWithLifecycle({
      name: 'Jane',
      jobTitle: 'CTO',
      lifecycle: [{ status: { title: 'Customer' } }],
    })
    const rows = buildPersonRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('CTO')
  })

  it('uses FR-013 default when slug is set but record has no value for it (missing-on-record)', () => {
    const record = recordWithLifecycle({ name: 'Jane', jobTitle: 'CTO' })
    const rows = buildPersonRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('CTO')
  })
})

describe('buildPersonRows — mods.alt note-add (Story 4.2)', () => {
  const baseRecord = makeRecord({
    id: 'rec_jane',
    webUrl: 'https://app.attio.com/x/people/rec_jane',
    values: personValues({ name: 'Jane Doe' }),
  })

  it('sets mods.alt.arg = JSON payload with slug=people, id, content=query, recordName', () => {
    const rows = buildPersonRows(defaults({ records: [baseRecord], query: 'florian followed up' }), makeStrings())
    expect(rows[0].mods?.alt).toBeDefined()
    const payload = JSON.parse(rows[0].mods!.alt!.arg) as Record<string, unknown>
    expect(payload).toEqual({
      slug: 'people',
      id: 'rec_jane',
      content: 'florian followed up',
      recordName: 'Jane Doe',
    })
    expect(rows[0].mods!.alt!.subtitle).toBe('⌥⏎ Add note from query')
  })

  it('omits mods.alt entirely when query is empty', () => {
    const rows = buildPersonRows(defaults({ records: [baseRecord], query: '' }), makeStrings())
    expect(rows[0].mods?.alt).toBeUndefined()
  })

  it('omits mods.alt when query is whitespace-only', () => {
    const rows = buildPersonRows(defaults({ records: [baseRecord], query: '   ' }), makeStrings())
    expect(rows[0].mods?.alt).toBeUndefined()
  })

  it('does NOT set mods.alt on setup or empty rows', () => {
    const setupRows = buildPersonRows(defaults({ patPresent: false, query: 'something' }), makeStrings())
    expect(setupRows[0].mods?.alt).toBeUndefined()
    const emptyRows = buildPersonRows(defaults({ records: [], query: 'jane' }), makeStrings())
    expect(emptyRows[0].mods?.alt).toBeUndefined()
  })
})

describe('hasMissingLinkedIn', () => {
  it('returns true when at least one record lacks a LinkedIn URL', () => {
    const a = makeRecord({ values: personValues({ name: 'A', linkedinUrl: 'https://l/a' }) })
    const b = makeRecord({ values: personValues({ name: 'B' }) })
    expect(hasMissingLinkedIn([a, b])).toBe(true)
  })

  it('returns false when every record has a LinkedIn URL', () => {
    const a = makeRecord({ values: personValues({ name: 'A', linkedinUrl: 'https://l/a' }) })
    expect(hasMissingLinkedIn([a])).toBe(false)
  })

  it('returns false on an empty list', () => {
    expect(hasMissingLinkedIn([])).toBe(false)
  })
})

describe('extractPrimaryEmail (Story 3.2)', () => {
  it('reads email_addresses[0].email_address', () => {
    const record = makeRecord({ values: { email_addresses: [{ email_address: 'jane@acme.com' }] } })
    expect(extractPrimaryEmail(record)).toBe('jane@acme.com')
  })

  it('falls back to email_addresses[0].value (legacy shape)', () => {
    const record = makeRecord({ values: { email_addresses: [{ value: 'jane@acme.com' }] } })
    expect(extractPrimaryEmail(record)).toBe('jane@acme.com')
  })

  it('returns undefined when no email_addresses entry', () => {
    expect(extractPrimaryEmail(makeRecord({ values: {} }))).toBeUndefined()
  })

  it('returns undefined when email_addresses is empty', () => {
    expect(extractPrimaryEmail(makeRecord({ values: { email_addresses: [] } }))).toBeUndefined()
  })
})

describe('extractPrimaryPhone (Story 3.2)', () => {
  it('reads phone_numbers[0].phone_number', () => {
    const record = makeRecord({ values: { phone_numbers: [{ phone_number: '+33 6 12 34 56 78' }] } })
    expect(extractPrimaryPhone(record)).toBe('+33 6 12 34 56 78')
  })

  it('falls back to phone_numbers[0].value (legacy shape)', () => {
    const record = makeRecord({ values: { phone_numbers: [{ value: '+33 6 12 34 56 78' }] } })
    expect(extractPrimaryPhone(record)).toBe('+33 6 12 34 56 78')
  })

  it('returns undefined when no phone_numbers entry', () => {
    expect(extractPrimaryPhone(makeRecord({ values: {} }))).toBeUndefined()
  })
})

describe('extractLastUpdated (Story 3.2)', () => {
  it('prefers the envelope updatedAt', () => {
    const record = makeRecord({ updatedAt: '2026-06-09T08:00:00Z' } as Partial<RecordItem>)
    expect(extractLastUpdated(record)).toBe('2026-06-09T08:00:00Z')
  })

  it('falls back to values.last_setting_action_at[0].value when envelope is empty', () => {
    const record = makeRecord({
      values: { last_setting_action_at: [{ value: '2026-06-08T10:30:00Z' }] },
    })
    expect(extractLastUpdated(record)).toBe('2026-06-08T10:30:00Z')
  })

  it('returns undefined when neither is present', () => {
    expect(extractLastUpdated(makeRecord({ values: {} }))).toBeUndefined()
  })
})
