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
  mods?: { cmd?: DealMod }
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

    const cmd: DealMod = {
      arg: webUrl,
      valid: true,
      subtitle: inputs.showCmdHint
        ? strings.t('deal.mod.fallback.hint.subtitle')
        : strings.t('deal.mod.fallback.subtitle'),
    }

    return {
      uid: `deal-${record.id}`,
      title: name,
      subtitle: subtitleParts.join(' · '),
      icon: 'deal',
      valid: true,
      arg: webUrl,
      mods: { cmd },
    }
  })
}
