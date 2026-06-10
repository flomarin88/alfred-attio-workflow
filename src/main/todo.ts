/**
 * Keyword entry: `todo`. Story 1.10.
 *
 * 1. Resolves auth via `createAuth.assertCurrent` (Story 1.6) — this
 *    handles PAT rotation, identity probe + persistence.
 * 2. Fetches tasks scoped to the current member and `is_completed=false`.
 * 3. Collects unique linked-record `(slug, id)` pairs and fetches each
 *    via `client.getRecord` (cache-backed). Names are extracted from
 *    the record's primary attribute ("name").
 * 4. Hands everything to the pure `buildTodoRows` builder.
 * 5. Outputs the script-filter list. On hard failure surfaces a single
 *    error row (per FR-051 microcopy) instead of crashing the keyword.
 */
import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore, Identity } from '@common/attio/identity'
import type { RecordItem, Task } from '@common/attio/schemas'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { persistWorkflowError } from '@common/diag-state'
import { type WorkflowError, errorParams, errorRow } from '@common/error'
import { createNotify } from '@common/notify'
import { writeQuicklookHtml } from '@common/quicklook'
import { createIconRegistry, createRowBuilder } from '@common/script-filter'
import { type Strings, createStrings } from '@common/strings'
import { renderTaskFiche } from '@common/task-fiche'
import { buildTaskFicheInput } from '@common/task-fiche-build'
import { type TodoRow, buildTodoRows } from '@common/todo'
import { Variables } from '@common/variables.enum'

;(async () => {
  const alfredClient = new FastAlfred()
  try {
    const strings = createStrings()
    const cache = createCache(alfredClient.cache)
    const config = alfredClient.config as unknown as ConfigStore
    const notify = createNotify({ workflowName: alfredClient.alfredInfo.workflowName() })

    const pat = alfredClient.env.getEnv<string>(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })

    // No PAT → setup-prompt row (FR-022 / FR-023). The builder owns the
    // wording; we just hand it an empty inputs object.
    if (!pat) {
      const rows = buildTodoRows(
        {
          identity: undefined,
          tasks: [],
          linkedRecordNames: new Map(),
          patPresent: false,
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

    const tasksFilter = {
      assigneeWorkspaceMemberId: identity.workspaceMemberId,
      isCompleted: false,
    }
    const tasksResult = await client.listTasks(tasksFilter)
    if (!tasksResult.ok) {
      handleError(alfredClient, strings, config, '/v2/tasks', tasksResult.error, { filter: tasksFilter })
      return
    }

    // Attio returns linked-record `target_object` as the OBJECT UUID, not
    // its slug. Resolve the UUID → slug mapping via /v2/objects (cached)
    // so the builder's slug-keyed lookups (`people:…`, `deals:…`,
    // `companies:…`) match. If listObjects fails we still render — the
    // subtitles will be name-free but the rows stay actionable.
    const objectIdToSlug = new Map<string, string>()
    const objectsResult = await client.listObjects()
    if (objectsResult.ok) {
      for (const obj of objectsResult.data) {
        objectIdToSlug.set(obj.id, obj.slug)
      }
    }

    const normalizedTasks = tasksResult.data.map((task) => ({
      ...task,
      linkedRecords: task.linkedRecords.map((link) => ({
        targetObject: objectIdToSlug.get(link.targetObject) ?? link.targetObject,
        targetRecordId: link.targetRecordId,
      })),
    }))

    const linkedRecordNames = await resolveLinkedNames(client, normalizedTasks)

    const rows = buildTodoRows(
      {
        identity,
        tasks: normalizedTasks,
        linkedRecordNames,
        patPresent: true,
      },
      strings,
    )

    await attachTaskFiches(rows, normalizedTasks, identity, client, alfredClient, strings)

    alfredClient.output(toScriptFilter(rows))
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

// ---------------------------------------------------------------------------
// Linked-record name resolution
// ---------------------------------------------------------------------------

/**
 * Fetches the primary display name for every `(slug, id)` referenced by
 * the task batch. Failures (404, transport, parse) are silently dropped
 * — the builder hides links it can't resolve.
 */
async function resolveLinkedNames(client: AttioClient, tasks: Task[]): Promise<Map<string, string>> {
  const unique = new Map<string, { slug: string; id: string }>()
  for (const task of tasks) {
    for (const link of task.linkedRecords) {
      unique.set(`${link.targetObject}:${link.targetRecordId}`, {
        slug: link.targetObject,
        id: link.targetRecordId,
      })
    }
  }

  const out = new Map<string, string>()
  await Promise.all(
    [...unique.entries()].map(async ([key, { slug, id }]) => {
      const result = await client.getRecord(slug, id)
      if (!result.ok) return
      const name = extractDisplayName(slug, result.data)
      if (name) out.set(key, name)
    }),
  )
  return out
}

/**
 * Pulls the primary display name from a record's `values`. People expose
 * a `full_name`; companies and deals expose a `value`. Unknown shapes
 * return `undefined` and the link is dropped from the subtitle.
 */
function extractDisplayName(slug: string, record: RecordItem): string | undefined {
  const values = record.values as Record<string, unknown>
  const nameAttr = values.name as Array<Record<string, unknown>> | undefined
  const first = nameAttr?.[0]
  if (!first) return undefined

  if (slug === 'people') {
    const full = first.full_name
    if (typeof full === 'string' && full.length > 0) return full
  }
  const value = first.value
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

// ---------------------------------------------------------------------------
// Story 3.5 — fiche generation
// ---------------------------------------------------------------------------

async function attachTaskFiches(
  rows: TodoRow[],
  tasks: Task[],
  identity: Identity | undefined,
  client: AttioClient,
  alfredClient: FastAlfred,
  strings: Strings,
): Promise<void> {
  const cacheDir = alfredClient.alfredInfo.cache()
  if (!cacheDir) return
  const bundleDir = process.cwd()
  const tasksById = new Map<string, Task>()
  for (const task of tasks) tasksById.set(task.id, task)

  await Promise.all(
    rows.map(async (row) => {
      if (!row.uid.startsWith('task-')) return
      const id = row.uid.slice('task-'.length)
      const task = tasksById.get(id)
      if (!task) return
      const input = await buildTaskFicheInput(task, identity, client)
      const html = renderTaskFiche(input, { bundleDir, strings })
      const written = await writeQuicklookHtml(cacheDir, `task-${id}.html`, html)
      if (written) row.quicklookurl = `file://${written}`
    }),
  )
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
    `[todo] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))} extra=${JSON.stringify(extra)}`,
  )
  const spec = errorRow(error)
  const row: TodoRow = {
    uid: spec.uid,
    title: strings.t(spec.title, spec.params),
    subtitle: strings.t(spec.subtitle, spec.params),
    icon: spec.icon,
    valid: false,
    arg: '',
  }
  alfredClient.output(toScriptFilter([row]))
}

function toScriptFilter(rows: TodoRow[]): AlfredScriptFilter {
  // bundleDir resolution: the bundled script lives at the workflow root
  // when Alfred runs it, so process.cwd() is the workflow directory.
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
    }),
  ) as unknown as AlfredListItem[]
  return { items }
}
