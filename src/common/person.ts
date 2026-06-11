/**
 * `person` keyword row builder — Story 2.1.
 *
 * Pure functions only. The keyword script (`src/main/person.ts`) fetches
 * the people records + their linked-company names + the LinkedIn-hint
 * dismissal flag, then hands everything to `buildPersonRows`.
 *
 * Behaviors codified here (FR-011 / FR-013 / FR-014 / FR-015 / FR-020 /
 * FR-021 / FR-022):
 *   - PAT absent       → single setup-prompt row pointing at the README.
 *   - 0 records        → `search.empty.people` microcopy row.
 *   - Each person row  → title = primary name, subtitle = job_title · company.
 *   - ⏎               → opens `web_url` in browser (`arg`).
 *   - ⌘⏎              → opens LinkedIn URL when present (`mods.cmd.arg`).
 *                        When absent, degrades to web_url + a one-time
 *                        hint subtitle on the cmd mod.
 */
import type { Identity } from './attio/identity'
import type { RecordItem } from './attio/schemas'
import { type IconKey, README_SETUP_URL } from './constants'
import { extractLifecycleValue } from './lifecycle'
import { buildNoteAddArg } from './notes'
import type { Strings } from './strings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersonInputs {
  identity?: Identity
  /** People records returned by `client.queryRecords('people', …)`. */
  records: RecordItem[]
  /**
   * Display-name map keyed by company record_id → company name. Missing
   * entries are silently omitted from the subtitle.
   */
  companyNames: Map<string, string>
  /** The user's query (whitespace-trimmed). Drives the empty-state subtitle. */
  query: string
  /** True when a PAT is configured. Drives the setup-prompt branch. */
  patPresent: boolean
  /**
   * True when `cmd_enter_hint_dismissed` is false AND at least one
   * surfaced person has no LinkedIn URL. Triggers the hint subtitle on
   * the cmd mod for those rows.
   */
  showLinkedInHint: boolean
  /**
   * Slug of the configured lifecycle attribute (FR-033 / Story 2.5). When
   * defined, the value at `record.values[slug]` is appended to the
   * subtitle as `· {lifecycle_value}`. Undefined → FR-013 default layout.
   * The keyword script verifies slug existence in the schema BEFORE
   * passing it here; unresolved slugs result in `undefined`.
   */
  lifecycleSlug?: string
}

export interface PersonMod {
  arg: string
  valid: boolean
  subtitle: string
}

export interface PersonRow {
  uid: string
  title: string
  subtitle: string
  icon: IconKey
  valid: boolean
  arg: string
  mods?: { cmd?: PersonMod; alt?: PersonMod }
  /** Set by the keyword script after the Quick Look fiche is written. */
  quicklookurl?: string
}

// ---------------------------------------------------------------------------
// Value extraction — Attio's per-attribute `values[]` arrays
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

/** Primary display name. People expose `full_name`; falls back to `value`. */
export function extractPersonName(record: RecordItem): string {
  const arr = asArray((record.values as Record<string, unknown>).name)
  return readString(arr?.[0], 'full_name', 'value') ?? '(no name)'
}

/** Job title — `values.job_title[0].value`. */
export function extractJobTitle(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).job_title)
  return readString(arr?.[0], 'value')
}

/** LinkedIn URL — `values.linkedin[0].value`. */
export function extractLinkedIn(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).linkedin)
  return readString(arr?.[0], 'value')
}

/**
 * Linked-company record ID. Returns the `target_record_id` (slug form)
 * or `record_id` (newer form) of the FIRST linked company.
 */
export function extractCompanyId(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).company)
  return readString(arr?.[0], 'target_record_id', 'record_id')
}

/** Returns true if any record lacks a LinkedIn URL — used to decide hint visibility. */
export function hasMissingLinkedIn(records: RecordItem[]): boolean {
  return records.some((r) => !extractLinkedIn(r))
}

/**
 * Primary email — `values.email_addresses[0]`. Attio stores email entries
 * with the address at either `email_address` (current shape) or `value`
 * (legacy); both are accepted.
 */
export function extractPrimaryEmail(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).email_addresses)
  return readString(arr?.[0], 'email_address', 'value')
}

/**
 * Primary phone — `values.phone_numbers[0]`. Stored at `phone_number`
 * (current shape) or `value` (legacy); both are accepted.
 */
export function extractPrimaryPhone(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).phone_numbers)
  return readString(arr?.[0], 'phone_number', 'value')
}

/**
 * Last-updated timestamp. Prefers the envelope-level `updated_at`
 * (Story 1.7 schema), falls back to `values.last_setting_action_at[0].value`
 * which is what `people` queries actually surface today.
 */
export function extractLastUpdated(record: RecordItem): string | undefined {
  if (record.updatedAt) return record.updatedAt
  const arr = asArray((record.values as Record<string, unknown>).last_setting_action_at)
  return readString(arr?.[0], 'value')
}

// ---------------------------------------------------------------------------
// Public — buildPersonRows
// ---------------------------------------------------------------------------

export function buildPersonRows(inputs: PersonInputs, strings: Strings): PersonRow[] {
  // FR-022 — setup prompt when no PAT.
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

  // FR-021 — no results.
  if (inputs.records.length === 0) {
    return [
      {
        uid: 'empty',
        title: strings.t('search.empty.people.title'),
        subtitle: inputs.query ? strings.t('search.empty.people.subtitle', { query: inputs.query }) : '',
        icon: 'info',
        valid: false,
        arg: '',
      },
    ]
  }

  return inputs.records.map((record): PersonRow => {
    const name = extractPersonName(record)
    const jobTitle = extractJobTitle(record)
    const companyId = extractCompanyId(record)
    const companyName = companyId ? inputs.companyNames.get(companyId) : undefined
    const linkedInUrl = extractLinkedIn(record)
    const webUrl = record.webUrl

    const subtitleParts: string[] = []
    if (jobTitle) subtitleParts.push(jobTitle)
    if (companyName) subtitleParts.push(companyName)
    const lifecycleValue = extractLifecycleValue(record, inputs.lifecycleSlug)
    if (lifecycleValue) subtitleParts.push(lifecycleValue)

    const cmd: PersonMod = linkedInUrl
      ? {
          arg: linkedInUrl,
          valid: true,
          subtitle: strings.t('person.mod.linkedin.subtitle'),
        }
      : {
          arg: webUrl,
          valid: true,
          subtitle: inputs.showLinkedInHint
            ? strings.t('person.mod.fallback.hint.subtitle')
            : strings.t('person.mod.fallback.subtitle'),
        }

    const altArg = buildNoteAddArg({ slug: 'people', id: record.id, content: inputs.query, recordName: name })
    const alt: PersonMod | undefined = altArg
      ? { arg: altArg, valid: true, subtitle: strings.t('note.add.subtitle') }
      : undefined

    return {
      uid: `person-${record.id}`,
      title: name,
      subtitle: subtitleParts.join(' · '),
      icon: 'person',
      valid: true,
      arg: webUrl,
      mods: { cmd, ...(alt !== undefined ? { alt } : {}) },
    }
  })
}
