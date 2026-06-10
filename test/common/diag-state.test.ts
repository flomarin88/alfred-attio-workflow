/**
 * Story 1.8 — `diag-state.ts` unit tests.
 *
 * Coverage:
 *   - redactRecordIds: UUID-v4 patterns → `<redacted>`; slugs untouched
 *   - recordLastError / readLastError round-trip (with + without httpStatus)
 *   - readLastError defensive parsing for missing / corrupted entries
 *   - clearLastError wipes the entry
 *   - Redaction runs at persistence time (raw UUID never reaches storage)
 */
import { describe, expect, it } from 'vitest'
import type { ConfigStore } from '../../src/common/attio/identity'
import {
  clearLastError,
  clearLifecycleMissingSlug,
  readLastError,
  readLifecycleWarnings,
  recordLastError,
  recordLifecycleMissingSlug,
  redactRecordIds,
} from '../../src/common/diag-state'

class MemoryConfig implements ConfigStore {
  readonly store = new Map<string, unknown>()
  get(key: string): unknown {
    return this.store.get(key)
  }
  set(key: string, value: unknown): void {
    this.store.set(key, value)
  }
  delete(key: string): void {
    this.store.delete(key)
  }
}

const UUID = '8c910ee4-aaaa-bbbb-cccc-dddddddddddd'
const OTHER_UUID = '12345678-1234-1234-1234-123456789abc'

describe('redactRecordIds', () => {
  it('replaces a UUID v4 with <redacted>', () => {
    expect(redactRecordIds(`/v2/objects/people/records/${UUID}`)).toBe('/v2/objects/people/records/<redacted>')
  })

  it('replaces every UUID in a multi-segment path', () => {
    const input = `/v2/objects/people/records/${UUID}/tasks/${OTHER_UUID}`
    expect(redactRecordIds(input)).toBe('/v2/objects/people/records/<redacted>/tasks/<redacted>')
  })

  it('leaves slugs and short IDs untouched', () => {
    expect(redactRecordIds('/v2/objects/companies/attributes/email_addresses')).toBe(
      '/v2/objects/companies/attributes/email_addresses',
    )
  })

  it('is idempotent — already-redacted strings pass through', () => {
    const redacted = '/v2/objects/people/records/<redacted>'
    expect(redactRecordIds(redacted)).toBe(redacted)
  })

  it('handles uppercase UUIDs', () => {
    const upper = UUID.toUpperCase()
    expect(redactRecordIds(`/x/${upper}`)).toBe('/x/<redacted>')
  })
})

describe('recordLastError + readLastError', () => {
  it('persists ISO timestamp, httpStatus, and redacted endpoint', () => {
    const config = new MemoryConfig()
    const fixedNow = (): Date => new Date('2026-06-09T10:00:00.000Z')
    recordLastError(config, { endpoint: `/v2/objects/people/records/${UUID}`, httpStatus: 422 }, fixedNow)
    const got = readLastError(config)
    expect(got).toEqual({
      iso: '2026-06-09T10:00:00.000Z',
      httpStatus: 422,
      endpointPattern: '/v2/objects/people/records/<redacted>',
    })
  })

  it('omits httpStatus when the caller did not supply one (socket-level failure)', () => {
    const config = new MemoryConfig()
    recordLastError(config, { endpoint: `/v2/objects/people/records/${UUID}` })
    const got = readLastError(config)
    expect(got).toBeDefined()
    expect(got).not.toHaveProperty('httpStatus')
    expect(got?.endpointPattern).toBe('/v2/objects/people/records/<redacted>')
  })

  it('redacts BEFORE storage — the raw UUID never reaches the config', () => {
    const config = new MemoryConfig()
    recordLastError(config, { endpoint: `/v2/objects/people/records/${UUID}`, httpStatus: 404 })
    const serialized = JSON.stringify([...config.store.entries()])
    expect(serialized).not.toContain(UUID)
    expect(serialized).toContain('<redacted>')
  })

  it('returns undefined when no entry has been written', () => {
    expect(readLastError(new MemoryConfig())).toBeUndefined()
  })

  it('returns undefined when the stored entry is malformed', () => {
    const config = new MemoryConfig()
    config.set('diag.lastError', { iso: 42 }) // wrong type
    expect(readLastError(config)).toBeUndefined()
  })

  it('returns undefined when the stored entry has no endpointPattern', () => {
    const config = new MemoryConfig()
    config.set('diag.lastError', { iso: '2026-06-09T10:00:00.000Z' })
    expect(readLastError(config)).toBeUndefined()
  })

  it('clearLastError removes the entry', () => {
    const config = new MemoryConfig()
    recordLastError(config, { endpoint: '/v2/x', httpStatus: 500 })
    expect(readLastError(config)).toBeDefined()
    clearLastError(config)
    expect(readLastError(config)).toBeUndefined()
  })
})

