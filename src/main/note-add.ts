/**
 * Keyword entry: note-add (Story 4.2 / FR-016).
 *
 * Wired from every record-bearing script-filter via `mods.alt.arg`:
 * pressing ⌥⏎ on a person / company / deal / task row fires this
 * action with a JSON-encoded payload — the row builder packs the
 * record's slug + ID + display name + the current Alfred query
 * together so the worker doesn't need a round-trip to resolve them.
 *
 * Arg shape:
 *   { "slug": "people"|"companies"|"deals"|"tasks", "id": "...",
 *     "content": "<full Alfred query>", "recordName": "Jane Doe" }
 *
 * Flow:
 *   1. Parse the JSON payload; defend against malformed input.
 *   2. Preflight `checkOnline()`; offline → fire the offline-block
 *      notification (NFR-007 / FR-051).
 *   3. Sanitize the content (newlines → space, control chars stripped,
 *      trailing whitespace trimmed) per FR-016 / Story 4.2 AC.
 *   4. Derive the title = `content.slice(0, 80)`.
 *   5. `POST /v2/notes` with the parent reference + content + title.
 *   6. On success fire the success notification interpolating the
 *      record display name. `client.createNote` already invalidates the
 *      parent record cache entry (FR-047).
 *   7. On failure fire the `errors.{kind}` notification.
 */
import type { AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore } from '@common/attio/identity'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { persistWorkflowError } from '@common/diag-state'
import { type WorkflowError, errorParams, subtitleKeyFor, titleKeyFor } from '@common/error'
import { deriveSingleLineTitle, sanitizeSingleLineContent } from '@common/notes'
import { createNotify } from '@common/notify'
import { checkOnline } from '@common/offline'
import { createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

interface NoteAddPayload {
  slug: string
  id: string
  content: string
  recordName?: string
}

;(async () => {
  const alfredClient = new FastAlfred()
  try {
    const strings = createStrings()
    const cache = createCache(alfredClient.cache)
    const config = alfredClient.config as unknown as ConfigStore
    const notify = createNotify({ workflowName: alfredClient.alfredInfo.workflowName() })

    const rawInput = (alfredClient.input ?? '').trim()
    if (!rawInput) {
      alfredClient.log('[note-add] missing payload; nothing to do')
      emitEmpty(alfredClient)
      return
    }

    const payload = parsePayload(rawInput)
    if (!payload) {
      alfredClient.log('[note-add] payload could not be parsed as JSON')
      notify.error(strings.t('errors.unknown.title'))
      emitEmpty(alfredClient)
      return
    }

    const pat = alfredClient.env.getEnv<string>(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })
    if (!pat) {
      notify.error(strings.t('errors.auth-invalid.title'))
      emitEmpty(alfredClient)
      return
    }

    // FR-051 / NFR-007 — preflight offline.
    const online = await checkOnline()
    if (!online) {
      notify.error(`${strings.t('offline.preflight-block.title')} — ${strings.t('offline.preflight-block.subtitle')}`)
      emitEmpty(alfredClient)
      return
    }

    const content = sanitizeSingleLineContent(payload.content)
    if (!content) {
      alfredClient.log('[note-add] sanitized content is empty; no note created')
      emitEmpty(alfredClient)
      return
    }
    const title = deriveSingleLineTitle(content)

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

    const endpoint = '/v2/notes'
    const noteResult = await client.createNote({
      parentObject: payload.slug,
      parentRecordId: payload.id,
      title,
      content,
      format: 'plaintext',
    })
    if (!noteResult.ok) {
      notifyError(alfredClient, strings, notify, config, endpoint, noteResult.error)
      emitEmpty(alfredClient)
      return
    }

    notify.success(strings.t('success.note-added.subtitle', { record_name: payload.recordName ?? payload.id }))

    emitEmpty(alfredClient)
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

function parsePayload(input: string): NoteAddPayload | undefined {
  try {
    const parsed = JSON.parse(input) as unknown
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const obj = parsed as Record<string, unknown>
    const slug = typeof obj.slug === 'string' ? obj.slug : undefined
    const id = typeof obj.id === 'string' ? obj.id : undefined
    const content = typeof obj.content === 'string' ? obj.content : undefined
    if (!slug || !id || content === undefined) return undefined
    const recordName = typeof obj.recordName === 'string' ? obj.recordName : undefined
    return { slug, id, content, ...(recordName !== undefined ? { recordName } : {}) }
  } catch {
    return undefined
  }
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
  alfredClient.log(`[note-add] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))}`)
  const title = strings.t(titleKeyFor(error), errorParams(error))
  const subtitle = strings.t(subtitleKeyFor(error), errorParams(error))
  notify.error(subtitle ? `${title} — ${subtitle}` : title)
}

function emitEmpty(alfredClient: FastAlfred): void {
  const output: AlfredScriptFilter = { items: [] }
  alfredClient.output(output)
}
