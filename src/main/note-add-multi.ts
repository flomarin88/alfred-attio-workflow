/**
 * Keyword entry: note-add-multi (Story 4.3 / FR-017).
 *
 * Wired from every record-bearing script-filter via
 * `mods["alt+shift"].arg`: pressing ⇧⌥⏎ on a person / company / deal /
 * task row fires this action with a JSON-encoded payload — the row
 * builder packs the record's slug + ID + display name. Unlike the
 * Story 4.2 single-line variant, the content is collected
 * interactively via an NSAlert prompt; the Alfred query is irrelevant
 * here.
 *
 * Flow:
 *   1. Parse the JSON payload (slug + id + recordName).
 *   2. Preflight `checkOnline()`; offline → fire the offline-block
 *      notification (NFR-007 / FR-051).
 *   3. Prompt the user with `multiLinePrompt`. Cancel or empty body →
 *      return without an API call.
 *   4. Sanitize the multi-line content (newlines preserved, control
 *      chars stripped, per-line trailing whitespace trimmed) per
 *      Story 4.3 AC + FR-017.
 *   5. Derive the title = first non-empty line sliced to 80 chars.
 *   6. `POST /v2/notes` with the parent reference + content + title.
 *   7. On success fire the success notification interpolating the
 *      record display name. `client.createNote` already invalidates the
 *      parent record cache entry (FR-047).
 *   8. On failure fire the `errors.{kind}` notification.
 */
import type { AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore } from '@common/attio/identity'
import { createAuth } from '@common/auth'
import { createCache } from '@common/cache'
import { persistWorkflowError } from '@common/diag-state'
import { type WorkflowError, errorParams, subtitleKeyFor, titleKeyFor } from '@common/error'
import { deriveMultiLineTitle, sanitizeMultiLineContent } from '@common/notes'
import { createNotify } from '@common/notify'
import { checkOnline } from '@common/offline'
import { multiLinePrompt } from '@common/prompt'
import { createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

interface NoteAddMultiPayload {
  slug: string
  id: string
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
      alfredClient.log('[note-add-multi] missing payload; nothing to do')
      emitEmpty(alfredClient)
      return
    }

    const payload = parsePayload(rawInput)
    if (!payload) {
      alfredClient.log('[note-add-multi] payload could not be parsed as JSON')
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

    // FR-051 / NFR-007 — preflight offline BEFORE prompting so the user
    // doesn't type a note that we then can't post.
    const online = await checkOnline()
    if (!online) {
      notify.error(`${strings.t('offline.preflight-block.title')} — ${strings.t('offline.preflight-block.subtitle')}`)
      emitEmpty(alfredClient)
      return
    }

    const recordLabel = payload.recordName ?? payload.id
    const promptResult = await multiLinePrompt({
      recordName: recordLabel,
      promptText: strings.t('notes.multiline-prompt', { record_name: recordLabel }),
      bundleDir: process.cwd(),
    })
    if (!promptResult.accepted) {
      // Cancel or empty content → no API call per Story 4.3 AC.
      emitEmpty(alfredClient)
      return
    }

    const content = sanitizeMultiLineContent(promptResult.content)
    if (!content) {
      // Sanitized down to nothing → treat as empty cancel.
      emitEmpty(alfredClient)
      return
    }
    const title = deriveMultiLineTitle(content) || recordLabel

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

    notify.success(strings.t('success.note-added.subtitle', { record_name: recordLabel }))

    emitEmpty(alfredClient)
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()

function parsePayload(input: string): NoteAddMultiPayload | undefined {
  try {
    const parsed = JSON.parse(input) as unknown
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const obj = parsed as Record<string, unknown>
    const slug = typeof obj.slug === 'string' ? obj.slug : undefined
    const id = typeof obj.id === 'string' ? obj.id : undefined
    if (!slug || !id) return undefined
    const recordName = typeof obj.recordName === 'string' ? obj.recordName : undefined
    return { slug, id, ...(recordName !== undefined ? { recordName } : {}) }
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
  alfredClient.log(
    `[note-add-multi] kind=${error.kind} endpoint=${endpoint} params=${JSON.stringify(errorParams(error))}`,
  )
  const title = strings.t(titleKeyFor(error), errorParams(error))
  const subtitle = strings.t(subtitleKeyFor(error), errorParams(error))
  notify.error(subtitle ? `${title} — ${subtitle}` : title)
}

function emitEmpty(alfredClient: FastAlfred): void {
  const output: AlfredScriptFilter = { items: [] }
  alfredClient.output(output)
}
