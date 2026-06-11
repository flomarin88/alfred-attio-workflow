/**
 * Keyword entry: mark-complete (Story 4.1).
 *
 * Wired from the `task` and `todo` script-filters via `mods.cmd.arg =
 * task.id`. Pressing ⌘⏎ on a task row triggers this action with the
 * task ID as its sole argument.
 *
 * Flow:
 *   1. Resolve auth (PAT must be present; otherwise no API call).
 *   2. Preflight: `checkOnline('api.attio.com')`. Offline → fire the
 *      offline-block notification and return (NFR-007 / FR-051).
 *   3. `PATCH /v2/tasks/{id}` with `{ is_completed: true }`.
 *   4. On success: invalidate the task entry + the list pages that
 *      contained it (FR-047 — already done inside `client.patchTask`),
 *      then fire the success notification with the truncated content.
 *   5. On failure: fire the matching `errors.{kind}` notification; the
 *      list is NOT refreshed and the task remains visible on the next
 *      `todo` / `task` invocation.
 */
import type { AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore } from '@common/attio/identity'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { persistWorkflowError } from '@common/diag-state'
import { type WorkflowError, errorParams, subtitleKeyFor, titleKeyFor } from '@common/error'
import { createNotify } from '@common/notify'
import { checkOnline } from '@common/offline'
import { createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

const MAX_CONTENT_LEN = 60

;(async () => {
  const alfredClient = new FastAlfred()
  try {
    const strings = createStrings()
    const cache = createCache(alfredClient.cache)
    const config = alfredClient.config as unknown as ConfigStore
    const notify = createNotify({ workflowName: alfredClient.alfredInfo.workflowName() })

    const pat = alfredClient.env.getEnv<string>(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })
    const taskId = (alfredClient.input ?? '').trim()

    if (!taskId) {
      alfredClient.log('[mark-complete] missing task id; nothing to do')
      emitEmpty(alfredClient)
      return
    }

    if (!pat) {
      // No PAT → behave like other keywords: surface the setup-prompt
      // path via a notification rather than silently failing.
      notify.error(strings.t('errors.auth-invalid.title'))
      emitEmpty(alfredClient)
      return
    }

    // FR-051 / NFR-007 — preflight offline. Skip the API call entirely
    // when the host is unreachable so we never burn a write window on a
    // request that will simply hang.
    const online = await checkOnline()
    if (!online) {
      notify.error(`${strings.t('offline.preflight-block.title')} — ${strings.t('offline.preflight-block.subtitle')}`)
      emitEmpty(alfredClient)
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
      notifyError(alfredClient, strings, notify, config, '/v2/self', identityResult.error)
      emitEmpty(alfredClient)
      return
    }

    const endpoint = `/v2/tasks/${taskId}`
    const patchResult = await client.patchTask(taskId, { is_completed: true })
    if (!patchResult.ok) {
      notifyError(alfredClient, strings, notify, config, endpoint, patchResult.error)
      emitEmpty(alfredClient)
      return
    }

    const content = truncate(patchResult.data.content, MAX_CONTENT_LEN)
    notify.success(strings.t('success.task-completed.subtitle', { content: content || taskId }))

    emitEmpty(alfredClient)
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function notifyError(
  alfredClient: FastAlfred,
  strings: ReturnType<typeof createStrings>,
  notify: ReturnType<typeof createNotify>,
  config: ConfigStore,
  endpoint: string,
  error: WorkflowError,
): void {
  persistWorkflowError(config, endpoint, error)
  alfredClient.log(
    `[mark-complete] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))}`,
  )
  const title = strings.t(titleKeyFor(error), errorParams(error))
  const subtitle = strings.t(subtitleKeyFor(error), errorParams(error))
  notify.error(subtitle ? `${title} — ${subtitle}` : title)
}

function emitEmpty(alfredClient: FastAlfred): void {
  // The action terminates with no further script-filter output — Alfred
  // closes immediately after the notification fires.
  const output: AlfredScriptFilter = { items: [] }
  alfredClient.output(output)
}
