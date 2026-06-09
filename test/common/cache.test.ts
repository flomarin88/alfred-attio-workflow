/**
 * Story 1.3 unit tests for `src/common/cache.ts`.
 *
 * Coverage targets:
 *   - Stable key generation across invocations
 *   - No collision between categories (record / list / schema / identity / list-index)
 *   - setRecord / getRecord round-trip with the right TTL per slug
 *   - TTL expiry via vi.useFakeTimers
 *   - setList / getList round-trip
 *   - invalidateRecord clears the record AND any list pages containing it
 *   - invalidateRecord on never-cached record does not throw
 *   - Schema (objects + attributes) round-trip with the 24h TTL
 *   - ttlForSlug picks the per-object NFR-004 values; unknown slug falls back
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cache } from '../../src/common/cache'
import { type CacheBackend, createCache, ttlForSlug } from '../../src/common/cache'
import {
  CACHE_TTL_COMPANIES_MS,
  CACHE_TTL_DEALS_MS,
  CACHE_TTL_PEOPLE_MS,
  CACHE_TTL_SCHEMA_MS,
  CACHE_TTL_TASKS_MS,
} from '../../src/common/constants'

/**
 * In-memory backend. Honors TTL via `Date.now()` so `vi.useFakeTimers`
 * + `vi.advanceTimersByTime` exercise the expiry path.
 */
class MemoryBackend implements CacheBackend {
  /** Exposed for assertions in invalidation tests. */
  readonly store = new Map<string, { value: unknown; expiresAt: number }>()

  setWithTTL(key: string, value: unknown, opts: { maxAge: number }): void {
    this.store.set(key, { value, expiresAt: Date.now() + opts.maxAge })
  }

  get(key: string): unknown {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

describe('cache.key — stable derivation', () => {
  let cache: Cache

  beforeEach(() => {
    cache = createCache(new MemoryBackend())
  })

  it('returns the same string for the same args on every call', () => {
    const a = cache.key('record', 'people', 'abc-123')
    const b = cache.key('record', 'people', 'abc-123')
    const c = cache.key('record', 'people', 'abc-123')
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('never overlaps between categories with otherwise-identical parts', () => {
    const recordKey = cache.key('record', 'people', 'x')
    const listKey = cache.key('list', 'people', 'x')
    const schemaKey = cache.key('schema', 'attributes', 'people')
    const identityKey = cache.key('identity')
    const listIndexKey = cache.key('list-index', 'people', 'x')

    const all = [recordKey, listKey, schemaKey, identityKey, listIndexKey]
    expect(new Set(all).size).toBe(all.length)
  })

  it('handles the 4 canonical key shapes from Architecture', () => {
    expect(cache.key('record', 'people', 'abc-123')).toBe('record:people:abc-123')
    expect(cache.key('list', 'people', 'qhash')).toBe('list:people:qhash')
    expect(cache.key('schema', 'attributes', 'deals')).toBe('schema:attributes:deals')
    expect(cache.key('identity')).toBe('identity')
  })
})

describe('ttlForSlug — NFR-004 mapping', () => {
  it('returns the per-object TTL', () => {
    expect(ttlForSlug('tasks')).toBe(CACHE_TTL_TASKS_MS)
    expect(ttlForSlug('people')).toBe(CACHE_TTL_PEOPLE_MS)
    expect(ttlForSlug('companies')).toBe(CACHE_TTL_COMPANIES_MS)
    expect(ttlForSlug('deals')).toBe(CACHE_TTL_DEALS_MS)
  })

  it('falls back to the people TTL for unknown slugs (workspace-customized objects)', () => {
    expect(ttlForSlug('vendors')).toBe(CACHE_TTL_PEOPLE_MS)
    expect(ttlForSlug('')).toBe(CACHE_TTL_PEOPLE_MS)
  })
})

describe('record cache', () => {
  let backend: MemoryBackend
  let cache: Cache

  beforeEach(() => {
    backend = new MemoryBackend()
    cache = createCache(backend)
  })

  it('setRecord then getRecord round-trips the value', () => {
    cache.setRecord('people', 'rec-1', { id: 'rec-1', name: 'Ada' })
    expect(cache.getRecord<{ id: string; name: string }>('people', 'rec-1')).toEqual({ id: 'rec-1', name: 'Ada' })
  })

  it('getRecord returns undefined for a never-cached key', () => {
    expect(cache.getRecord('people', 'rec-missing')).toBeUndefined()
  })

  it('writes with the slug-specific TTL', () => {
    cache.setRecord('tasks', 'rec-t', { id: 'rec-t' })
    cache.setRecord('companies', 'rec-c', { id: 'rec-c' })
    const taskEntry = backend.store.get('record:tasks:rec-t')
    const companyEntry = backend.store.get('record:companies:rec-c')
    // expiresAt = Date.now() + maxAge — the delta encodes the TTL.
    expect(taskEntry?.expiresAt).toBe(Date.now() + CACHE_TTL_TASKS_MS)
    expect(companyEntry?.expiresAt).toBe(Date.now() + CACHE_TTL_COMPANIES_MS)
  })
})

describe('TTL expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getRecord returns undefined after the TTL window elapses', () => {
    const cache = createCache(new MemoryBackend())
    cache.setRecord('tasks', 'rec-t', { id: 'rec-t', content: 'follow up' })

    // Inside the TTL — still readable.
    vi.advanceTimersByTime(CACHE_TTL_TASKS_MS - 1)
    expect(cache.getRecord('tasks', 'rec-t')).toBeDefined()

    // Past the TTL — gone.
    vi.advanceTimersByTime(2)
    expect(cache.getRecord('tasks', 'rec-t')).toBeUndefined()
  })

  it('schema cache holds for 24h before expiry', () => {
    const cache = createCache(new MemoryBackend())
    cache.setAttributes('deals', [{ slug: 'stage', type: 'select' }])

    vi.advanceTimersByTime(CACHE_TTL_SCHEMA_MS - 1)
    expect(cache.getAttributes('deals')).toBeDefined()

    vi.advanceTimersByTime(2)
    expect(cache.getAttributes('deals')).toBeUndefined()
  })
})

describe('list cache + reverse index', () => {
  let backend: MemoryBackend
  let cache: Cache

  beforeEach(() => {
    backend = new MemoryBackend()
    cache = createCache(backend)
  })

  it('setList then getList round-trips the records', () => {
    const records = [
      { id: 'rec-1', name: 'Ada' },
      { id: 'rec-2', name: 'Linus' },
    ]
    cache.setList('people', 'qhash-recent', records)
    expect(cache.getList<{ id: string; name: string }>('people', 'qhash-recent')).toEqual(records)
  })

  it('maintains a reverse index per (slug, record-id) → list-keys', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-1' }, { id: 'rec-2' }])
    cache.setList('people', 'qhash-b', [{ id: 'rec-2' }])

    const indexRec1 = backend.store.get('list-index:people:rec-1')?.value
    const indexRec2 = backend.store.get('list-index:people:rec-2')?.value
    expect(indexRec1).toEqual(['list:people:qhash-a'])
    expect(indexRec2).toEqual(['list:people:qhash-a', 'list:people:qhash-b'])
  })

  it('does not duplicate list-keys in the reverse index when the same list is written twice', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-1' }])
    cache.setList('people', 'qhash-a', [{ id: 'rec-1' }])
    const index = backend.store.get('list-index:people:rec-1')?.value
    expect(index).toEqual(['list:people:qhash-a'])
  })
})

