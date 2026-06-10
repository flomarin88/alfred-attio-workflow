/**
 * Keyword entry: `company <query>`. Story 2.2.
 *
 *  1. Resolve auth (PAT + identity).
 *  2. Query companies. Empty query → recently-updated; non-empty →
 *     substring match on the name attribute.
 *  3. Hand the records to `buildCompanyRows` — subtitle is domain
 *     (preferred) or location (fallback), and ⌘⏎ opens the company's
 *     website URL when present.
 */
import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore, Identity } from '@common/attio/identity'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { type CompanyRow, buildCompanyRows } from '@common/company'
import { DEFAULT_RESULT_LIMIT } from '@common/constants'
import { clearLifecycleMissingSlug, persistWorkflowError, recordLifecycleMissingSlug } from '@common/diag-state'
import { type WorkflowError, errorParams, errorRow } from '@common/error'
import { lifecycleSlugExists } from '@common/lifecycle'
import { createNotify } from '@common/notify'
import { createIconRegistry, createRowBuilder } from '@common/script-filter'
import { type Strings, createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

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
      emit(alfredClient, strings, { identity: undefined, records: [], query, patPresent: false })
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
    const queryEndpoint = '/v2/objects/companies/records/query'
    const result = await client.queryRecords('companies', queryBody)
    if (!result.ok) {
      handleError(alfredClient, strings, config, queryEndpoint, result.error, { body: queryBody })
      return
    }

    const lifecycleSlug = await resolveLifecycleSlug(client, config, alfredClient)

    emit(alfredClient, strings, {
      identity,
      records: result.data,
      query,
      patPresent: true,
      lifecycleSlug,
    })
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

// ---------------------------------------------------------------------------
// Query body
// ---------------------------------------------------------------------------

function buildQueryBody(query: string): Record<string, unknown> {
  // `created_at` is universal across every Attio object — safer than
  // `last_setting_action_at` (which can be people-specific depending on
  // the workspace's attribute setup).
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
  const raw = alfredClient.env.getEnv<string>(Variables.LIFECYCLE_ATTRIBUTE_COMPANY, { defaultValue: '' })
  const configured = (raw ?? '').trim()
  if (!configured) {
    clearLifecycleMissingSlug(config, 'company')
    return undefined
  }
  const attrs = await client.getObjectAttributes('companies')
  if (!attrs.ok) return undefined
  if (lifecycleSlugExists(attrs.data, configured)) {
    clearLifecycleMissingSlug(config, 'company')
    return configured
  }
  recordLifecycleMissingSlug(config, 'company', configured)
  return undefined
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function emit(alfredClient: FastAlfred, strings: Strings, inputs: Parameters<typeof buildCompanyRows>[0]): void {
  const rows = buildCompanyRows(inputs, strings)
  alfredClient.output(toScriptFilter(rows))
}

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
    `[company] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))} extra=${JSON.stringify(extra)}`,
  )
  const spec = errorRow(error)
  const row: CompanyRow = {
    uid: spec.uid,
    title: strings.t(spec.title, spec.params),
    subtitle: strings.t(spec.subtitle, spec.params),
    icon: spec.icon,
    valid: false,
    arg: '',
  }
  alfredClient.output(toScriptFilter([row]))
}

function toScriptFilter(rows: CompanyRow[]): AlfredScriptFilter {
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
      ...(spec.mods !== undefined ? { mods: spec.mods } : {}),
    }),
  ) as unknown as AlfredListItem[]
  return { items }
}
