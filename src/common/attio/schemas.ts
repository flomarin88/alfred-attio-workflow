/**
 * zod schemas for Attio API responses + `snake_case` → `camelCase`
 * transformations. Story 1.7 read paths; Story 5.x will add write
 * encoders under `encoders/`.
 *
 * Each schema is intentionally permissive on the wire — `passthrough()`
 * allows Attio to add fields without breaking parses — but strict on the
 * fields V1 actually consumes. The `IdentitySchema` lives in
 * `./identity.ts` and is not duplicated here.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// List response envelope
// ---------------------------------------------------------------------------

/**
 * Every list endpoint at Attio wraps results in `{ data: [...] }`.
 * Use as `ListResponseSchema(ItemSchema)` and read `.data`.
 */
export function listResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item) })
}

// ---------------------------------------------------------------------------
// /v2/objects — workspace object discovery
// ---------------------------------------------------------------------------

export const ObjectInfoSchema = z
  .object({
    id: z.object({ object_id: z.string() }).passthrough(),
    api_slug: z.string(),
    singular_noun: z.string().nullish(),
    plural_noun: z.string().nullish(),
  })
  .passthrough()
  .transform((raw) => ({
    id: raw.id.object_id,
    slug: raw.api_slug,
    singularNoun: raw.singular_noun ?? raw.api_slug,
    pluralNoun: raw.plural_noun ?? raw.api_slug,
  }))

export type ObjectInfo = z.infer<typeof ObjectInfoSchema>

// ---------------------------------------------------------------------------
// /v2/objects/{slug}/attributes — attribute definitions
// ---------------------------------------------------------------------------

export const AttributeDefSchema = z
  .object({
    id: z.object({ attribute_id: z.string() }).passthrough(),
    api_slug: z.string(),
    title: z.string(),
    type: z.string(),
    is_archived: z.boolean().optional(),
    is_system_attribute: z.boolean().optional(),
    is_writable: z.boolean().optional(),
  })
  .passthrough()
  .transform((raw) => ({
    id: raw.id.attribute_id,
    slug: raw.api_slug,
    title: raw.title,
    type: raw.type,
    isArchived: raw.is_archived ?? false,
    isSystem: raw.is_system_attribute ?? false,
    isWritable: raw.is_writable ?? true,
  }))

export type AttributeDef = z.infer<typeof AttributeDefSchema>

// ---------------------------------------------------------------------------
// /v2/tasks — task list
// ---------------------------------------------------------------------------

const LinkedRecordRefSchema = z.object({
  target_object: z.string(),
  target_record_id: z.string(),
})

const AssigneeRefSchema = z.object({
  workspace_member_id: z.string(),
})

export const TaskSchema = z
  .object({
    id: z.object({ task_id: z.string() }).passthrough(),
    content_plaintext: z.string().nullish(),
    deadline_at: z.string().nullish(),
    is_completed: z.boolean(),
    assignees: z.array(AssigneeRefSchema).optional(),
    linked_records: z.array(LinkedRecordRefSchema).optional(),
    created_at: z.string().optional(),
  })
  .passthrough()
  .transform((raw) => ({
    id: raw.id.task_id,
    content: raw.content_plaintext ?? '',
    deadlineAt: raw.deadline_at ?? undefined,
    isCompleted: raw.is_completed,
    assigneeIds: (raw.assignees ?? []).map((a) => a.workspace_member_id),
    linkedRecords: (raw.linked_records ?? []).map((l) => ({
      targetObject: l.target_object,
      targetRecordId: l.target_record_id,
    })),
    createdAt: raw.created_at ?? '',
  }))

export type Task = z.infer<typeof TaskSchema>

// ---------------------------------------------------------------------------
// /v2/objects/{slug}/records/query — generic record list
// ---------------------------------------------------------------------------

/**
 * Records carry an `id.record_id`, a `web_url`, and a workspace-defined
 * `values` map whose shape varies by object. V1 keeps `values` as
 * `unknown` and lets callers extract the fields they need — typing every
 * attribute type would require a per-workspace schema discovery pass
 * that Story 1.7 deliberately defers.
 */
export const RecordSchema = z
  .object({
    id: z.object({ record_id: z.string() }).passthrough(),
    web_url: z.string().nullish(),
    values: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
  })
  .passthrough()
  .transform((raw) => ({
    id: raw.id.record_id,
    webUrl: raw.web_url ?? '',
    values: raw.values ?? {},
    createdAt: raw.created_at ?? '',
  }))

export type RecordItem = z.infer<typeof RecordSchema>
