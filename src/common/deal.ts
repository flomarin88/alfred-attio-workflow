/**
 * `deal` keyword row builder — Story 2.3.
 *
 * Pure functions only. The keyword script (`src/main/deal.ts`) fetches
 * deal records and hands them to `buildDealRows`.
 *
 * Behaviors:
 *   - PAT absent       → setup-prompt row pointing at the README.
 *   - 0 records        → `search.empty.deals` microcopy row.
 *   - Each row         → title = deal name, subtitle = `{stage} · {value}`.
 *   - ⏎                → opens the Attio web URL (`arg`).
 *   - ⌘⏎               → silently degrades to web_url; the first time
 *                         after the LinkedIn hint has been seen (or
 *                         independently if never seen) a fallback hint
 *                         subtitle warns the user that deals have no
 *                         external link.
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

export interface DealInputs {
  identity?: Identity
  records: RecordItem[]
  query: string
  patPresent: boolean
  /**
   * True when `cmd_enter_hint_dismissed` is false. Triggers the hint
   * subtitle on the cmd mod for every deal row. Shared with `person` —
   * once the user has seen the hint anywhere it is silent everywhere.
   */
  showCmdHint: boolean
  /**
   * Slug of the configured lifecycle attribute (FR-033 / Story 2.5). When
   * defined, its value is appended to the subtitle as `· {lifecycle_value}`
   * AFTER stage and deal value. Undefined → FR-013 default layout.
   */
  lifecycleSlug?: string
}

export interface DealMod {
  arg: string
  valid: boolean
  subtitle: string
}

export interface DealRow {
  uid: string
  title: string
  subtitle: string
  icon: IconKey
  valid: boolean
  arg: string
  mods?: { cmd?: DealMod; alt?: DealMod }
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

function readNumber(obj: Record<string, unknown> | undefined, ...keys: string[]): number | undefined {
  if (!obj) return undefined
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.length > 0) {
      const parsed = Number(v)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

/** Deal display name — `values.name[0].value`. */
export function extractDealName(record: RecordItem): string {
  const arr = asArray((record.values as Record<string, unknown>).name)
  return readString(arr?.[0], 'value', 'full_name') ?? '(no name)'
}

/**
 * Stage title. Attio stages are `status`-type attributes:
 * `values.stage[0].status.title`. Some workspaces store the title at
 * the top level under `value`; we accept both.
 */
export function extractStage(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).stage)
  const first = arr?.[0]
  if (!first) return undefined
  const status = first.status
  if (typeof status === 'object' && status !== null) {
    const title = readString(status as Record<string, unknown>, 'title', 'name')
    if (title) return title
  }
  return readString(first, 'value', 'title')
}

/**
 * Close date / due date — `values.close_date[0].value` (ISO). Returns
 * the raw ISO; the fiche renderer formats per active locale.
 */
export function extractCloseDate(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).close_date)
  return readString(arr?.[0], 'value')
}

/**
 * Associated-company record ID — Attio deals link to a company via the
 * `associated_company` attribute. Returns the `target_record_id` (slug
 * form) or `record_id` (UUID form) of the FIRST linked company.
 */
export function extractAssociatedCompanyId(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).associated_company)
  return readString(arr?.[0], 'target_record_id', 'record_id')
}

/**
 * Primary linked person record ID — Attio deals expose
 * `associated_people` as a multi-reference; the FIRST entry is treated
 * as the primary contact for V1.
 */
export function extractPrimaryPersonId(record: RecordItem): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).associated_people)
  return readString(arr?.[0], 'target_record_id', 'record_id')
}

/**
 * Last-updated timestamp. Prefers envelope `updatedAt`, falls back to
 * `values.last_setting_action_at[0].value`. Mirrors the helper in
 * `person.ts` and `company.ts`.
 */
export function extractLastUpdated(record: RecordItem): string | undefined {
  if (record.updatedAt) return record.updatedAt
  const arr = asArray((record.values as Record<string, unknown>).last_setting_action_at)
  return readString(arr?.[0], 'value')
}

/**
 * Deal value — `{ currency_value, currency_code }` per
 * `values.value[0]`. Returns a formatted string via Intl.NumberFormat
 * so currencies render in their idiomatic form.
 */
export function extractValue(record: RecordItem, locale = 'en-US'): string | undefined {
  const arr = asArray((record.values as Record<string, unknown>).value)
  const first = arr?.[0]
  if (!first) return undefined
  const amount = readNumber(first, 'currency_value', 'value', 'amount')
  if (amount === undefined) return undefined
  const currency = readString(first, 'currency_code', 'currency') ?? 'USD'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`
  }
}

// ---------------------------------------------------------------------------
// Public — buildDealRows
// ---------------------------------------------------------------------------

export function buildDealRows(inputs: DealInputs, strings: Strings): DealRow[] {
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
        title: strings.t('search.empty.deals.title'),
        subtitle: inputs.query ? strings.t('search.empty.deals.subtitle', { query: inputs.query }) : '',
        icon: 'info',
        valid: false,
        arg: '',
      },
    ]
  }

  const intlLocale = strings.locale === 'fr' ? 'fr-FR' : 'en-US'

  return inputs.records.map((record): DealRow => {
    const name = extractDealName(record)
    const stage = extractStage(record)
    const value = extractValue(record, intlLocale)
    const webUrl = record.webUrl

    const subtitleParts: string[] = []
    if (stage) subtitleParts.push(stage)
    if (value) subtitleParts.push(value)
    const lifecycleValue = extractLifecycleValue(record, inputs.lifecycleSlug)
    if (lifecycleValue) subtitleParts.push(lifecycleValue)

    const cmd: DealMod = {
      arg: webUrl,
      valid: true,
      subtitle: inputs.showCmdHint
        ? strings.t('deal.mod.fallback.hint.subtitle')
        : strings.t('deal.mod.fallback.subtitle'),
    }

    const altArg = buildNoteAddArg({ slug: 'deals', id: record.id, content: inputs.query, recordName: name })
    const alt: DealMod | undefined = altArg
      ? { arg: altArg, valid: true, subtitle: strings.t('note.add.subtitle') }
      : undefined

    return {
      uid: `deal-${record.id}`,
      title: name,
      subtitle: subtitleParts.join(' · '),
      icon: 'deal',
      valid: true,
      arg: webUrl,
      mods: { cmd, ...(alt !== undefined ? { alt } : {}) },
    }
  })
}
