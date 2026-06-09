/**
 * Token validation + identity probe orchestration — FR-024 / FR-025 / FR-026.
 *
 * Story 1.6 — every keyword script's entry calls `auth.assertCurrent()`
 * before any API access. The flow:
 *
 *   1. If no PAT is configured → `err({ kind: 'auth-invalid' })` with no
 *      API call (caller renders the setup prompt).
 *   2. Hash the PAT with SHA-256 in memory and compare to the cached
 *      hash in `alfredClient.config`.
 *   3. Fast path: hash matches AND identity cached → return cached.
 *   4. Hash changed (or no prior hash): wipe identity + all cached
 *      records (so no stale data from the previous workspace bleeds in),
 *      re-probe `/v2/self`, parse via zod, persist identity + new hash.
 *   5. First successful probe (no prior identity cached): fire two
 *      macOS notifications — `Connected to {workspace_name}` (FR-025) and
 *      the non-affiliation disclaimer (UX-DR8).
 *
 * Privacy: the PAT value never reaches the cached config — only the
 * SHA-256 hex digest. The hash itself is treated as opaque diagnostic
 * data and is never logged or echoed to the user.
 */
import { createHash } from 'node:crypto'
import {
  type ConfigStore,
  type Identity,
  type IdentityProber,
  clearIdentity,
  loadIdentity,
  probeIdentity,
  saveIdentity,
} from './attio/identity'
import type { Cache } from './cache'
import { type Result, type WorkflowError, err, ok } from './error'
import type { Notifier } from './notify'
import type { Strings } from './strings'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AuthDeps {
  /** Returns the configured PAT, or undefined if missing. */
  getPat: () => string | undefined
  /** Underlying config store (typically `alfredClient.config`). */
  config: ConfigStore
  /** Cache layer — cleared on token rotation to drop stale workspace data. */
  cache: Cache
  /** Probe function returning the raw `/v2/self` JSON (Story 1.7 wires AttioClient.getSelf). */
  prober: IdentityProber
  /** macOS notifier for FR-025 first-success notifications. */
  notify: Notifier
  /** Strings module for microcopy resolution. */
  strings: Strings
}

export interface Auth {
  assertCurrent(): Promise<Result<Identity, WorkflowError>>
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const HASH_KEY = 'auth.patHash'

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createAuth(deps: AuthDeps): Auth {
  return {
    async assertCurrent() {
      const pat = deps.getPat()
      if (!pat) {
        return err<WorkflowError>({ kind: 'auth-invalid', httpStatus: 401 })
      }

      const currentHash = sha256Hex(pat)
      const cachedHash = deps.config.get(HASH_KEY)
      const cachedIdentity = loadIdentity(deps.config)

      // Fast path: hash matches and identity present → return cached.
      if (cachedHash === currentHash && cachedIdentity) {
        return ok(cachedIdentity)
      }

      // Hash changed → wipe identity + cached records before re-probing.
      if (typeof cachedHash === 'string' && cachedHash !== currentHash) {
        clearIdentity(deps.config)
        deps.cache.clearAll()
      }

      const probed = await probeIdentity(pat, deps.prober)
      if (!probed.ok) return probed

      saveIdentity(deps.config, probed.data)
      deps.config.set(HASH_KEY, currentHash)

      // First successful probe (no prior identity cached) — UX-DR8 + FR-025.
      if (!cachedIdentity) {
        deps.notify.success(deps.strings.t('connection.success', { workspace_name: probed.data.workspaceName }))
        deps.notify.info(deps.strings.t('connection.disclaimer'))
      }

      return ok(probed.data)
    },
  }
}
