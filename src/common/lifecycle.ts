/**
 * Lifecycle attribute helpers — Story 2.5 / FR-033.
 *
 * Workspace owners configure a per-object lifecycle attribute slug via
 * `LIFECYCLE_ATTRIBUTE_PERSON|COMPANY|DEAL`. The keyword script verifies
 * the slug exists in the schema (24h-cached `getObjectAttributes`); when
 * it does, the slug is passed to the row builder and the value is read
 * off the record and appended to the subtitle as `· {lifecycle_value}`.
 * Missing slug → silent skip + persisted warning surfaced by `attio:diag`.
 */
import type { RecordItem } from './attio/schemas'

function asArray(value: unknown): Array<Record<string, unknown>> | undefined {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : undefined
}

function readString(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

/**
 * Extracts the displayable lifecycle value from a record for the given
 * slug. Walks the common Attio shapes in order:
 *   - status:  `values.<slug>[0].status.title`
 *   - select:  `values.<slug>[0].option.title`
 *   - plain :  `values.<slug>[0].value`
 *
 * Returns `undefined` when the slug is unset/empty, the record has no
 * value for the slug, or the shape is unparseable.
 */
export function extractLifecycleValue(record: RecordItem, slug: string | undefined): string | undefined {
  if (!slug) return undefined
  const arr = asArray((record.values as Record<string, unknown>)[slug])
  const first = arr?.[0]
  if (!first) return undefined
  const status = first.status
  if (typeof status === 'object' && status !== null) {
    const title = readString(status as Record<string, unknown>, 'title', 'name')
    if (title) return title
  }
  const option = first.option
  if (typeof option === 'object' && option !== null) {
    const title = readString(option as Record<string, unknown>, 'title', 'name')
    if (title) return title
  }
  return readString(first, 'value', 'title', 'name')
}

/**
 * True when the configured slug is present in the workspace attribute
 * schema. Drives the silent-skip path in the keyword script.
 */
export function lifecycleSlugExists(attributes: ReadonlyArray<{ slug: string }>, configuredSlug: string): boolean {
  return attributes.some((a) => a.slug === configuredSlug)
}
