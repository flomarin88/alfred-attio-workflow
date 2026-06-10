/**
 * `company` keyword row builder — Story 2.2.
 *
 * Pure functions only. The keyword script (`src/main/company.ts`) fetches
 * the company records, then hands them to `buildCompanyRows`.
 *
 * Behaviors:
 *   - PAT absent      → setup-prompt row pointing at the README.
 *   - 0 records       → `search.empty.companies` microcopy row.
 *   - Each row        → title = company name, subtitle = domain (preferred)
 *                       or location (fallback).
 *   - ⏎              → opens the Attio web URL (`arg`).
 *   - ⌘⏎             → opens the company website (`mods.cmd.arg`);
 *                       degrades silently to the Attio URL when no domain
 *                       is recorded.
 */
import type { Identity } from './attio/identity'
import type { RecordItem } from './attio/schemas'
import { type IconKey, README_SETUP_URL } from './constants'
import { extractLifecycleValue } from './lifecycle'
import type { Strings } from './strings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanyInputs {
  identity?: Identity
  records: RecordItem[]
  query: string
  patPresent: boolean
  /**
   * Slug of the configured lifecycle attribute (FR-033 / Story 2.5). When
   * defined, the value at `record.values[slug]` is appended to the
   * subtitle as `· {lifecycle_value}`. Undefined → domain/location only.
   */
  lifecycleSlug?: string
}

export interface CompanyMod {
  arg: string
  valid: boolean
  subtitle: string
}

export interface CompanyRow {
  uid: string
  title: string
  subtitle: string
  icon: IconKey
  valid: boolean
  arg: string
  mods?: { cmd?: CompanyMod }
  /** Set by the keyword script after the Quick Look fiche is written. */
  quicklookurl?: string
}

// ---------------------------------------------------------------------------
// Value extraction
// ---------------------------------------------------------------------------

function asArray(value: unknown): Array<Record<string, unknown>> | undefined {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : undefined
}

function readString(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

/** Company name — `values.name[0].value`. */
export function extractCompanyName(record: RecordItem): string {
  const arr = asArray((record.values as Record<string, unknown>).name)
  return readString(arr?.[0], 'value', 'full_name') ?? '(no name)'
}

/**
 * Primary domain. Attio companies typically expose `values.domains[]`
 * with `{ domain }` per entry; we pick the first.
 */
export function extractDomain(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).domains)
  return readString(arr?.[0], 'domain', 'value')
}

/**
 * Location — `values.primary_location[0]`. Falls back through locality,
 * region, country fields so workspaces with different attribute setups
 * still produce a usable subtitle.
 */
export function extractLocation(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).primary_location)
  const first = arr?.[0]
  if (!first) return undefined
  const locality = readString(first, 'locality', 'city')
  const region = readString(first, 'region', 'state')
  const country = readString(first, 'country_code', 'country')
  const parts = [locality, region ?? country].filter((v): v is string => Boolean(v))
  return parts.length > 0 ? parts.join(', ') : undefined
}

/**
 * Website URL for the ⌘⏎ mod. Prefers an explicit `website` attribute,
 * then falls back to `https://{domain}`. Returns `undefined` when neither
 * is present.
 */
export function extractWebsiteUrl(record: RecordItem): string | undefined {
  const websiteArr = asArray((record.values as Record<string, unknown>).website)
  const explicit = readString(websiteArr?.[0], 'value')
  if (explicit) return ensureScheme(explicit)
  const domain = extractDomain(record)
  if (domain) return ensureScheme(domain)
  return undefined
}

function ensureScheme(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`
}

/**
 * Industry — `values.categories[0]` (select-style entry with
 * `option.title` / `value`) or the legacy `values.industry[0].value`.
 * Returns `undefined` when neither is present.
 */
export function extractIndustry(record: RecordItem): string | undefined {
  const categoriesArr = asArray((record.values as Record<string, unknown>).categories)
  const firstCat = categoriesArr?.[0]
  if (firstCat) {
    const option = firstCat.option
    if (typeof option === 'object' && option !== null) {
      const title = readString(option as Record<string, unknown>, 'title', 'name')
      if (title) return title
    }
    const direct = readString(firstCat, 'value', 'title', 'name')
    if (direct) return direct
  }
  const industryArr = asArray((record.values as Record<string, unknown>).industry)
  return readString(industryArr?.[0], 'value', 'title', 'name')
}

/**
 * Linked-people count — `values.team` is Attio's canonical "people who
 * work at this company" multi-reference attribute. Returns `undefined`
 * when the attribute is absent so the fiche row can be silently omitted.
 * Empty `team` arrays return `0`, which the caller may choose to show.
 */
export function extractTeamCount(record: RecordItem): number | undefined {
  const arr = asArray((record.values as Record<string, unknown>).team)
  if (arr === undefined) return undefined
  return arr.length
}

/**
 * Last-updated timestamp. Prefers the envelope-level `updatedAt`
 * (Story 1.7 schema), falls back to `values.last_setting_action_at[0].value`.
 * Mirrors `person.ts::extractLastUpdated`.
 */
export function extractLastUpdated(record: RecordItem): string | undefined {
  if (record.updatedAt) return record.updatedAt
  const arr = asArray((record.values as Record<string, unknown>).last_setting_action_at)
  return readString(arr?.[0], 'value')
}

// ---------------------------------------------------------------------------
// Public — buildCompanyRows
// ---------------------------------------------------------------------------

export function buildCompanyRows(inputs: CompanyInputs, strings: Strings): CompanyRow[] {
  if (!inputs.patPresent) {
    return [
      {
        uid: 'setup',
        title: strings.t('setup.title'),
        subtitle: strings.t('setup.subtitle'),
        icon: 'info',
        valid: true,
        arg: README_SETUP_URL,
      },
    ]
  }

  if (inputs.records.length === 0) {
    return [
      {
        uid: 'empty',
        title: strings.t('search.empty.companies.title'),
        subtitle: inputs.query ? strings.t('search.empty.companies.subtitle', { query: inputs.query }) : '',
        icon: 'info',
        valid: false,
        arg: '',
      },
    ]
  }

  return inputs.records.map((record): CompanyRow => {
    const name = extractCompanyName(record)
    const domain = extractDomain(record)
    const location = extractLocation(record)
    const website = extractWebsiteUrl(record)
    const webUrl = record.webUrl

    const subtitleParts: string[] = []
    const baseSegment = domain ?? location
    if (baseSegment) subtitleParts.push(baseSegment)
    const lifecycleValue = extractLifecycleValue(record, inputs.lifecycleSlug)
    if (lifecycleValue) subtitleParts.push(lifecycleValue)
    const subtitle = subtitleParts.join(' · ')

    const cmd: CompanyMod = website
      ? {
          arg: website,
          valid: true,
          subtitle: strings.t('company.mod.website.subtitle', { domain: domain ?? website }),
        }
      : {
          arg: webUrl,
          valid: true,
          subtitle: strings.t('company.mod.fallback.subtitle'),
        }

    return {
      uid: `company-${record.id}`,
      title: name,
      subtitle,
      icon: 'company',
      valid: true,
      arg: webUrl,
      mods: { cmd },
    }
  })
}
