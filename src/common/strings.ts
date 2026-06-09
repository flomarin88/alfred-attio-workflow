/**
 * Localization helper — FR-037 / FR-038 / FR-039 (i18n) and NFR-012.
 *
 * Story 1.4 — establishes the `t(key, params?)` contract that every
 * UI-rendered string flows through. The keyword scripts (Story 1.5
 * onward) wire `strings.t` calls instead of inlining literals; the
 * boundary rule enforcement comes later via an ESLint custom rule, but
 * the discipline starts now.
 *
 * Locale resolution chain (highest priority first):
 *   1. `LANGUAGE_OVERRIDE` env var (`en` | `fr`) — set via Alfred config sheet.
 *   2. macOS system locale (via `Intl.DateTimeFormat().resolvedOptions().locale`).
 *      A locale tag starting with `fr` resolves to FR; anything else → EN.
 *   3. Default EN.
 *
 * Missing key behavior:
 *   - If the active locale lacks the key, fall back to EN and log one
 *     debug warning via the injected logger.
 *   - If EN also lacks the key, return the key itself as a sentinel
 *     (so dev sees the broken key in the UI rather than an empty row).
 */
import enCatalog from '../strings/en.json'
import frCatalog from '../strings/fr.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = 'en' | 'fr'

export type StringCatalog = Readonly<Record<string, string>>

export interface StringsOptions {
  /** Logger for missing-key warnings. Defaults to a no-op. */
  logger?: (message: string) => void
  /** Force a specific locale, bypassing env + system detection. */
  localeOverride?: Locale
  /** Inject custom catalogs (useful for testing). */
  catalogs?: { en?: StringCatalog; fr?: StringCatalog }
}

// ---------------------------------------------------------------------------
// Locale resolution
// ---------------------------------------------------------------------------

function resolveLocale(opts: StringsOptions): Locale {
  if (opts.localeOverride) return opts.localeOverride

  const envOverride = process.env.LANGUAGE_OVERRIDE?.toLowerCase()
  if (envOverride === 'en' || envOverride === 'fr') return envOverride

  const systemLocale = new Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase()
  if (systemLocale.startsWith('fr')) return 'fr'

  return 'en'
}

// ---------------------------------------------------------------------------
// {name} placeholder substitution
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /\{(\w+)\}/g

function substitute(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(PLACEHOLDER_RE, (match, name: string) => {
    const value = params[name]
    return value !== undefined ? String(value) : match
  })
}

// ---------------------------------------------------------------------------
// Strings — the public API
// ---------------------------------------------------------------------------

const NOOP_LOGGER = (_message: string): void => {
  /* swallow */
}

export class Strings {
  private readonly catalogs: { en: StringCatalog; fr: StringCatalog }
  private readonly logger: (message: string) => void

  /** The resolved locale for this instance. Immutable per process. */
  readonly locale: Locale

  constructor(opts: StringsOptions = {}) {
    this.catalogs = {
      en: opts.catalogs?.en ?? (enCatalog as StringCatalog),
      fr: opts.catalogs?.fr ?? (frCatalog as StringCatalog),
    }
    this.logger = opts.logger ?? NOOP_LOGGER
    this.locale = resolveLocale(opts)
  }

  /**
   * Resolves `key` against the active locale's catalog, substitutes
   * `{name}` placeholders from `params`, and returns the rendered string.
   *
   * Falls back to EN on a missing key (with one debug log) and returns
   * the key itself if EN is also missing (with another debug log).
   */
  t(key: string, params?: Record<string, string | number>): string {
    const fromActive = this.catalogs[this.locale][key]
    if (fromActive !== undefined) {
      return substitute(fromActive, params)
    }

    // Active locale is missing the key. Fall back to EN.
    if (this.locale !== 'en') {
      this.logger(`[strings] missing key '${key}' in '${this.locale}' catalog, falling back to EN`)
    }

    const fromEn = this.catalogs.en[key]
    if (fromEn !== undefined) {
      return substitute(fromEn, params)
    }

    // EN is missing too — return the key as a debug sentinel.
    this.logger(`[strings] missing key '${key}' in EN catalog — returning key as sentinel`)
    return key
  }
}

/** Convenience factory — mirrors the `create*` pattern used by `cache.ts`. */
export function createStrings(opts: StringsOptions = {}): Strings {
  return new Strings(opts)
}
