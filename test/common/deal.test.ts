/**
 * Story 2.3 — `buildDealRows` unit tests.
 *
 * Coverage targets:
 *   - PAT missing → setup-prompt row
 *   - 0 results → empty row, query echoed when non-empty
 *   - Title = deal name; subtitle = stage · value (Intl-formatted)
 *   - Missing stage or value silently dropped
 *   - mods.cmd.arg = web_url (degraded); subtitle differs based on
 *     `showCmdHint` flag
 *   - Stage extraction handles both `status.title` and `value` shapes
 *   - Value extraction respects currency_code (USD / EUR)
 */
import { describe, expect, it } from 'vitest'
import type { RecordItem } from '../../src/common/attio/schemas'
import { type DealInputs, buildDealRows, extractStage, extractValue } from '../../src/common/deal'
import { type Strings, createStrings } from '../../src/common/strings'

function makeStrings(): Strings {
  return createStrings({ localeOverride: 'en' })
}

function makeRecord(values: Record<string, unknown>, overrides: Partial<RecordItem> = {}): RecordItem {
  return {
    id: 'rec_default',
    webUrl: 'https://app.attio.com/x/deals/rec_default',
    values,
    createdAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  } as RecordItem
}

function dealValues(opts: {
  name?: string
  stage?: string
  stageNested?: boolean
  amount?: number
  currency?: string
}) {
  const v: Record<string, unknown> = {}
  if (opts.name !== undefined) v.name = [{ value: opts.name }]
  if (opts.stage !== undefined) {
    v.stage = opts.stageNested === false ? [{ value: opts.stage }] : [{ status: { title: opts.stage } }]
  }
  if (opts.amount !== undefined) {
    v.value = [{ currency_value: opts.amount, currency_code: opts.currency ?? 'USD' }]
  }
  return v
}

function defaults(overrides: Partial<DealInputs> = {}): DealInputs {
  return {
    identity: undefined,
    records: [],
    query: '',
    patPresent: true,
    showCmdHint: false,
    ...overrides,
  }
}

describe('buildDealRows — setup branch', () => {
  it('returns the setup row when no PAT is configured', () => {
    const rows = buildDealRows(defaults({ patPresent: false }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'setup',
      title: 'Attio API token not configured',
      valid: true,
      arg: 'https://github.com/flomarin88/alfred-attio-workflow#setup',
    })
  })
})

describe('buildDealRows — empty results', () => {
  it('echoes the query in the subtitle when non-empty', () => {
    const rows = buildDealRows(defaults({ records: [], query: 'acme' }), makeStrings())
    expect(rows[0]).toMatchObject({
      uid: 'empty',
      title: 'No deals found',
      subtitle: 'Query: acme',
      valid: false,
      arg: '',
    })
  })

  it('omits the query from the subtitle when empty (recently-updated path)', () => {
    const rows = buildDealRows(defaults({ records: [], query: '' }), makeStrings())
    expect(rows[0].subtitle).toBe('')
  })
})

describe('buildDealRows — subtitle (stage · value)', () => {
  it('joins stage and value', () => {
    const record = makeRecord(dealValues({ name: 'Acme expansion', stage: 'Discovery', amount: 50000 }))
    const rows = buildDealRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].title).toBe('Acme expansion')
    expect(rows[0].subtitle).toBe('Discovery · $50,000')
  })

  it('renders only the stage when value is missing', () => {
    const record = makeRecord(dealValues({ name: 'No-value deal', stage: 'Discovery' }))
    const rows = buildDealRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('Discovery')
  })

  it('renders only the value when stage is missing', () => {
    const record = makeRecord(dealValues({ name: 'No-stage deal', amount: 1000 }))
    const rows = buildDealRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('$1,000')
  })

  it('renders an empty subtitle when both are missing', () => {
    const record = makeRecord(dealValues({ name: 'Bare deal' }))
    const rows = buildDealRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('')
  })

  it('formats EUR currency correctly', () => {
    const record = makeRecord(dealValues({ name: 'EU deal', amount: 10000, currency: 'EUR' }))
    const rows = buildDealRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toContain('€')
  })
})

