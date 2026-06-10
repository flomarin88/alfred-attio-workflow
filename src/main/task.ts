/**
 * Keyword entry: `task <query>`. Story 2.4.
 *
 *  1. Resolve auth (PAT + identity).
 *  2. Fetch a batch of tasks (`limit=50`) — Attio's `/v2/tasks` has no
 *     content filter, so the substring match runs client-side inside
 *     `buildTaskRows`.
 *  3. Hand the records to the builder. Subtitle = `{deadline} ·
 *     {Open|Completed}` (FR-013, distinct from `todo`'s FR-002 mapping).
 *  4. ⌘⏎ silently degrades; one-time hint shared with `person` + `deal`.
 */
import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore, Identity } from '@common/attio/identity'
import type { Task } from '@common/attio/schemas'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { persistWorkflowError } from '@common/diag-state'
import { type WorkflowError, errorParams, errorRow } from '@common/error'
import { createNotify } from '@common/notify'
import { writeQuicklookHtml } from '@common/quicklook'
import { createIconRegistry, createRowBuilder } from '@common/script-filter'
import { type Strings, createStrings } from '@common/strings'
import { type TaskRow, buildTaskRows } from '@common/task'
import { renderTaskFiche } from '@common/task-fiche'
import { buildTaskFicheInput } from '@common/task-fiche-build'
import { Variables } from '@common/variables.enum'

const HINT_FLAG = 'cmd_enter_hint_dismissed'
const FETCH_LIMIT = 50

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
      const rows = buildTaskRows(
        {
          identity: undefined,
          tasks: [],
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

    const tasksFilter = { limit: FETCH_LIMIT }
    const tasksResult = await client.listTasks(tasksFilter)
    if (!tasksResult.ok) {
      handleError(alfredClient, strings, config, '/v2/tasks', tasksResult.error, { filter: tasksFilter })
      return
    }

    const hintDismissed = config.get(HINT_FLAG) === true
    const showCmdHint = !hintDismissed && tasksResult.data.length > 0

    const rows = buildTaskRows(
      {
        identity,
        tasks: tasksResult.data,
        query,
        patPresent: true,
        showCmdHint,
      },
      strings,
    )

    await attachTaskFiches(rows, tasksResult.data, identity, client, alfredClient, strings)

    alfredClient.output(toScriptFilter(rows))

    if (showCmdHint) {
      config.set(HINT_FLAG, true)
    }
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

// ---------------------------------------------------------------------------
// Story 3.5 — fiche generation
// ---------------------------------------------------------------------------

async function attachTaskFiches(
  rows: TaskRow[],
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
    `[task] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))} extra=${JSON.stringify(extra)}`,
  )
  const spec = errorRow(error)
  const row: TaskRow = {
    uid: spec.uid,
    title: strings.t(spec.title, spec.params),
    subtitle: strings.t(spec.subtitle, spec.params),
    icon: spec.icon,
    valid: false,
    arg: '',
  }
  alfredClient.output(toScriptFilter([row]))
}

function toScriptFilter(rows: TaskRow[]): AlfredScriptFilter {
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
