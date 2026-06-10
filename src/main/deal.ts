/**
 * Keyword entry: `deal <query>`. Story 2.3.
 *
 *  1. Resolve auth (PAT + identity).
 *  2. Query deals. Empty query → recent; non-empty → substring match on
 *     the name attribute.
 *  3. Hand the records to `buildDealRows` — subtitle is `{stage} · {value}`,
 *     ⌘⏎ silently degrades to the Attio URL with a one-time fallback
 *     hint (shares the `cmd_enter_hint_dismissed` flag with `person`).
 */
import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore, Identity } from '@common/attio/identity'
import type { RecordItem } from '@common/attio/schemas'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { DEFAULT_RESULT_LIMIT } from '@common/constants'
import {
  type DealRow,
  buildDealRows,
  extractAssociatedCompanyId,
  extractCloseDate,
  extractDealName,
  extractLastUpdated,
  extractPrimaryPersonId,
  extractStage,
  extractValue,
} from '@common/deal'
import { renderDealFiche } from '@common/deal-fiche'
import { clearLifecycleMissingSlug, persistWorkflowError, recordLifecycleMissingSlug } from '@common/diag-state'
import { type WorkflowError, errorParams, errorRow } from '@common/error'
import { lifecycleSlugExists } from '@common/lifecycle'
import { createNotify } from '@common/notify'
import { writeQuicklookHtml } from '@common/quicklook'
import { createIconRegistry, createRowBuilder } from '@common/script-filter'
import { type Strings, createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

const HINT_FLAG = 'cmd_enter_hint_dismissed'

;(async () => {
  const alfredClient = new FastAlfred()
  try {
    const strings = createStrings()
    const cache = createCache(alfredClient.cache)
    const config = alfredClient.config as unknown as ConfigStore
    const notify = createNotify({ workflowName: alfredClient.alfredInfo.workflowName() })

    const pat = alfredClient.env.getEnv<string>(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })
    const query = (alfredClient.input ?? '').trim()

    if (!pat) {
      const rows = buildDealRows(
        {
          identity: undefined,
          records: [],
          query,
          patPresent: false,
          showCmdHint: false,
        },
        strings,
      )
      alfredClient.output(toScriptFilter(rows))
      return
    }

    const client = new AttioClient({ accessToken: pat, cache })

    const auth = createAuth({
      getPat: () => pat,
      config,
      cache,
      prober: (token) => new AttioClient({ accessToken: token, cache }).request('GET', '/v2/self'),
      notify,
      strings,
    })

    const identityResult = await auth.assertCurrent()
    if (!identityResult.ok) {
      handleError(alfredClient, strings, config, '/v2/self', identityResult.error)
      return
    }
    const identity: Identity = identityResult.data

    const queryBody = buildQueryBody(query)
    const queryEndpoint = '/v2/objects/deals/records/query'
    const result = await client.queryRecords('deals', queryBody)
    if (!result.ok) {
      handleError(alfredClient, strings, config, queryEndpoint, result.error, { body: queryBody })
      return
    }

    const hintDismissed = config.get(HINT_FLAG) === true
    const showCmdHint = !hintDismissed && result.data.length > 0
    const lifecycleSlug = await resolveLifecycleSlug(client, config, alfredClient)

    const rows = buildDealRows(
      {
        identity,
        records: result.data,
        query,
        patPresent: true,
        showCmdHint,
        lifecycleSlug,
      },
      strings,
    )

    await attachDealFiches(rows, result.data, client, alfredClient, strings)

    alfredClient.output(toScriptFilter(rows))

    if (showCmdHint) {
      // First render IS the hint — persist immediately so subsequent
      // invocations stay silent on the cmd subtitle.
      config.set(HINT_FLAG, true)
    }
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

// ---------------------------------------------------------------------------
// Query body
// ---------------------------------------------------------------------------

function buildQueryBody(query: string): Record<string, unknown> {
  // `created_at` is universal across every Attio object.
  const baseSorts = [{ direction: 'desc', attribute: 'created_at' }]
  if (query === '') {
    return { sorts: baseSorts, limit: DEFAULT_RESULT_LIMIT }
  }
  return {
    filter: { name: { $contains: query } },
    sorts: baseSorts,
    limit: DEFAULT_RESULT_LIMIT,
  }
}

// ---------------------------------------------------------------------------
// Lifecycle slug resolution (FR-033 / Story 2.5)
// ---------------------------------------------------------------------------

async function resolveLifecycleSlug(
  client: AttioClient,
  config: ConfigStore,
  alfredClient: FastAlfred,
): Promise<string | undefined> {
  const raw = alfredClient.env.getEnv<string>(Variables.LIFECYCLE_ATTRIBUTE_DEAL, { defaultValue: '' })
  const configured = (raw ?? '').trim()
  if (!configured) {
    clearLifecycleMissingSlug(config, 'deal')
    return undefined
  }
  const attrs = await client.getObjectAttributes('deals')
  if (!attrs.ok) return undefined
  if (lifecycleSlugExists(attrs.data, configured)) {
    clearLifecycleMissingSlug(config, 'deal')
    return configured
  }
  recordLifecycleMissingSlug(config, 'deal', configured)
  return undefined
}

// ---------------------------------------------------------------------------
// Story 3.4 — fiche generation
// ---------------------------------------------------------------------------

async function attachDealFiches(
  rows: DealRow[],
  records: RecordItem[],
  client: AttioClient,
  alfredClient: FastAlfred,
  strings: Strings,
): Promise<void> {
  const cacheDir = alfredClient.alfredInfo.cache()
  if (!cacheDir) return
  const bundleDir = process.cwd()
  const recordsById = new Map<string, RecordItem>()
  for (const record of records) recordsById.set(record.id, record)

  const companyIds = new Set<string>()
  const personIds = new Set<string>()
  for (const record of records) {
    const c = extractAssociatedCompanyId(record)
    if (c) companyIds.add(c)
    const p = extractPrimaryPersonId(record)
    if (p) personIds.add(p)
  }

  const [companyNames, personNames] = await Promise.all([
    resolveNames(client, 'companies', companyIds),
    resolveNames(client, 'people', personIds),
  ])

  await Promise.all(
    rows.map(async (row) => {
      if (!row.uid.startsWith('deal-')) return
      const id = row.uid.slice('deal-'.length)
      const record = recordsById.get(id)
      if (!record) return
      const companyId = extractAssociatedCompanyId(record)
      const personId = extractPrimaryPersonId(record)
      const html = renderDealFiche(
        {
          id,
          name: extractDealName(record),
          stage: extractStage(record),
          value: extractValue(record, strings.locale === 'fr' ? 'fr-FR' : 'en-US'),
          linkedCompanyName: companyId ? companyNames.get(companyId) : undefined,
          primaryPersonName: personId ? personNames.get(personId) : undefined,
          closeDateAt: extractCloseDate(record),
          lastUpdatedAt: extractLastUpdated(record),
        },
        { bundleDir, strings },
      )
      const written = await writeQuicklookHtml(cacheDir, `deal-${id}.html`, html)
      if (written) row.quicklookurl = `file://${written}`
    }),
  )
}

async function resolveNames(
  client: AttioClient,
  slug: 'companies' | 'people',
  ids: Set<string>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  await Promise.all(
    [...ids].map(async (id) => {
      const result = await client.getRecord(slug, id)
      if (!result.ok) return
      const arr = (result.data.values as Record<string, unknown>).name as Array<Record<string, unknown>> | undefined
      const first = arr?.[0]
      if (!first) return
      const name =
        (typeof first.full_name === 'string' && first.full_name.length > 0 && first.full_name) ||
        (typeof first.value === 'string' && first.value.length > 0 && first.value) ||
        undefined
      if (name) out.set(id, name)
    }),
  )
  return out
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function handleError(
  alfredClient: FastAlfred,
  strings: Strings,
  config: ConfigStore,
  endpoint: string,
  error: WorkflowError,
  extra: Record<string, unknown> = {},
): void {
  persistWorkflowError(config, endpoint, error)
  alfredClient.log(
    `[deal] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))} extra=${JSON.stringify(extra)}`,
  )
  const spec = errorRow(error)
  const row: DealRow = {
    uid: spec.uid,
    title: strings.t(spec.title, spec.params),
    subtitle: strings.t(spec.subtitle, spec.params),
    icon: spec.icon,
    valid: false,
    arg: '',
  }
  alfredClient.output(toScriptFilter([row]))
}

function toScriptFilter(rows: DealRow[]): AlfredScriptFilter {
  const iconRegistry = createIconRegistry({ bundleDir: process.cwd() })
  const buildRow = createRowBuilder(iconRegistry)
  const items = rows.map((spec) =>
    buildRow({
      uid: spec.uid,
      title: spec.title,
      subtitle: spec.subtitle,
      icon: spec.icon,
      valid: spec.valid,
      arg: spec.arg,
      ...(spec.quicklookurl !== undefined ? { quicklookurl: spec.quicklookurl } : {}),
      ...(spec.mods !== undefined ? { mods: spec.mods } : {}),
    }),
  ) as unknown as AlfredListItem[]
  return { items }
}