describe('invalidateRecord — FR-047 contract', () => {
  let backend: MemoryBackend
  let cache: Cache

  beforeEach(() => {
    backend = new MemoryBackend()
    cache = createCache(backend)
  })

  it('clears the cached record entry', () => {
    cache.setRecord('people', 'rec-1', { id: 'rec-1' })
    expect(cache.getRecord('people', 'rec-1')).toBeDefined()

    cache.invalidateRecord('people', 'rec-1')
    expect(cache.getRecord('people', 'rec-1')).toBeUndefined()
  })

  it('clears any cached list page that contained the record', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-1' }, { id: 'rec-2' }])
    cache.setList('people', 'qhash-b', [{ id: 'rec-2' }, { id: 'rec-3' }])

    // Sanity: both list pages cached.
    expect(cache.getList('people', 'qhash-a')).toBeDefined()
    expect(cache.getList('people', 'qhash-b')).toBeDefined()

    // Invalidating rec-1 should wipe qhash-a (contained rec-1) but leave qhash-b alone.
    cache.invalidateRecord('people', 'rec-1')
    expect(cache.getList('people', 'qhash-a')).toBeUndefined()
    expect(cache.getList('people', 'qhash-b')).toBeDefined()
  })

  it('clears multiple list pages when the record appeared in several', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-x' }])
    cache.setList('people', 'qhash-b', [{ id: 'rec-x' }])
    cache.setList('people', 'qhash-c', [{ id: 'rec-x' }])

    cache.invalidateRecord('people', 'rec-x')
    expect(cache.getList('people', 'qhash-a')).toBeUndefined()
    expect(cache.getList('people', 'qhash-b')).toBeUndefined()
    expect(cache.getList('people', 'qhash-c')).toBeUndefined()
  })

  it('clears the reverse-index entry after invalidation', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-1' }])
    expect(backend.has('list-index:people:rec-1')).toBe(true)

    cache.invalidateRecord('people', 'rec-1')
    expect(backend.has('list-index:people:rec-1')).toBe(false)
  })

  it('does not throw when invalidating a never-cached record', () => {
    expect(() => cache.invalidateRecord('people', 'rec-never-seen')).not.toThrow()
  })

  it('does not touch lists for other records', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-1' }])
    cache.setList('people', 'qhash-b', [{ id: 'rec-2' }])

    cache.invalidateRecord('people', 'rec-1')
    expect(cache.getList('people', 'qhash-b')).toBeDefined()
  })

  it('does not touch lists for other slugs', () => {
    cache.setList('people', 'qhash-a', [{ id: 'rec-shared' }])
    cache.setList('companies', 'qhash-a', [{ id: 'rec-shared' }])

    cache.invalidateRecord('people', 'rec-shared')
    expect(cache.getList('people', 'qhash-a')).toBeUndefined()
    expect(cache.getList('companies', 'qhash-a')).toBeDefined()
  })
})

