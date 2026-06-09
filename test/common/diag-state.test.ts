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
import { clearLastError, readLastError, recordLastError, redactRecordIds } from '../../src/common/diag-state'

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
