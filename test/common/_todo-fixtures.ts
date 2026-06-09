/**
 * Shared fixtures for `todo.test.ts`.
 *
 * Underscore-prefixed filename so vitest's default test-glob does not
 * try to execute it as a suite of its own.
 */
import type { Identity } from '../../src/common/attio/identity'
import type { Task } from '../../src/common/attio/schemas'
import { type Strings, createStrings } from '../../src/common/strings'

export const identity: Identity = {
  workspaceId: 'wks_abc',
  workspaceSlug: 'studio-florian-marin',
  workspaceName: 'Studio Florian Marin',
  workspaceMemberId: 'mem_xyz',
}

export const READMEAnchor = 'https://github.com/flomarin88/alfred-attio-workflow#setup'

export function makeStrings(): Strings {
  return createStrings({ localeOverride: 'en' })
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't_default',
    content: 'Default task',
    deadlineAt: undefined,
    isCompleted: false,
    assigneeIds: ['mem_xyz'],
    linkedRecords: [],
    createdAt: '2026-06-09T08:00:00',
    ...overrides,
  }
}