describe('clearAll — token rotation + attio:refresh', () => {
  it('wipes every entry across records, lists, and schemas', () => {
    const backend = new MemoryBackend()
    const cache = createCache(backend)

    cache.setRecord('people', 'rec-1', { id: 'rec-1' })
    cache.setList('deals', 'qhash-x', [{ id: 'd-1' }])
    cache.setObjects(['people', 'deals'])
    cache.setAttributes('deals', [{ slug: 'stage' }])

    expect(backend.store.size).toBeGreaterThan(0)

    cache.clearAll()
    expect(backend.store.size).toBe(0)
  })
})

describe('schema cache', () => {
  let cache: Cache

  beforeEach(() => {
    cache = createCache(new MemoryBackend())
  })

  it('setObjects then getObjects round-trips', () => {
    cache.setObjects(['people', 'companies', 'deals'])
    expect(cache.getObjects<string[]>()).toEqual(['people', 'companies', 'deals'])
  })

  it('setAttributes then getAttributes round-trips per slug', () => {
    cache.setAttributes('deals', [{ slug: 'stage', type: 'select' }])
    cache.setAttributes('people', [{ slug: 'job_title', type: 'text' }])

    expect(cache.getAttributes('deals')).toEqual([{ slug: 'stage', type: 'select' }])
    expect(cache.getAttributes('people')).toEqual([{ slug: 'job_title', type: 'text' }])
  })

  it('keeps attributes for different slugs in separate entries', () => {
    cache.setAttributes('deals', [{ slug: 'stage' }])
    expect(cache.getAttributes('people')).toBeUndefined()
  })
})

describe('lastSetAt — diagnostic timestamps (Story 1.8)', () => {
  let cache: Cache

  beforeEach(() => {
    cache = createCache(new MemoryBackend())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-09T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns undefined when the category has never been touched', () => {
    expect(cache.lastSetAt('tasks')).toBeUndefined()
    expect(cache.lastSetAt('schemas')).toBeUndefined()
  })

  it('setRecord touches the matching slug category', () => {
    cache.setRecord('people', 'rec_1', { id: 'rec_1' })
    expect(cache.lastSetAt('people')).toBe(Date.now())
    expect(cache.lastSetAt('tasks')).toBeUndefined()
  })

  it('setList touches the matching slug category', () => {
    cache.setList('tasks', 'qh', [{ id: 'task_1' }])
    expect(cache.lastSetAt('tasks')).toBe(Date.now())
  })

  it('setObjects touches the schemas category', () => {
    cache.setObjects(['people'])
    expect(cache.lastSetAt('schemas')).toBe(Date.now())
  })

  it('setAttributes touches the schemas category', () => {
    cache.setAttributes('deals', [{ slug: 'stage' }])
    expect(cache.lastSetAt('schemas')).toBe(Date.now())
  })

  it('ignores unknown slugs (no diag category surfaces them)', () => {
    cache.setRecord('lists', 'l_1', { id: 'l_1' })
    expect(cache.lastSetAt('tasks')).toBeUndefined()
    expect(cache.lastSetAt('people')).toBeUndefined()
  })

  it('reflects the most recent set for a category', () => {
    cache.setList('tasks', 'qh1', [{ id: 't1' }])
    const first = cache.lastSetAt('tasks')!
    vi.setSystemTime(new Date('2026-06-09T10:05:00.000Z'))
    cache.setList('tasks', 'qh2', [{ id: 't2' }])
    const second = cache.lastSetAt('tasks')!
    expect(second).toBeGreaterThan(first)
  })

  it('clearAll wipes the last-set markers', () => {
    cache.setList('tasks', 'qh', [{ id: 't1' }])
    expect(cache.lastSetAt('tasks')).toBeDefined()
    cache.clearAll()
    expect(cache.lastSetAt('tasks')).toBeUndefined()
  })
})
