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
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { persistWorkflowError } from '@common/diag-state'
import { type WorkflowError, errorParams, errorRow } from '@common/error'
import { createNotify } from '@common/notify'
import { createIconRegistry, createRowBuilder } from '@common/script-filter'
import { type Strings, createStrings } from '@common/strings'
import { type TaskRow, buildTaskRows } from '@common/task'
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
      emit(alfredClient, strings, {
        identity: undefined,
        tasks: [],
        query,
        patPresent: false,
        showCmdHint: false,
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

    const tasksFilter = { limit: FETCH_LIMIT }
    const tasksResult = await client.listTasks(tasksFilter)
    if (!tasksResult.ok) {
      handleError(alfredClient, strings, config, '/v2/tasks', tasksResult.error, { filter: tasksFilter })
      return
    }

    const hintDismissed = config.get(HINT_FLAG) === true
    const showCmdHint = !hintDismissed && tasksResult.data.length > 0

    emit(alfredClient, strings, {
      identity,
      tasks: tasksResult.data,
      query,
      patPresent: true,
      showCmdHint,
    })

    if (showCmdHint) {
      config.set(HINT_FLAG, true)
    }
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function emit(alfredClient: FastAlfred, strings: Strings, inputs: Parameters<typeof buildTaskRows>[0]): void {
  const rows = buildTaskRows(inputs, strings)
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
      ...(spec.mods !== undefined ? { mods: spec.mods } : {}),
    }),
  ) as unknown as AlfredListItem[]
  return { items }
}
