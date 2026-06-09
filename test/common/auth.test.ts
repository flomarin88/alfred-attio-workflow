/**
 * Story 1.6 unit tests for `src/common/auth.ts`.
 *
 * Coverage targets:
 *   - Missing PAT → err({ kind: 'auth-invalid' }) without any API call
 *   - Happy path: hash mismatch (first run) → probe + persist + 2 notifs
 *   - Fast path: hash matches AND identity cached → no probe, no notif
 *   - Hash mismatch with prior identity (token rotation) → cache.clearAll
 *     + identity wiped + re-probe + NO first-success notif (not first run)
 *   - The cached config value is the SHA-256 hash, never the raw PAT
 *   - The hash never appears in the notify or logger streams (privacy floor)
 */
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { ConfigStore, Identity, IdentityProber } from '../../src/common/attio/identity'
import { createAuth } from '../../src/common/auth'
import { type CacheBackend, createCache } from '../../src/common/cache'
import { type Result, type WorkflowError, err, ok } from '../../src/common/error'
import type { Notifier } from '../../src/common/notify'
import { createStrings } from '../../src/common/strings'

// ---------------------------------------------------------------------------
// Test fixtures + mocks
// ---------------------------------------------------------------------------

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

const PAT = 'pat_secret_value_42'
const EXPECTED_HASH = createHash('sha256').update(PAT).digest('hex')

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

class MemoryCacheBackend implements CacheBackend {
  readonly store = new Map<string, { value: unknown; expiresAt: number }>()
  setWithTTL(key: string, value: unknown, opts: { maxAge: number }): void {
    this.store.set(key, { value, expiresAt: Date.now() + opts.maxAge })
  }
  get(key: string): unknown {
    return this.store.get(key)?.value
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

function makeNotifier(): { notifier: Notifier; calls: { method: string; message: string }[] } {
  const calls: { method: string; message: string }[] = []
  const notifier: Notifier = {
    success(message) {
      calls.push({ method: 'success', message })
      return ok(undefined)
    },
    error(message) {
      calls.push({ method: 'error', message })
      return ok(undefined)
    },
    info(message) {
      calls.push({ method: 'info', message })
      return ok(undefined)
    },
  }
  return { notifier, calls }
}

function makeStringsWithLogger(): {
  strings: ReturnType<typeof createStrings>
  logs: string[]
} {
  const logs: string[] = []
  const strings = createStrings({
    localeOverride: 'en',
    logger: (msg) => logs.push(msg),
  })
  return { strings, logs }
}

function makeProber(response: Result<unknown, WorkflowError> | (() => Promise<Result<unknown, WorkflowError>>)): {
  prober: IdentityProber
  receivedTokens: string[]
} {
  const receivedTokens: string[] = []
  const prober: IdentityProber = async (token) => {
    receivedTokens.push(token)
    if (typeof response === 'function') return response()
    return response
  }
  return { prober, receivedTokens }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createAuth — missing PAT', () => {
  it('returns err({ kind: "auth-invalid" }) without invoking the prober', async () => {
    const { prober, receivedTokens } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier, calls } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => undefined,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    const result = await auth.assertCurrent()
    expect(result).toEqual({ ok: false, error: { kind: 'auth-invalid', httpStatus: 401 } })
    expect(receivedTokens).toHaveLength(0)
    expect(calls).toHaveLength(0)
  })
})

describe('createAuth — first successful probe', () => {
  it('probes /v2/self, persists identity, persists hash, fires 2 notifications', async () => {
    const { prober, receivedTokens } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier, calls } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => PAT,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    const result = await auth.assertCurrent()
    expect(result).toEqual({ ok: true, data: SAMPLE_IDENTITY })

    // Prober was called with the PAT.
    expect(receivedTokens).toEqual([PAT])

    // Identity persisted.
    expect(config.store.get('identity.workspaceName')).toBe('Studio Florian Marin')

    // Hash persisted — exactly the SHA-256 hex digest, not the PAT.
    expect(config.store.get('auth.patHash')).toBe(EXPECTED_HASH)

    // Two macOS notifications: connection.success then connection.disclaimer.
    expect(calls).toHaveLength(2)
    expect(calls[0]).toEqual({ method: 'success', message: 'Connected to Studio Florian Marin' })
    expect(calls[1].method).toBe('info')
    expect(calls[1].message).toContain('Unofficial workflow for Attio')
  })
})

