/**
 * Keyword entry: `attio:diag`. Story 1.8.
 *
 * Renders the fixed 7-row (or 6-row when `DIAG_INCLUDE_IDENTITY=false`)
 * diagnostic snapshot. Read-only against `alfredClient.config` and
 * `alfredClient.cache` — no Attio API calls, so this keyword keeps
 * working even when the workspace is unreachable.
 */
import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred'
import { FastAlfred } from 'fast-alfred'
import { type ConfigStore, loadIdentity } from '@common/attio/identity'
import { type DiagCategory, createCache } from '@common/cache'
import { buildDiagRows } from '@common/diag'
import { readLastError } from '@common/diag-state'
import { createIconRegistry, createRowBuilder } from '@common/script-filter'
import { createStrings } from '@common/strings'
import { Variables } from '@common/variables.enum'

const CATEGORIES: readonly DiagCategory[] = ['tasks', 'people', 'companies', 'deals', 'schemas']

;(async () => {
  const alfredClient = new FastAlfred()
  try {
    const cache = createCache(alfredClient.cache)
    const strings = createStrings()
    const config = alfredClient.config as unknown as ConfigStore

    const pat = alfredClient.env.getEnv<string>(Variables.API_KEY, { defaultValue: process.env.API_KEY ?? '' })
    const includeIdentityRaw = alfredClient.env.getEnv<string>(Variables.DIAG_INCLUDE_IDENTITY, {
      defaultValue: 'true',
    })
    const includeIdentity = (includeIdentityRaw ?? 'true').toLowerCase() !== 'false'

    const identity = loadIdentity(config)
    const lastError = readLastError(config)

    const now = Date.now()
    const cacheAges: Partial<Record<DiagCategory, number>> = {}
    for (const category of CATEGORIES) {
      const setAt = cache.lastSetAt(category)
      if (setAt !== undefined) cacheAges[category] = now - setAt
    }

    const bundleDir = process.cwd()
    const iconRegistry = createIconRegistry({ bundleDir })
    const buildRow = createRowBuilder(iconRegistry)

    const diagRows = buildDiagRows(
      {
        identity,
        patPresent: Boolean(pat),
        cacheAges,
        lastError,
        workflowVersion: alfredClient.alfredInfo.workflowVersion() || '0.0.0',
        includeIdentity,
      },
      strings,
    )

    // The cast bridges our internal `AlfredItem` shape (runtime-agnostic)
    // to fast-alfred's `AlfredListItem`. The two diverge only on the
    // optional `mods.cmd.arg` field, which Story 1.8 rows never set —
    // a structural alignment pass is tracked for Epic 3 (Quick Look mods).
    const items = diagRows.map((spec) =>
      buildRow({
        uid: spec.uid,
        title: spec.title,
        subtitle: spec.subtitle,
        icon: spec.icon,
        valid: false,
      }),
    ) as unknown as AlfredListItem[]

    const output: AlfredScriptFilter = { items }
    alfredClient.output(output)
  } catch (error) {
    alfredClient.error(error as Error)
  }
})()