describe('buildDealRows — ⏎ + ⌘⏎ (web_url + cmd hint)', () => {
  const baseRecord = makeRecord(dealValues({ name: 'Acme', stage: 'Discovery', amount: 50000 }), {
    id: 'rec_acme',
    webUrl: 'https://app.attio.com/x/deals/rec_acme',
  })

  it('arg = web_url; mods.cmd.arg = web_url (degraded)', () => {
    const rows = buildDealRows(defaults({ records: [baseRecord] }), makeStrings())
    expect(rows[0].arg).toBe('https://app.attio.com/x/deals/rec_acme')
    expect(rows[0].mods?.cmd?.arg).toBe('https://app.attio.com/x/deals/rec_acme')
  })

  it('mods.cmd.subtitle = silent fallback when showCmdHint is false', () => {
    const rows = buildDealRows(defaults({ records: [baseRecord] }), makeStrings())
    expect(rows[0].mods?.cmd?.subtitle).toBe('Open in Attio (deals have no external link)')
  })

  it('mods.cmd.subtitle = hint when showCmdHint is true', () => {
    const rows = buildDealRows(defaults({ records: [baseRecord], showCmdHint: true }), makeStrings())
    expect(rows[0].mods?.cmd?.subtitle).toMatch(/last reminder/)
  })
})

describe('extract helpers', () => {
  it('extractStage reads `status.title` (status-type attribute)', () => {
    const record = makeRecord(dealValues({ name: 'X', stage: 'Discovery' }))
    expect(extractStage(record)).toBe('Discovery')
  })

  it('extractStage falls back to `value` when no nested status', () => {
    const record = makeRecord(dealValues({ name: 'X', stage: 'Discovery', stageNested: false }))
    expect(extractStage(record)).toBe('Discovery')
  })

  it('extractStage returns undefined when no stage', () => {
    const record = makeRecord(dealValues({ name: 'X' }))
    expect(extractStage(record)).toBeUndefined()
  })

  it('extractValue formats numbers with currency', () => {
    const record = makeRecord(dealValues({ name: 'X', amount: 1234, currency: 'USD' }))
    expect(extractValue(record)).toBe('$1,234')
  })

  it('extractValue returns undefined when no amount', () => {
    const record = makeRecord(dealValues({ name: 'X' }))
    expect(extractValue(record)).toBeUndefined()
  })

  it('extractValue defaults to USD when no currency_code', () => {
    const record = makeRecord({ name: [{ value: 'X' }], value: [{ currency_value: 100 }] })
    expect(extractValue(record)).toBe('$100')
  })
})

describe('buildDealRows — lifecycle subtitle suffix (Story 2.5 / FR-033)', () => {
  it('appends lifecycle value after stage and amount when slug is set (status)', () => {
    const record = makeRecord({
      ...dealValues({ name: 'Acme expansion', stage: 'Discovery', amount: 50000 }),
      lifecycle_stage: [{ status: { title: 'Won' } }],
    })
    const rows = buildDealRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('Discovery · $50,000 · Won')
  })

  it('appends lifecycle value when only stage is present', () => {
    const record = makeRecord({
      ...dealValues({ name: 'X', stage: 'Discovery' }),
      lifecycle_stage: [{ option: { title: 'Active' } }],
    })
    const rows = buildDealRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('Discovery · Active')
  })

  it('uses FR-013 default (no trailing segment) when lifecycleSlug is undefined', () => {
    const record = makeRecord({
      ...dealValues({ name: 'X', stage: 'Discovery', amount: 1000 }),
      lifecycle_stage: [{ status: { title: 'Won' } }],
    })
    const rows = buildDealRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('Discovery · $1,000')
  })

  it('uses FR-013 default when slug is set but the record has no value for it', () => {
    const record = makeRecord(dealValues({ name: 'X', stage: 'Discovery', amount: 1000 }))
    const rows = buildDealRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('Discovery · $1,000')
  })
})