describe('createAuth — fast path (hash matches + identity cached)', () => {
  it('returns the cached identity without probing or notifying', async () => {
    const { prober, receivedTokens } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier, calls } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()

    // Pre-seed the config with a matching hash and identity.
    config.set('auth.patHash', EXPECTED_HASH)
    config.set('identity.workspaceId', SAMPLE_IDENTITY.workspaceId)
    config.set('identity.workspaceSlug', SAMPLE_IDENTITY.workspaceSlug)
    config.set('identity.workspaceName', SAMPLE_IDENTITY.workspaceName)
    config.set('identity.workspaceMemberId', SAMPLE_IDENTITY.workspaceMemberId)

    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => PAT,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    const result = await auth.assertCurrent()
    expect(result).toEqual({ ok: true, data: SAMPLE_IDENTITY })

    // No probe was made, no notification was fired.
    expect(receivedTokens).toHaveLength(0)
    expect(calls).toHaveLength(0)
  })
})

describe('createAuth — token rotation (hash mismatch with prior identity)', () => {
  it('wipes cache, re-probes, and does NOT fire the first-success notifications', async () => {
    const { prober, receivedTokens } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier, calls } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const backend = new MemoryCacheBackend()
    const cache = createCache(backend)

    // Pre-seed with a STALE hash + prior identity + some cached records.
    const STALE_HASH = createHash('sha256').update('pat_old_token').digest('hex')
    config.set('auth.patHash', STALE_HASH)
    config.set('identity.workspaceId', 'wks_old')
    config.set('identity.workspaceSlug', 'old-slug')
    config.set('identity.workspaceName', 'Old Workspace')
    config.set('identity.workspaceMemberId', 'mem_old')
    cache.setRecord('people', 'rec-stale', { id: 'rec-stale' })

    const auth = createAuth({
      getPat: () => PAT, // the NEW token
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    const result = await auth.assertCurrent()
    expect(result).toEqual({ ok: true, data: SAMPLE_IDENTITY })

    // Re-probed with the new token.
    expect(receivedTokens).toEqual([PAT])

    // Hash was rotated to the new one.
    expect(config.store.get('auth.patHash')).toBe(EXPECTED_HASH)

    // Old identity was replaced with the new one.
    expect(config.store.get('identity.workspaceId')).toBe('wks_abc')

    // Cache was wiped — the stale record is gone.
    expect(cache.getRecord('people', 'rec-stale')).toBeUndefined()
    expect(backend.store.size).toBe(0)

    // NOT first run — no notifications fired (a prior identity existed).
    expect(calls).toHaveLength(0)
  })
})

describe('createAuth — prober failure propagation', () => {
  it('surfaces the prober error verbatim and does not persist anything', async () => {
    const transportErr: WorkflowError = { kind: 'unreachable', cause: 'socket' }
    const { prober } = makeProber(err<WorkflowError>(transportErr))
    const { notifier, calls } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => PAT,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    const result = await auth.assertCurrent()
    expect(result).toEqual({ ok: false, error: transportErr })

    // Nothing was persisted (no partial state on failure).
    expect(config.store.has('auth.patHash')).toBe(false)
    expect(config.store.has('identity.workspaceId')).toBe(false)
    expect(calls).toHaveLength(0)
  })
})

describe('createAuth — privacy floor', () => {
  it('never writes the raw PAT to the config store', async () => {
    const { prober } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => PAT,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    await auth.assertCurrent()

    // Walk every persisted value and assert the raw PAT bytes do not appear.
    for (const [, value] of config.store) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      expect(serialized).not.toContain(PAT)
    }

    // The hash value present in config is exactly the SHA-256 hex digest.
    expect(config.store.get('auth.patHash')).toBe(EXPECTED_HASH)
    expect((config.store.get('auth.patHash') as string).length).toBe(64) // SHA-256 hex
  })

  it('never leaks the PAT hash bytes through notify messages or strings logs', async () => {
    const { prober } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier, calls } = makeNotifier()
    const { strings, logs } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => PAT,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    await auth.assertCurrent()

    // Inspect every outbound message.
    const allMessages = [...calls.map((c) => c.message), ...logs]
    for (const msg of allMessages) {
      expect(msg).not.toContain(EXPECTED_HASH)
      expect(msg).not.toContain(PAT)
    }
  })

  it('does not console.log anywhere during the happy path', async () => {
    const { prober } = makeProber(ok<unknown>(SAMPLE_WIRE))
    const { notifier } = makeNotifier()
    const { strings } = makeStringsWithLogger()
    const config = new MemoryConfig()
    const cache = createCache(new MemoryCacheBackend())

    const auth = createAuth({
      getPat: () => PAT,
      config,
      cache,
      prober,
      notify: notifier,
      strings,
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await auth.assertCurrent()
    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
