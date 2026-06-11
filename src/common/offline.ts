/**
 * Offline preflight — Story 4.1 / NFR-007.
 *
 * Write actions (PATCH `/v2/tasks/{id}`, POST `/v2/notes`) MUST NOT
 * fire when the host is offline. A best-effort DNS lookup against the
 * Attio API host doubles as a connectivity probe: it succeeds quickly
 * when DNS is reachable AND there's at least minimal network plumbing;
 * it errors out fast when the link is down.
 *
 * Boundary-clean: this module owns no other I/O and is dependency-injected
 * for tests (the default uses `node:dns/promises.lookup`).
 */
import { lookup as dnsLookup } from 'node:dns/promises'

/** Subset of `dns.promises.lookup` we depend on. DI'd for tests. */
export type DnsLookup = (hostname: string) => Promise<unknown>

export interface OnlineCheckOptions {
  /** Override for tests. Defaults to `dns/promises.lookup`. */
  lookup?: DnsLookup
  /** Timeout in milliseconds. Defaults to 1500 ms — Inter-keystroke fast. */
  timeoutMs?: number
}

const DEFAULT_HOST = 'api.attio.com'
const DEFAULT_TIMEOUT_MS = 1500

/**
 * Returns `true` when `host` resolves within `timeoutMs`, `false` when
 * the lookup errors out OR the deadline elapses. Never throws — caller
 * always gets a boolean.
 *
 * Defaults: host = `api.attio.com`, timeout = 1500 ms. The DNS cache
 * (resolver / OS) makes repeat calls effectively free.
 */
export async function checkOnline(host: string = DEFAULT_HOST, opts: OnlineCheckOptions = {}): Promise<boolean> {
  const lookup = opts.lookup ?? (dnsLookup as DnsLookup)
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })

  // Wrap `lookup` so a synchronous throw is captured the same as a
  // rejected promise — caller always receives a boolean.
  const lookupPromise = Promise.resolve()
    .then(() => lookup(host))
    .then(
      () => true,
      () => false,
    )

  try {
    return await Promise.race([lookupPromise, timeoutPromise])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
