/**
 * Identity layer — FR-025.
 *
 * Owns three things for Story 1.6:
 *   1. The zod schema for `GET /v2/self` and the camelCase identity type
 *      that the rest of the codebase consumes.
 *   2. The `probeIdentity(token, prober)` helper that runs the injected
 *      prober and parses the response into a typed `Identity` (or surfaces
 *      a `WorkflowError` if the wire shape diverges).
 *   3. Persistence helpers that load / save / clear the four identity
 *      fields against any `ConfigStore` (typically wrapping
 *      `alfredClient.config`).
 *
 * Boundary: identity.ts does not make HTTP calls itself — the AttioClient
 * (Story 1.7) injects the probe function. This keeps `fetch` confined to
 * `client.ts` per the architectural boundary rules.
 */
import { z } from 'zod'
import { type Result, type WorkflowError, err, ok } from '../error'

// ---------------------------------------------------------------------------
// Wire schema + camelCase type
// ---------------------------------------------------------------------------

const IdentityWireSchema = z.object({
  workspace_id: z.string(),
  workspace_slug: z.string(),
  workspace_name: z.string(),
  authorized_by_workspace_member_id: z.string(),
})

export const IdentitySchema = IdentityWireSchema.transform((raw) => ({
  workspaceId: raw.workspace_id,
  workspaceSlug: raw.workspace_slug,
  workspaceName: raw.workspace_name,
  workspaceMemberId: raw.authorized_by_workspace_member_id,
}))

export type Identity = z.infer<typeof IdentitySchema>

// ---------------------------------------------------------------------------
// Prober — injected by the caller (AttioClient in Story 1.7, mock in tests)
// ---------------------------------------------------------------------------

export type IdentityProber = (token: string) => Promise<Result<unknown, WorkflowError>>

// ---------------------------------------------------------------------------
// ConfigStore — minimal interface mirroring `alfredClient.config` (Conf API)
// ---------------------------------------------------------------------------

export interface ConfigStore {
  get(key: string): unknown
  set(key: string, value: unknown): void
  delete(key: string): void
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const KEYS = {
  workspaceId: 'identity.workspaceId',
  workspaceSlug: 'identity.workspaceSlug',
  workspaceName: 'identity.workspaceName',
  workspaceMemberId: 'identity.workspaceMemberId',
} as const

export function loadIdentity(config: ConfigStore): Identity | undefined {
  const workspaceId = config.get(KEYS.workspaceId)
  const workspaceSlug = config.get(KEYS.workspaceSlug)
  const workspaceName = config.get(KEYS.workspaceName)
  const workspaceMemberId = config.get(KEYS.workspaceMemberId)

  if (
    typeof workspaceId !== 'string' ||
    typeof workspaceSlug !== 'string' ||
    typeof workspaceName !== 'string' ||
    typeof workspaceMemberId !== 'string'
  ) {
    return undefined
  }

  return { workspaceId, workspaceSlug, workspaceName, workspaceMemberId }
}

export function saveIdentity(config: ConfigStore, identity: Identity): void {
  config.set(KEYS.workspaceId, identity.workspaceId)
  config.set(KEYS.workspaceSlug, identity.workspaceSlug)
  config.set(KEYS.workspaceName, identity.workspaceName)
  config.set(KEYS.workspaceMemberId, identity.workspaceMemberId)
}

export function clearIdentity(config: ConfigStore): void {
  config.delete(KEYS.workspaceId)
  config.delete(KEYS.workspaceSlug)
  config.delete(KEYS.workspaceName)
  config.delete(KEYS.workspaceMemberId)
}

// ---------------------------------------------------------------------------
// probeIdentity — orchestrates the injected prober + zod parse
// ---------------------------------------------------------------------------

export async function probeIdentity(token: string, prober: IdentityProber): Promise<Result<Identity, WorkflowError>> {
  const probed = await prober(token)
  if (!probed.ok) return probed

  const parsed = IdentitySchema.safeParse(probed.data)
  if (!parsed.success) {
    return err<WorkflowError>({
      kind: 'validation',
      httpStatus: 422,
      attioMessage: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    })
  }

  return ok(parsed.data)
}
