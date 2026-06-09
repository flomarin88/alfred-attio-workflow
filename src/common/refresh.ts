/**
 * `attio:refresh` orchestrator — Story 1.9.
 *
 * Wipes every cache entry, clears the persisted diag last-error and
 * identity, then re-fetches `/v2/self`, `/v2/objects`, and the attribute
 * list for each discovered object. The Quick Look HTML cache directory
 * is scrubbed last as a best-effort step (failures there do NOT fail
 * the refresh).
 *
 * Pure orchestrator: every collaborator is injected. The keyword script
 * (`src/main/refresh.ts`) supplies the production wiring; unit tests
 * use stubbed clients + in-memory config.
 */
import type { AttioClient } from './attio/client'
import { type ConfigStore, clearIdentity, saveIdentity } from './attio/identity'
import type { Cache } from './cache'
import { clearLastError } from './diag-state'
import { type Result, type WorkflowError, err, ok } from './error'
import { type QuicklookFs, scrubHtmlCache } from './quicklook'

export interface RefreshDeps {
  client: AttioClient
  cache: Cache
  config: ConfigStore
  /**
   * Alfred workflow cache directory (`alfredInfo.cache()`). When
   * undefined the Quick Look scrub step is skipped. Tests can pass any
   * path together with `fs` to assert on the unlink contract.
   */
  htmlCacheDir?: string
  /** Filesystem surface for the Quick Look scrub step. */
  fs?: QuicklookFs
}

export interface RefreshResult {
  /** Distinct workspace objects re-discovered via `/v2/objects`. */
  objectCount: number
  /**
   * Attribute sets re-fetched — one per object whose attributes were
   * successfully re-loaded. Equal to `objectCount` on the happy path.
   */
  attributeSetCount: number
  /** `*.html` files removed from the Quick Look cache directory. */
  htmlFilesDeleted: number
}

/**
 * Drives the full refresh sequence. Returns the first transport /
 * validation error from a re-fetch step verbatim; the Quick Look scrub
 * is always attempted on the success path.
 */
export async function runRefresh(deps: RefreshDeps): Promise<Result<RefreshResult, WorkflowError>> {
  // 1. Wipe caches + persisted state. Identity is cleared deliberately:
  //    if any re-fetch step fails, the next keyword run will re-trigger
  //    auth via `createAuth.assertCurrent` rather than show a stale
  //    workspace name.
  deps.cache.clearAll()
  clearLastError(deps.config)
  clearIdentity(deps.config)

  // 2. Re-fetch identity.
  const identityResult = await deps.client.getSelf()
  if (!identityResult.ok) return identityResult
  saveIdentity(deps.config, identityResult.data)

  // 3. Re-fetch the object list. AttioClient.listObjects writes the
  //    schema cache on success.
  const objectsResult = await deps.client.listObjects()
  if (!objectsResult.ok) return objectsResult
  const objects = objectsResult.data

  // 4. Re-fetch attributes per object.
  let attributeSetCount = 0
  for (const obj of objects) {
    const attrsResult = await deps.client.getObjectAttributes(obj.slug)
    if (!attrsResult.ok) return attrsResult
    attributeSetCount += 1
  }

  // 5. Scrub Quick Look HTML cache (best-effort).
  const htmlFilesDeleted = deps.htmlCacheDir ? await scrubHtmlCache(deps.htmlCacheDir, deps.fs) : 0

  return ok({
    objectCount: objects.length,
    attributeSetCount,
    htmlFilesDeleted,
  })
}

/**
 * Exported re-export so callers that already imported `runRefresh`
 * don't need a second import to satisfy the unused-import lint.
 */
export type { WorkflowError } from './error'

// Convenience: a typed error builder used by the wrapper when the PAT
// is absent at refresh time. Kept here so `src/main/refresh.ts` doesn't
// reach into `error.ts` for an `err({ kind: 'auth-invalid', … })` shape.
export function patMissingError(): Result<RefreshResult, WorkflowError> {
  return err<WorkflowError>({ kind: 'auth-invalid', httpStatus: 401 })
}
