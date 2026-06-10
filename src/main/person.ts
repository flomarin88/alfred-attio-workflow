/**
 * Keyword entry: `person <query>`. Story 2.1.
 *
 *  1. Resolve auth (PAT + identity).
 *  2. Query people via `client.queryRecords('people', body)`. Empty query
 *     → recently-updated; non-empty → substring match on name (FR-012).
 *  3. Collect linked-company record IDs, fetch their display names so
 *     the subtitle can show `{job_title} · {company_name}` (FR-013).
 *  4. Read `cmd_enter_hint_dismissed`; pass to builder so the cmd-mod
 *     subtitle warns the user the first time ⌘⏎ falls back to Attio
 *     (FR-015).
 *  5. Output rows; if the hint was shown, persist the dismissal flag so
 *     subsequent invocations stay silent.
 */
import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore, Identity } from '@common/attio/identity'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { DEFAULT_RESULT_LIMIT } from '@common/constants'
import { clearLifecycleMissingSlug, persistWorkflowError, recordLifecycleMissingSlug } from '@common/diag-state'
import { type WorkflowError, errorParams, errorRow } from '@common/error'
import { lifecycleSlugExists } from '@common/lifecycle'
import { createNotify } from '@common/notify'
import { type PersonRow, buildPersonRows, extractCompanyId, hasMissingLinkedIn } from '@common/person'
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
      emit(alfredClient, strings, {
        identity: undefined,
        records: [],
        companyNames: new Map(),
        query,
        patPresent: false,
        showLinkedInHint: false,
      })
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
    const queryEndpoint = '/v2/objects/people/records/query'
    const result = await client.queryRecords('people', queryBody)
    if (!result.ok) {
      handleError(alfredClient, strings, config, queryEndpoint, result.error, { body: queryBody })
      return
    }

    const companyNames = await resolveCompanyNames(client, result.data)
    const lifecycleSlug = await resolveLifecycleSlug(client, config, alfredClient)

    const hintDismissed = config.get(HINT_FLAG) === true
    const showLinkedInHint = !hintDismissed && hasMissingLinkedIn(result.data)

    emit(alfredClient, strings, {
      identity,
      records: result.data,
      companyNames,
      query,
      patPresent: true,
      showLinkedInHint,
      lifecycleSlug,
    })

    if (showLinkedInHint) {
      // Persist immediately — the first render IS the hint. Subsequent
      // invocations stay silent on the fallback cmd subtitle.
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
  const baseSorts = [{ direction: 'desc', attribute: 'last_setting_action_at' }]
  if (query === '') {
    return { sorts: baseSorts, limit: DEFAULT_RESULT_LIMIT }
  }
  return {
    filter: {
      $or: [
        { name: { full_name: { $contains: query } } },
        { name: { first_name: { $contains: query } } },
        { name: { last_name: { $contains: query } } },
      ],
    },
    sorts: baseSorts,
    limit: DEFAULT_RESULT_LIMIT,
  }
}

// ---------------------------------------------------------------------------
// Company-name resolution
// ---------------------------------------------------------------------------

async function resolveCompanyNames(
  client: AttioClient,
  records: Awaited<ReturnType<AttioClient['queryRecords']>> extends infer R
    ? R extends { ok: true; data: infer D }
      ? D
      : never
    : never,
): Promise<Map<string, string>> {
  const uniqueIds = new Set<string>()
  for (const record of records) {
    const id = extractCompanyId(record)
    if (id) uniqueIds.add(id)
  }

  const out = new Map<string, string>()
  await Promise.all(
    [...uniqueIds].map(async (id) => {
      const result = await client.getRecord('companies', id)
      if (!result.ok) return
      const name = extractCompanyName(result.data)
      if (name) out.set(id, name)
    }),
  )
  return out
}

function extractCompanyName(
  record: Awaited<ReturnType<AttioClient['getRecord']>> extends infer R
    ? R extends { ok: true; data: infer D }
      ? D
      : never
    : never,
): string | undefined {
  const arr = (record.values as Record<string, unknown>).name as Array<Record<string, unknown>> | undefined
  const first = arr?.[0]
  if (!first) return undefined
  const value = first.value
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

// ---------------------------------------------------------------------------
// Lifecycle slug resolution (FR-033 / Story 2.5)
// ---------------------------------------------------------------------------

async function resolveLifecycleSlug(
  client: AttioClient,
  config: ConfigStore,
  alfredClient: FastAlfred,
): Promise<string | undefined> {
  const raw = alfredClient.env.getEnv<string>(Variables.LIFECYCLE_ATTRIBUTE_PERSON, { defaultValue: '' })
  const configured = (raw ?? '').trim()
  if (!configured) {
    clearLifecycleMissingSlug(config, 'person')
    return undefined
  }
  const attrs = await client.getObjectAttributes('people')
  // Schema fetch failure → silently skip the suffix without persisting a
  // warning. The next refresh will re-evaluate; meanwhile FR-013 default
  // keeps working.
  if (!attrs.ok) return undefined
  if (lifecycleSlugExists(attrs.data, configured)) {
    clearLifecycleMissingSlug(config, 'person')
    return configured
  }
  recordLifecycleMissingSlug(config, 'person', configured)
  return undefined
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function emit(alfredClient: FastAlfred, strings: Strings, inputs: Parameters<typeof buildPersonRows>[0]): void {
  const rows = buildPersonRows(inputs, strings)
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
    `[person] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))} extra=${JSON.stringify(extra)}`,
  )
  const spec = errorRow(error)
  const row: PersonRow = {
    uid: spec.uid,
    title: strings.t(spec.title, spec.params),
    subtitle: strings.t(spec.subtitle, spec.params),
    icon: spec.icon,
    valid: false,
    arg: '',
  }
  alfredClient.output(toScriptFilter([row]))
}

function toScriptFilter(rows: PersonRow[]): AlfredScriptFilter {
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
