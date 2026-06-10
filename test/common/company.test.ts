/**
 * Story 2.2 — `buildCompanyRows` unit tests.
 *
 * Coverage targets:
 *   - PAT missing → setup-prompt row
 *   - 0 results → empty row, query echoed in subtitle when non-empty
 *   - Title = company name; subtitle = domain (preferred) or location (fallback)
 *   - ⏎ arg = web_url (Attio); ⌘⏎ mods.cmd.arg = website URL (with https:// scheme)
 *   - When no website + no domain, ⌘⏎ degrades silently to the Attio URL
 *   - Location fallback joins locality + region/country
 */
import { describe, expect, it } from 'vitest'
import type { RecordItem } from '../../src/common/attio/schemas'
import {
  type CompanyInputs,
  buildCompanyRows,
  extractDomain,
  extractLocation,
  extractWebsiteUrl,
} from '../../src/common/company'
import { type Strings, createStrings } from '../../src/common/strings'

function makeStrings(): Strings {
  return createStrings({ localeOverride: 'en' })
}

function makeRecord(values: Record<string, unknown>, overrides: Partial<RecordItem> = {}): RecordItem {
  return {
    id: 'rec_default',
    webUrl: 'https://app.attio.com/x/companies/rec_default',
    values,
    createdAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  } as RecordItem
}

function companyValues(opts: {
  name?: string
  domain?: string
  website?: string
  locality?: string
  region?: string
  country?: string
}) {
  const v: Record<string, unknown> = {}
  if (opts.name !== undefined) v.name = [{ value: opts.name }]
  if (opts.domain !== undefined) v.domains = [{ domain: opts.domain }]
  if (opts.website !== undefined) v.website = [{ value: opts.website }]
  const loc: Record<string, unknown> = {}
  if (opts.locality !== undefined) loc.locality = opts.locality
  if (opts.region !== undefined) loc.region = opts.region
  if (opts.country !== undefined) loc.country_code = opts.country
  if (Object.keys(loc).length > 0) v.primary_location = [loc]
  return v
}

function defaults(overrides: Partial<CompanyInputs> = {}): CompanyInputs {
  return {
    identity: undefined,
    records: [],
    query: '',
    patPresent: true,
    ...overrides,
  }
}

describe('buildCompanyRows — setup branch', () => {
  it('returns the setup row when no PAT is configured', () => {
    const rows = buildCompanyRows(defaults({ patPresent: false }), makeStrings())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      uid: 'setup',
      title: 'Attio API token not configured',
      valid: true,
      arg: 'https://github.com/flomarin88/alfred-attio-workflow#setup',
    })
  })
})

describe('buildCompanyRows — empty results', () => {
  it('echoes the query in the subtitle when non-empty', () => {
    const rows = buildCompanyRows(defaults({ records: [], query: 'acme' }), makeStrings())
    expect(rows[0]).toMatchObject({
      uid: 'empty',
      title: 'No companies found',
      subtitle: 'Query: acme',
      valid: false,
      arg: '',
    })
  })

  it('omits the query from the subtitle when empty (recently-updated path)', () => {
    const rows = buildCompanyRows(defaults({ records: [], query: '' }), makeStrings())
    expect(rows[0].subtitle).toBe('')
  })
})

describe('buildCompanyRows — subtitle (domain preferred over location)', () => {
  it('uses the domain when present', () => {
    const record = makeRecord(companyValues({ name: 'Acme', domain: 'acme.com', locality: 'Paris' }))
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('acme.com')
  })

  it('falls back to "{locality}, {country}" when no domain', () => {
    const record = makeRecord(companyValues({ name: 'Acme', locality: 'Paris', country: 'FR' }))
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('Paris, FR')
  })

  it('falls back to just the locality when no country', () => {
    const record = makeRecord(companyValues({ name: 'Acme', locality: 'Paris' }))
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('Paris')
  })

  it('renders an empty subtitle when neither domain nor location is set', () => {
    const record = makeRecord(companyValues({ name: 'Acme' }))
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('')
  })
})

