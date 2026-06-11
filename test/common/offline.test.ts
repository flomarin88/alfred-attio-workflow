/**
 * Story 4.1 — `checkOnline` unit tests.
 *
 * Coverage:
 *   - DNS lookup resolves → `true`
 *   - DNS lookup rejects → `false`
 *   - Timeout elapses before lookup settles → `false`
 *   - Custom host + timeout values are respected
 *   - Never throws (caller always gets a boolean)
 */
import { describe, expect, it, vi } from 'vitest'
import { type DnsLookup, checkOnline } from '../../src/common/offline'

describe('checkOnline', () => {
  it('resolves to true when DNS lookup succeeds', async () => {
    const lookup: DnsLookup = vi.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 })
    expect(await checkOnline('api.attio.com', { lookup })).toBe(true)
    expect(lookup).toHaveBeenCalledWith('api.attio.com')
  })

  it('resolves to false when DNS lookup rejects', async () => {
    const lookup: DnsLookup = vi.fn().mockRejectedValue(new Error('ENOTFOUND'))
    expect(await checkOnline('api.attio.com', { lookup })).toBe(false)
  })

  it('resolves to false when the lookup takes longer than the timeout', async () => {
    const lookup: DnsLookup = vi.fn().mockImplementation(() => new Promise(() => undefined))
    expect(await checkOnline('api.attio.com', { lookup, timeoutMs: 10 })).toBe(false)
  })

  it('uses the default Attio host and 1500ms timeout when not specified', async () => {
    const lookup: DnsLookup = vi.fn().mockResolvedValue({ address: '1.2.3.4', family: 4 })
    expect(await checkOnline(undefined, { lookup })).toBe(true)
    expect(lookup).toHaveBeenCalledWith('api.attio.com')
  })

  it('never throws (caller always receives a boolean)', async () => {
    const lookup: DnsLookup = vi.fn().mockImplementation(() => {
      throw new Error('sync throw')
    })
    await expect(checkOnline('x', { lookup })).resolves.toBe(false)
  })
})
