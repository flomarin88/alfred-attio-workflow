/**
 * Story 1.6 unit tests for `src/common/attio/identity.ts`.
 *
 * Coverage targets:
 *   - The zod schema accepts a well-formed /v2/self payload and transforms
 *     snake_case → camelCase
 *   - The schema rejects payloads with missing or wrong-typed fields
 *   - load/save/clearIdentity round-trip via a minimal ConfigStore
 *   - loadIdentity returns undefined when any field is missing
 *   - probeIdentity surfaces the prober's WorkflowError verbatim
 *   - probeIdentity returns kind: 'validation' on schema mismatch
 */
import { describe, expect, it } from 'vitest'
import {
  type ConfigStore,
  type Identity,
  type IdentityProber,
  IdentitySchema,
  clearIdentity,
  loadIdentity,
  probeIdentity,
  saveIdentity,
} from '../../../src/common/attio/identity'
import { type Result, type WorkflowError, err, ok } from '../../../src/common/error'

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

const SAMPLE_WIRE = {
  workspace_id: 'wks_abc',
  workspace_slug: 'studio-florian-marin',
  workspace_name: 'Studio Florian Marin',
  authorized_by_workspace_member_id: 'mem_xyz',
}

const SAMPLE_IDENTITY: Identity = {
  workspaceId: 'wks_abc',
  workspaceSlug: 'studio-florian-marin',
  workspaceName: 'Studio Florian Marin',
  workspaceMemberId: 'mem_xyz',
}

describe('IdentitySchema — wire shape parsing', () => {
  it('parses a well-formed /v2/self payload into camelCase', () => {
    const parsed = IdentitySchema.parse(SAMPLE_WIRE)
    expect(parsed).toEqual(SAMPLE_IDENTITY)
  })

  it('rejects missing fields', () => {
    const result = IdentitySchema.safeParse({
      workspace_id: 'x',
      workspace_slug: 'y',
      // missing workspace_name and authorized_by_workspace_member_id
    })
    expect(result.success).toBe(false)
  })

  it('rejects wrong field types', () => {
    const result = IdentitySchema.safeParse({
      ...SAMPLE_WIRE,
      workspace_id: 42, // not a string
    })
    expect(result.success).toBe(false)
  })

  it('ignores extra fields gracefully (forward-compatible)', () => {
    const parsed = IdentitySchema.parse({
      ...SAMPLE_WIRE,
      extra_future_field: 'something',
    })
    expect(parsed).toEqual(SAMPLE_IDENTITY)
  })
})

describe('persistence helpers', () => {
  it('saveIdentity then loadIdentity round-trips', () => {
    const config = new MemoryConfig()
    saveIdentity(config, SAMPLE_IDENTITY)
    expect(loadIdentity(config)).toEqual(SAMPLE_IDENTITY)
  })

  it('loadIdentity returns undefined when no identity is persisted', () => {
    expect(loadIdentity(new MemoryConfig())).toBeUndefined()
  })

  it('loadIdentity returns undefined when any field is missing', () => {
    const config = new MemoryConfig()
    saveIdentity(config, SAMPLE_IDENTITY)
    config.delete('identity.workspaceMemberId')
    expect(loadIdentity(config)).toBeUndefined()
  })

  it('loadIdentity returns undefined when a field has the wrong type', () => {
    const config = new MemoryConfig()
    saveIdentity(config, SAMPLE_IDENTITY)
    config.set('identity.workspaceId', 42)
    expect(loadIdentity(config)).toBeUndefined()
  })

  it('clearIdentity removes every identity field', () => {
    const config = new MemoryConfig()
    saveIdentity(config, SAMPLE_IDENTITY)
    clearIdentity(config)
    expect(loadIdentity(config)).toBeUndefined()
    expect(config.store.has('identity.workspaceId')).toBe(false)
    expect(config.store.has('identity.workspaceSlug')).toBe(false)
    expect(config.store.has('identity.workspaceName')).toBe(false)
    expect(config.store.has('identity.workspaceMemberId')).toBe(false)
  })

  it('persistence keys are namespaced under "identity."', () => {
    const config = new MemoryConfig()
    saveIdentity(config, SAMPLE_IDENTITY)
    for (const key of config.store.keys()) {
      expect(key).toMatch(/^identity\./)
    }
  })
})

describe('probeIdentity — orchestration', () => {
  it('returns the parsed identity on a happy path', async () => {
    const prober: IdentityProber = async () => ok<unknown>(SAMPLE_WIRE)
    const result = await probeIdentity('pat_x', prober)
    expect(result).toEqual({ ok: true, data: SAMPLE_IDENTITY })
  })

  it('surfaces the prober error verbatim on transport failure', async () => {
    const transportErr: WorkflowError = { kind: 'unreachable', cause: 'socket' }
    const prober: IdentityProber = async () => err<WorkflowError>(transportErr)
    const result: Result<Identity, WorkflowError> = await probeIdentity('pat_x', prober)
    expect(result).toEqual({ ok: false, error: transportErr })
  })

  it('returns kind: "validation" with field paths on schema mismatch', async () => {
    const prober: IdentityProber = async () => ok<unknown>({ workspace_id: 42 })
    const result = await probeIdentity('pat_x', prober)
    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: 'validation',
        httpStatus: 422,
        attioMessage: expect.stringContaining('workspace_id'),
      },
    })
  })

  it('forwards the token to the prober', async () => {
    let receivedToken: string | undefined
    const prober: IdentityProber = async (t) => {
      receivedToken = t
      return ok<unknown>(SAMPLE_WIRE)
    }
    await probeIdentity('pat_test_token', prober)
    expect(receivedToken).toBe('pat_test_token')
  })
})
