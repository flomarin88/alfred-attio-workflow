/**
 * Diagnostic snapshot builder for Story 1.8 — `attio:diag`.
 *
 * Pure functions only. Consumes already-collected inputs (identity,
 * cache ages, last error, workflow version) and emits the fixed
 * 7-row snapshot per EXPERIENCE.md §`attio:diag`. Row 2 (`Me: …`) is
 * suppressed when `includeIdentity` is false, leaving 6 rows.
 *
 * Privacy floor (UX-DR9 / NFR-009 / NFR-010): the builder NEVER touches
 * a PAT byte or a PAT hash. Row 3 surfaces presence only. Row 5 trusts
 * that the caller redacted record IDs at persistence time (see
 * `diag-state.ts`). The unit tests assert no PAT / hash / UUID slips
 * into any row's title or subtitle.
 */
import type { Identity } from './attio/identity'
import type { DiagCategory } from './cache'
import type { IconKey } from './constants'
import type { DiagLastError, DiagLifecycleWarnings } from './diag-state'
import type { Strings } from './strings'

const DASH = '—'

/** Order matters — matches EXPERIENCE.md microcopy template. */
const CATEGORY_ORDER: readonly DiagCategory[] = ['tasks', 'people', 'companies', 'deals', 'schemas']

export interface DiagInputs {
  /** Resolved identity from the local config store, if present. */
  identity?: Identity
  /** True when a PAT is currently set (no bytes — just presence). */
  patPresent: boolean
  /** Age in milliseconds per cache category. Missing entries render as `—`. */
  cacheAges: Partial<Record<DiagCategory, number>>
  /** Most recent persisted error (record IDs already redacted). */
  lastError?: DiagLastError
  /**
   * Persisted lifecycle slug warnings per object (FR-033 / Story 2.5).
   * When defined and non-empty, an extra `diag-lifecycle` row is inserted
   * just before the last-error row. `undefined` keeps the snapshot at
   * its baseline 6/7 rows.
   */
  lifecycleWarnings?: DiagLifecycleWarnings
  /** Workflow semver from `alfredInfo.workflowVersion()`. */
  workflowVersion: string
  /** When false, row 2 (`Me: …`) is suppressed. */
  includeIdentity: boolean
}

/**
 * Pure spec for a diagnostic row. The main script (`src/main/diag.ts`)
 * resolves `icon` to a path via the Story 1.5 icon registry. Tests work
 * against this shape directly — no Alfred dependency.
 */
export interface DiagRow {
  uid: string
  title: string
  subtitle: string
  icon: IconKey
  valid: false
  arg: ''
}

/** Renders a single age into a compact `Ns / Nm / Nh / Nd` string. */
export function formatAge(ms: number | undefined): string {
  if (ms === undefined || ms < 0) return DASH
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h`
  return `${Math.floor(ms / (24 * 60 * 60_000))}d`
}

/**
 * Renders the cache-age subtitle: `tasks 2m · people 8m · …` in fixed
 * order so the diag snapshot stays diff-friendly across runs.
 */
export function formatCacheAges(ages: Partial<Record<DiagCategory, number>>): string {
  return CATEGORY_ORDER.map((category) => `${category} ${formatAge(ages[category])}`).join(' · ')
}

/**
 * Renders the lifecycle warnings subtitle. Returns an empty string when
 * no warnings are present (caller suppresses the row). Order is fixed
 * (person · company · deal) so the snapshot stays diff-friendly.
 */
export function formatLifecycleWarnings(warnings: DiagLifecycleWarnings | undefined): string {
  if (!warnings) return ''
  const entries: string[] = []
  if (warnings.person) entries.push(`person: ${warnings.person}`)
  if (warnings.company) entries.push(`company: ${warnings.company}`)
  if (warnings.deal) entries.push(`deal: ${warnings.deal}`)
  return entries.join(' · ')
}

function row(spec: Omit<DiagRow, 'valid' | 'arg'>): DiagRow {
  return { ...spec, valid: false, arg: '' }
}

export function buildDiagRows(inputs: DiagInputs, strings: Strings): DiagRow[] {
  const rows: DiagRow[] = []

  // Row 0 — non-affiliation disclaimer (UX-DR8 / legal floor).
  rows.push(
    row({
      uid: 'diag-0',
      title: strings.t('diag.disclaimer.title'),
      subtitle: strings.t('diag.disclaimer.subtitle'),
      icon: 'info',
    }),
  )

  // Row 1 — workspace.
  rows.push(
    row({
      uid: 'diag-1',
      title: inputs.identity
        ? strings.t('diag.workspace.title', { workspace_name: inputs.identity.workspaceName })
        : strings.t('diag.workspace.unset'),
      subtitle: inputs.identity
        ? strings.t('diag.workspace.subtitle', { workspace_slug: inputs.identity.workspaceSlug })
        : DASH,
      icon: 'info',
    }),
  )

  // Row 2 — me (conditional). The workspace_member_id IS shown here per
  // EXPERIENCE.md; the per-user opt-out lives in DIAG_INCLUDE_IDENTITY.
  if (inputs.includeIdentity) {
    rows.push(
      row({
        uid: 'diag-2',
        title: strings.t('diag.me.title'),
        subtitle: inputs.identity
          ? strings.t('diag.me.subtitle', { workspace_member_id: inputs.identity.workspaceMemberId })
          : DASH,
        icon: 'info',
      }),
    )
  }

  // Row 3 — token presence. No bytes. No hash. No prefix. No length.
  rows.push(
    row({
      uid: 'diag-3',
      title: inputs.patPresent ? strings.t('diag.token.configured') : strings.t('diag.token.missing'),
      subtitle: '',
      icon: 'info',
    }),
  )

  // Row 4 — cache age. Hidden when no PAT (no cache traffic possible).
  rows.push(
    row({
      uid: 'diag-4',
      title: strings.t('diag.cache.title'),
      subtitle: inputs.patPresent ? formatCacheAges(inputs.cacheAges) : DASH,
      icon: 'info',
    }),
  )

  // Row 4b (optional) — lifecycle config warnings (FR-033 / Story 2.5).
  // Inserted between cache and last-error ONLY when at least one object
  // has a persisted "slug not found in schema" entry. Absent in the
  // default case so the snapshot stays at 6/7 rows.
  const lifecycleSubtitle = formatLifecycleWarnings(inputs.lifecycleWarnings)
  if (lifecycleSubtitle) {
    rows.push(
      row({
        uid: 'diag-lifecycle',
        title: strings.t('diag.lifecycle.title'),
        subtitle: lifecycleSubtitle,
        icon: 'warning',
      }),
    )
  }

  // Row 5 — last error. Trust the redaction step that ran at persistence
  // time (see `diag-state.recordLastError`). NEVER surface raw record IDs
  // or full PAT-bearing URLs here.
  rows.push(
    row({
      uid: 'diag-5',
      title: strings.t('diag.lastError.title'),
      subtitle: inputs.lastError
        ? `${inputs.lastError.iso} · ${inputs.lastError.httpStatus ?? DASH} · ${inputs.lastError.endpointPattern}`
        : DASH,
      icon: 'error',
    }),
  )

  // Row 6 — workflow version.
  rows.push(
    row({
      uid: 'diag-6',
      title: strings.t('diag.version.title'),
      subtitle: inputs.workflowVersion,
      icon: 'info',
    }),
  )

  return rows
}
