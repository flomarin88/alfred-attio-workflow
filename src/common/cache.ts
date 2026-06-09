/**
 * Cache layer with FR-047 invalidation contract.
 *
 * Architecture §Data Architecture and §Cross-Cutting Concerns: every
 * mutation invalidates the cached record entry and the cached list pages
 * that contained that record. Reads consult the cache before hitting the
 * API client.
 *
 * Story 1.3 keeps `cache.ts` agnostic of `fast-alfred` — the production
 * wiring lives in keyword scripts (Story 1.5 onward) which pass
 * `alfredClient.cache` as the backend. Tests inject an in-memory backend.
 *
 * Boundary rules: `cache.ts` may not import `@common/attio/client` (would
 * create a cycle) and may not perform network calls. See `eslint.config.mjs`.
 */
import {
  CACHE_TTL_COMPANIES_MS,
  CACHE_TTL_DEALS_MS,
  CACHE_TTL_PEOPLE_MS,
  CACHE_TTL_SCHEMA_MS,
  CACHE_TTL_TASKS_MS,
} from './constants'

// ---------------------------------------------------------------------------
// Backend interface — what cache.ts requires from the underlying store.
// `alfredClient.cache` (from fast-alfred) is one implementation; tests use
// an in-memory variant.
// ---------------------------------------------------------------------------

export interface CacheBackend {
  setWithTTL(key: string, value: unknown, opts: { maxAge: number }): void
  get(key: string): unknown
  has(key: string): boolean
  delete(key: string): void
}

// ---------------------------------------------------------------------------
// TTL lookup per object slug. NFR-004.
// ---------------------------------------------------------------------------

const RECORD_TTL_BY_SLUG: Readonly<Record<string, number>> = Object.freeze({
  tasks: CACHE_TTL_TASKS_MS,
  people: CACHE_TTL_PEOPLE_MS,
  companies: CACHE_TTL_COMPANIES_MS,
  deals: CACHE_TTL_DEALS_MS,
})

/**
 * Returns the configured TTL for the given object slug. Unknown slugs
 * fall back to the people TTL (10 min) — a sensible conservative middle
 * ground for any workspace-customized object.
 */
export function ttlForSlug(slug: string): number {
  return RECORD_TTL_BY_SLUG[slug] ?? CACHE_TTL_PEOPLE_MS
}

// ---------------------------------------------------------------------------
// Cache — the public API.
// ---------------------------------------------------------------------------

/**
 * Stable separator for composite keys. The category prefix prevents
 * cross-category collisions per the Story 1.3 acceptance criteria.
 */
const KEY_SEP = ':'

export class Cache {
  constructor(private readonly backend: CacheBackend) {}

  /**
   * Stable key derivation. The first part is the category
   * (`record` | `list` | `schema` | `identity` | `list-index`); the
   * remaining parts disambiguate within the category. Returned strings
   * are pure functions of the inputs.
   */
  key(...parts: string[]): string {
    return parts.join(KEY_SEP)
  }

  // -------------------------------------------------------------------------
  // Record cache.
  // -------------------------------------------------------------------------

  setRecord<T>(slug: string, id: string, value: T): void {
    this.backend.setWithTTL(this.key('record', slug, id), value, { maxAge: ttlForSlug(slug) })
  }

  getRecord<T>(slug: string, id: string): T | undefined {
    return this.backend.get(this.key('record', slug, id)) as T | undefined
  }

  // -------------------------------------------------------------------------
  // List-page cache. The reverse index per (slug, recordId) keeps track
  // of which list pages mention the record, so `invalidateRecord` can
  // clear them in O(N_lists_containing_record) rather than scanning every
  // key in the backend (which `alfredClient.cache` does not expose).
  // -------------------------------------------------------------------------

  setList<T extends { id: string }>(slug: string, queryHash: string, records: T[]): void {
    const listKey = this.key('list', slug, queryHash)
    this.backend.setWithTTL(listKey, records, { maxAge: ttlForSlug(slug) })
    for (const record of records) {
      this.addToListIndex(slug, record.id, listKey)
    }
  }

  getList<T>(slug: string, queryHash: string): T[] | undefined {
    return this.backend.get(this.key('list', slug, queryHash)) as T[] | undefined
  }

  // -------------------------------------------------------------------------
  // Schema cache.
  // -------------------------------------------------------------------------

  setObjects<T>(objects: T): void {
    this.backend.setWithTTL(this.key('schema', 'objects'), objects, { maxAge: CACHE_TTL_SCHEMA_MS })
  }

  getObjects<T>(): T | undefined {
    return this.backend.get(this.key('schema', 'objects')) as T | undefined
  }

  setAttributes<T>(slug: string, attrs: T): void {
    this.backend.setWithTTL(this.key('schema', 'attributes', slug), attrs, { maxAge: CACHE_TTL_SCHEMA_MS })
  }

  getAttributes<T>(slug: string): T | undefined {
    return this.backend.get(this.key('schema', 'attributes', slug)) as T | undefined
  }

  // -------------------------------------------------------------------------
  // Mutation contract — FR-047.
  // -------------------------------------------------------------------------

  /**
   * Invalidates the record entry for `(slug, id)` and any cached list
   * pages that contained that record. The next read repopulates from the
   * API.
   *
   * Safe to call when the record has never been cached: deletes are
   * silent on missing keys.
   */
  invalidateRecord(slug: string, id: string): void {
    // 1. Wipe the record entry itself.
    this.backend.delete(this.key('record', slug, id))

    // 2. Look up list pages that contained this record and wipe them.
    const indexKey = this.key('list-index', slug, id)
    const listKeys = (this.backend.get(indexKey) as string[] | undefined) ?? []
    for (const listKey of listKeys) {
      this.backend.delete(listKey)
    }

    // 3. Clear the reverse-index entry itself.
    this.backend.delete(indexKey)
  }

  // -------------------------------------------------------------------------
  // Internals.
  // -------------------------------------------------------------------------

  private addToListIndex(slug: string, recordId: string, listKey: string): void {
    const indexKey = this.key('list-index', slug, recordId)
    const existing = (this.backend.get(indexKey) as string[] | undefined) ?? []
    if (!existing.includes(listKey)) {
      existing.push(listKey)
      this.backend.setWithTTL(indexKey, existing, { maxAge: ttlForSlug(slug) })
    }
  }
}

/** Convenience factory mirroring the `create*` pattern used elsewhere. */
export function createCache(backend: CacheBackend): Cache {
  return new Cache(backend)
}