describe('lifecycle slug warnings — Story 2.5', () => {
  it('returns undefined when no warnings have been written', () => {
    expect(readLifecycleWarnings(new MemoryConfig())).toBeUndefined()
  })

  it('persists a missing-slug warning per object', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'person', 'lifecycle_stage')
    expect(readLifecycleWarnings(config)).toEqual({ person: 'lifecycle_stage' })
  })

  it('accumulates warnings across multiple objects', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'person', 'lifecycle_stage')
    recordLifecycleMissingSlug(config, 'company', 'tier')
    recordLifecycleMissingSlug(config, 'deal', 'stage')
    expect(readLifecycleWarnings(config)).toEqual({
      person: 'lifecycle_stage',
      company: 'tier',
      deal: 'stage',
    })
  })

  it('overwrites the same object with a new slug', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'person', 'old_slug')
    recordLifecycleMissingSlug(config, 'person', 'new_slug')
    expect(readLifecycleWarnings(config)).toEqual({ person: 'new_slug' })
  })

  it('is idempotent — writing the same slug twice leaves a single entry', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'person', 'lifecycle_stage')
    recordLifecycleMissingSlug(config, 'person', 'lifecycle_stage')
    expect(readLifecycleWarnings(config)).toEqual({ person: 'lifecycle_stage' })
  })

  it('clearLifecycleMissingSlug removes one object while preserving the others', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'person', 'a')
    recordLifecycleMissingSlug(config, 'company', 'b')
    clearLifecycleMissingSlug(config, 'person')
    expect(readLifecycleWarnings(config)).toEqual({ company: 'b' })
  })

  it('clearLifecycleMissingSlug deletes the whole entry when no objects remain', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'person', 'a')
    clearLifecycleMissingSlug(config, 'person')
    expect(readLifecycleWarnings(config)).toBeUndefined()
  })

  it('clearLifecycleMissingSlug is a no-op when no warning exists for that object', () => {
    const config = new MemoryConfig()
    recordLifecycleMissingSlug(config, 'company', 'b')
    clearLifecycleMissingSlug(config, 'person')
    expect(readLifecycleWarnings(config)).toEqual({ company: 'b' })
  })

  it('returns undefined for a malformed stored entry', () => {
    const config = new MemoryConfig()
    config.set('diag.lifecycleWarnings', 'not-an-object')
    expect(readLifecycleWarnings(config)).toBeUndefined()
  })

  it('drops non-string entries when reading', () => {
    const config = new MemoryConfig()
    config.set('diag.lifecycleWarnings', { person: 'lifecycle_stage', company: 42 })
    expect(readLifecycleWarnings(config)).toEqual({ person: 'lifecycle_stage' })
  })

  it('returns undefined when stored entry has only empty strings', () => {
    const config = new MemoryConfig()
    config.set('diag.lifecycleWarnings', { person: '' })
    expect(readLifecycleWarnings(config)).toBeUndefined()
  })
})
