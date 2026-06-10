/**
 * Shared task-fiche input builder — used by `src/main/task.ts` and
 * `src/main/todo.ts` (Story 3.5). Wires the AttioClient + identity +
 * Task struct into a `TaskFicheInput` ready for `renderTaskFiche`.
 *
 * Keeps the linked-record name resolution + assignee mapping in ONE
 * place so the `task` and `todo` keywords share the same fiche
 * semantics. The keyword scripts own the file I/O (writeQuicklookHtml)
 * and the `quicklookurl` assignment — see the `attachTaskFiches`
 * patterns in the corresponding `src/main/*.ts` files.
 *
 * Boundary: this file uses only common modules — no fast-alfred, no
 * `node:fs/promises`. The AttioClient is dependency-injected.
 */
import type { AttioClient } from './attio/client'
import type { Identity } from './attio/identity'
import type { RecordItem, Task } from './attio/schemas'
import type { TaskAssigneeRole, TaskFicheInput } from './task-fiche'

interface LinkedNames {
  person?: string
  deal?: string
  company?: string
}

/**
 * Returns the assignee role for the fiche. `'me'` when at least one
 * `assigneeIds` entry matches `identity.workspaceMemberId`. `'other'`
 * when there are assignees but none of them are the current user.
 * `undefined` skips the row entirely.
 */
export function resolveAssigneeRole(task: Task, identity: Identity | undefined): TaskAssigneeRole | undefined {
  if (task.assigneeIds.length === 0) return undefined
  if (identity && task.assigneeIds.some((id) => id === identity.workspaceMemberId)) return 'me'
  return 'other'
}

function readDisplayName(record: RecordItem): string | undefined {
  const arr = (record.values as Record<string, unknown>).name as Array<Record<string, unknown>> | undefined
  const first = arr?.[0]
  if (!first) return undefined
  const fullName = first.full_name
  if (typeof fullName === 'string' && fullName.length > 0) return fullName
  const value = first.value
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Picks the FIRST linked record per object kind (people / deals /
 * companies) and resolves their display name in parallel. Returns a
 * `LinkedNames` struct with at most one name per kind.
 */
async function resolveLinkedNames(client: AttioClient, task: Task): Promise<LinkedNames> {
  const pick = (slug: string) => task.linkedRecords.find((l) => l.targetObject === slug)?.targetRecordId
  const personId = pick('people')
  const dealId = pick('deals')
  const companyId = pick('companies')

  const [person, deal, company] = await Promise.all([
    personId ? client.getRecord('people', personId) : Promise.resolve(undefined),
    dealId ? client.getRecord('deals', dealId) : Promise.resolve(undefined),
    companyId ? client.getRecord('companies', companyId) : Promise.resolve(undefined),
  ])

  const out: LinkedNames = {}
  if (person?.ok) {
    const name = readDisplayName(person.data)
    if (name) out.person = name
  }
  if (deal?.ok) {
    const name = readDisplayName(deal.data)
    if (name) out.deal = name
  }
  if (company?.ok) {
    const name = readDisplayName(company.data)
    if (name) out.company = name
  }
  return out
}

/**
 * Builds the `TaskFicheInput` for a given task by resolving its
 * assignee role + linked-record names. Used by the keyword scripts as
 * input to `renderTaskFiche`.
 */
export async function buildTaskFicheInput(
  task: Task,
  identity: Identity | undefined,
  client: AttioClient,
): Promise<TaskFicheInput> {
  const linked = await resolveLinkedNames(client, task)
  return {
    id: task.id,
    content: task.content,
    deadlineAt: task.deadlineAt,
    assignee: resolveAssigneeRole(task, identity),
    linkedPersonName: linked.person,
    linkedDealName: linked.deal,
    linkedCompanyName: linked.company,
  }
}
