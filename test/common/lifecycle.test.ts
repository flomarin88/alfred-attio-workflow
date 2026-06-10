/**
 * Story 2.5 — `lifecycle.ts` unit tests.
 *
 * Coverage:
 *   - extractLifecycleValue walks status → option → value in order
 *   - Returns undefined for empty slug / missing values / wrong shapes
 *   - lifecycleSlugExists matches by slug
 */
import { describe, expect, it } from 'vitest'
import type { RecordItem } from '../../src/common/attio/schemas'
import { extractLifecycleValue, lifecycleSlugExists } from '../../src/common/lifecycle'

function makeRecord(values: Record<string, unknown>): RecordItem {
  return {
    id: 'rec_x',
    webUrl: 'https://app.attio.com/x/people/rec_x',
    values,
    createdAt: '2026-06-01T00:00:00.000Z',
  } as RecordItem
}

describe('extractLifecycleValue', () => {
  it('returns undefined when slug is undefined', () => {
    const record = makeRecord({ lifecycle_stage: [{ status: { title: 'Lead' } }] })
    expect(extractLifecycleValue(record, undefined)).toBeUndefined()
  })

  it('returns undefined when slug is empty string', () => {
    const record = makeRecord({ lifecycle_stage: [{ status: { title: 'Lead' } }] })
    expect(extractLifecycleValue(record, '')).toBeUndefined()
  })

  it('returns undefined when the record has no value for the slug', () => {
    const record = makeRecord({ name: [{ value: 'Jane' }] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBeUndefined()
  })

  it('returns undefined when the slug array is empty', () => {
    const record = makeRecord({ lifecycle_stage: [] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBeUndefined()
  })

  it('reads status.title (status-type attribute)', () => {
    const record = makeRecord({ lifecycle_stage: [{ status: { title: 'Lead' } }] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBe('Lead')
  })

  it('reads option.title (select-type attribute)', () => {
    const record = makeRecord({ lifecycle_stage: [{ option: { title: 'Customer' } }] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBe('Customer')
  })

  it('reads value as plain string fallback', () => {
    const record = makeRecord({ lifecycle_stage: [{ value: 'Churned' }] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBe('Churned')
  })

  it('prefers status.title over option.title and value', () => {
    const record = makeRecord({
      lifecycle_stage: [{ status: { title: 'Lead' }, option: { title: 'Ignored' }, value: 'AlsoIgnored' }],
    })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBe('Lead')
  })

  it('falls back to status.name when title is missing', () => {
    const record = makeRecord({ lifecycle_stage: [{ status: { name: 'Lead' } }] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBe('Lead')
  })

  it('returns undefined for unknown shape', () => {
    const record = makeRecord({ lifecycle_stage: [{ something_else: 42 }] })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBeUndefined()
  })

  it('treats a non-array slug entry as missing', () => {
    const record = makeRecord({ lifecycle_stage: { status: { title: 'Lead' } } })
    expect(extractLifecycleValue(record, 'lifecycle_stage')).toBeUndefined()
  })
})

describe('lifecycleSlugExists', () => {
  it('returns true when an attribute slug matches', () => {
    const attrs = [{ slug: 'name' }, { slug: 'lifecycle_stage' }, { slug: 'job_title' }]
    expect(lifecycleSlugExists(attrs, 'lifecycle_stage')).toBe(true)
  })

  it('returns false when no attribute matches', () => {
    const attrs = [{ slug: 'name' }, { slug: 'job_title' }]
    expect(lifecycleSlugExists(attrs, 'lifecycle_stage')).toBe(false)
  })

  it('returns false on empty list', () => {
    expect(lifecycleSlugExists([], 'lifecycle_stage')).toBe(false)
  })
})
