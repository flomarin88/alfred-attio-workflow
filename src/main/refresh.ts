/**
 * Keyword entry: `attio:refresh`. Story 1.9.
 *
 * Wipes every cache entry + persisted identity + diag last-error, then
 * re-fetches `/v2/self`, `/v2/objects`, and the attribute list per
 * object. On success fires the FR-032 macOS notification; on failure
 * the FR-051 error notification. Returns no list — Alfred closes after
 * the notification, and the next keyword invocation rebuilds caches
 * lazily.
 */
import type { AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { AttioClient } from '@common/attio/client'
import type { ConfigStore } from '@common/attio/identity'
import { createCache } from '@common/cache'
import { errorParams, subtitleKeyFor, titleKeyFor } from '@common/error'
import { createNotify } from '@common/notify'
import { patMissingError, runRefresh } from '@common/refresh'
import { createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

;(async () => {
  const alfredClient = new FastAlfred()
  try {
    const strings = createStrings()
    const cache = createCache(alfredClient.cache)
    const config = alfredClient.config as unknown as ConfigStore
    const notify = createNotify({ workflowName: alfredClient.alfredInfo.workflowName() })

    const pat = alfredClient.env.getEnv<string>(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })

    const result = pat
      ? await runRefresh({
          client: new AttioClient({ accessToken: pat, cache }),
          cache,
          config,
          htmlCacheDir: alfredClient.alfredInfo.cache(),
        })
      : patMissingError()

    if (result.ok) {
      notify.success(
        strings.t('refresh.success.title', {
          object_count: result.data.objectCount,
          attribute_set_count: result.data.attributeSetCount,
        }),
      )
    } else {
      const title = strings.t(titleKeyFor(result.error), errorParams(result.error))
      const subtitle = strings.t(subtitleKeyFor(result.error), errorParams(result.error))
      notify.error(subtitle ? `${title} — ${subtitle}` : title)
    }

    // Empty list: Alfred closes after the notification fires.
    const output: AlfredScriptFilter = { items: [] }
    alfredClient.output(output)
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()