describe('buildCompanyRows — ⏎ + ⌘⏎ (web_url + website)', () => {
  it('arg = web_url; mods.cmd.arg = https://{domain} when only domain is set', () => {
    const record = makeRecord(companyValues({ name: 'Acme', domain: 'acme.com' }), {
      id: 'rec_acme',
      webUrl: 'https://app.attio.com/x/companies/rec_acme',
    })
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].arg).toBe('https://app.attio.com/x/companies/rec_acme')
    expect(rows[0].mods?.cmd).toEqual({
      arg: 'https://acme.com',
      valid: true,
      subtitle: 'Open acme.com',
    })
  })

  it('mods.cmd.arg = explicit website (with scheme preserved)', () => {
    const record = makeRecord(companyValues({ name: 'Acme', website: 'https://www.acme.com' }))
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].mods?.cmd?.arg).toBe('https://www.acme.com')
  })

  it('mods.cmd.arg degrades silently to web_url when neither website nor domain is set', () => {
    const record = makeRecord(companyValues({ name: 'Acme' }), {
      id: 'r1',
      webUrl: 'https://app.attio.com/x/companies/r1',
    })
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].mods?.cmd).toEqual({
      arg: 'https://app.attio.com/x/companies/r1',
      valid: true,
      subtitle: 'Open in Attio (no website on record)',
    })
  })
})

describe('extract helpers', () => {
  it('extractDomain pulls the first domain entry', () => {
    const record = makeRecord(companyValues({ name: 'Acme', domain: 'acme.com' }))
    expect(extractDomain(record)).toBe('acme.com')
  })

  it('extractLocation returns undefined when no primary_location entry', () => {
    const record = makeRecord(companyValues({ name: 'Acme' }))
    expect(extractLocation(record)).toBeUndefined()
  })

  it('extractWebsiteUrl prepends https:// when the explicit website lacks a scheme', () => {
    const record = makeRecord(companyValues({ name: 'Acme', website: 'acme.com' }))
    expect(extractWebsiteUrl(record)).toBe('https://acme.com')
  })

  it('extractWebsiteUrl returns undefined when no domain and no website', () => {
    const record = makeRecord(companyValues({ name: 'Acme' }))
    expect(extractWebsiteUrl(record)).toBeUndefined()
  })
})

describe('buildCompanyRows — lifecycle subtitle suffix (Story 2.5 / FR-033)', () => {
  function recordWithLifecycle(values: Record<string, unknown>): RecordItem {
    return makeRecord({
      ...companyValues({ name: 'Acme', domain: 'acme.com' }),
      ...values,
    })
  }

  it('appends lifecycle value after the domain when slug is set (status type)', () => {
    const record = recordWithLifecycle({ lifecycle_stage: [{ status: { title: 'Customer' } }] })
    const rows = buildCompanyRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('acme.com · Customer')
  })

  it('appends lifecycle value after the location fallback', () => {
    const record = makeRecord({
      ...companyValues({ name: 'Acme', locality: 'Paris', country: 'FR' }),
      lifecycle_stage: [{ value: 'Lead' }],
    })
    const rows = buildCompanyRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('Paris, FR · Lead')
  })

  it('uses FR-013 default (no trailing segment) when lifecycleSlug is undefined', () => {
    const record = recordWithLifecycle({ lifecycle_stage: [{ status: { title: 'Customer' } }] })
    const rows = buildCompanyRows(defaults({ records: [record] }), makeStrings())
    expect(rows[0].subtitle).toBe('acme.com')
  })

  it('uses FR-013 default when slug is set but record has no value for it', () => {
    const record = recordWithLifecycle({})
    const rows = buildCompanyRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('acme.com')
  })

  it('renders lifecycle alone when neither domain nor location is set', () => {
    const record = makeRecord({
      ...companyValues({ name: 'Acme' }),
      lifecycle_stage: [{ value: 'Lead' }],
    })
    const rows = buildCompanyRows(defaults({ records: [record], lifecycleSlug: 'lifecycle_stage' }), makeStrings())
    expect(rows[0].subtitle).toBe('Lead')
  })
})
