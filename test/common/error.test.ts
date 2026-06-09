/**
 * Story 1.2 unit tests for `src/common/error.ts`.
 *
 * Coverage targets:
 *   - `ok` / `err` round-trip
 *   - `Result` discriminated-union type guards
 *   - All seven WorkflowError `kind` variants:
 *       - `titleKeyFor` and `subtitleKeyFor` produce the FR-051 key family
 *       - `errorRow` returns an ErrorRowSpec with the right title/subtitle keys
 *       - No PAT bytes, no `raw` HTTP body, no `httpStatus` integer leak into
 *         the rendered row's title, subtitle, or params
 */
import { describe, expect, it } from 'vitest'
import {
  type Result,
  type WorkflowError,
  err,
  errorParams,
  errorRow,
  isErr,
  isOk,
  ok,
  subtitleKeyFor,
  titleKeyFor,
} from '../../src/common/error'

describe('Result<T, E>', () => {
  it('ok() wraps a value in the success branch', () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 })
  })

  it('err() wraps an error in the failure branch', () => {
    const e: WorkflowError = { kind: 'auth-invalid', httpStatus: 401 }
    expect(err(e)).toEqual({ ok: false, error: e })
  })

  it('isOk / isErr return the right boolean for both branches', () => {
    const success: Result<number, WorkflowError> = ok(7)
    const failure: Result<number, WorkflowError> = err({ kind: 'unreachable' })

    expect(isOk(success)).toBe(true)
    expect(isErr(success)).toBe(false)
    expect(isOk(failure)).toBe(false)
    expect(isErr(failure)).toBe(true)
  })

  it('isOk narrows to the data field', () => {
    const success: Result<number, WorkflowError> = ok(7)
    // Using a type-narrowing assertion via the guard, then a single expect.
    const data = isOk(success) ? success.data : null
    expect(data).toBe(7)
  })

  it('isErr narrows to the error field', () => {
    const failure: Result<number, WorkflowError> = err({ kind: 'unreachable' })
    const kind = isErr(failure) ? failure.error.kind : null
    expect(kind).toBe('unreachable')
  })
})

describe('WorkflowError → microcopy keys', () => {
  const cases: { error: WorkflowError; expectedTitle: string }[] = [
    { error: { kind: 'auth-invalid', httpStatus: 401 }, expectedTitle: 'errors.auth-invalid.title' },
    { error: { kind: 'auth-scope-missing', httpStatus: 403 }, expectedTitle: 'errors.auth-scope-missing.title' },
    {
      error: { kind: 'record-not-found', httpStatus: 404, slug: 'deals', id: 'abc' },
      expectedTitle: 'errors.record-not-found.title',
    },
    {
      error: { kind: 'validation', httpStatus: 422, attioMessage: 'email required' },
      expectedTitle: 'errors.validation.title',
    },
    { error: { kind: 'rate-limit', httpStatus: 429, retryAfter: 30 }, expectedTitle: 'errors.rate-limit.title' },
    { error: { kind: 'unreachable', cause: 'socket' }, expectedTitle: 'errors.unreachable.title' },
    { error: { kind: 'unknown', httpStatus: 500 }, expectedTitle: 'errors.unknown.title' },
  ]

  it.each(cases)('titleKeyFor maps $error.kind → $expectedTitle', ({ error, expectedTitle }) => {
    expect(titleKeyFor(error)).toBe(expectedTitle)
  })

  it.each(cases)('subtitleKeyFor maps $error.kind → errors.{kind}.subtitle', ({ error }) => {
    expect(subtitleKeyFor(error)).toBe(`errors.${error.kind}.subtitle`)
  })
})

describe('errorParams — substitution payload', () => {
  it('rate-limit surfaces retryAfter', () => {
    expect(errorParams({ kind: 'rate-limit', httpStatus: 429, retryAfter: 30 })).toEqual({ retryAfter: 30 })
  })

  it('validation surfaces attioMessage verbatim (FR-051 422 rule)', () => {
    const params = errorParams({
      kind: 'validation',
      httpStatus: 422,
      attioMessage: 'Email is required',
    })
    expect(params).toEqual({ attioMessage: 'Email is required' })
  })

  it('validation with fieldSlug carries both', () => {
    const params = errorParams({
      kind: 'validation',
      httpStatus: 422,
      attioMessage: 'must be lowercase',
      fieldSlug: 'primary_email_address',
    })
    expect(params).toEqual({ attioMessage: 'must be lowercase', fieldSlug: 'primary_email_address' })
  })

  it('record-not-found surfaces slug and id', () => {
    expect(errorParams({ kind: 'record-not-found', httpStatus: 404, slug: 'people', id: 'rec_x' })).toEqual({
      slug: 'people',
      id: 'rec_x',
    })
  })

  it('auth-scope-missing without fieldSlug returns empty params', () => {
    expect(errorParams({ kind: 'auth-scope-missing', httpStatus: 403 })).toEqual({})
  })

  it('unknown does NOT leak raw HTTP body or httpStatus into params', () => {
    const params = errorParams({
      kind: 'unknown',
      httpStatus: 500,
      raw: 'Authorization: Bearer pat_secret_value_42',
    })
    expect(params).toEqual({})
    expect(JSON.stringify(params)).not.toContain('pat_secret_value_42')
    expect(JSON.stringify(params)).not.toContain('Bearer')
    expect(JSON.stringify(params)).not.toContain('500')
  })

  it('auth-invalid never carries the PAT', () => {
    const params = errorParams({ kind: 'auth-invalid', httpStatus: 401 })
    expect(params).toEqual({})
  })
})

describe('errorRow', () => {
  const allKinds: WorkflowError[] = [
    { kind: 'auth-invalid', httpStatus: 401 },
    { kind: 'auth-scope-missing', httpStatus: 403, fieldSlug: 'primary_email_address' },
    { kind: 'record-not-found', httpStatus: 404, slug: 'people', id: 'rec_abc' },
    { kind: 'validation', httpStatus: 422, attioMessage: 'Email is invalid' },
    { kind: 'rate-limit', httpStatus: 429, retryAfter: 30 },
    { kind: 'unreachable', cause: 'socket' },
    { kind: 'unknown', httpStatus: 500, raw: 'Bearer pat_secret_value_42' },
  ]

  it.each(allKinds.map((e) => [e.kind, e] as const))('round-trips kind %s', (_kind, error) => {
    const row = errorRow(error)

    expect(row.uid).toBe(`error-${error.kind}`)
    expect(row.title).toBe(`errors.${error.kind}.title`)
    expect(row.subtitle).toBe(`errors.${error.kind}.subtitle`)
    expect(row.valid).toBe(false)
    expect(row.arg).toBe('')
    expect(['error', 'warning']).toContain(row.icon)
    expect(row.params).toEqual(errorParams(error))
  })

  it('uses the warning icon for transient kinds (rate-limit, unreachable)', () => {
    expect(errorRow({ kind: 'rate-limit', httpStatus: 429, retryAfter: 5 }).icon).toBe('warning')
    expect(errorRow({ kind: 'unreachable' }).icon).toBe('warning')
  })

  it('uses the error icon for auth / validation / record-not-found / unknown', () => {
    expect(errorRow({ kind: 'auth-invalid', httpStatus: 401 }).icon).toBe('error')
    expect(errorRow({ kind: 'auth-scope-missing', httpStatus: 403 }).icon).toBe('error')
    expect(errorRow({ kind: 'record-not-found', httpStatus: 404, slug: 'x', id: 'y' }).icon).toBe('error')
    expect(errorRow({ kind: 'validation', httpStatus: 422, attioMessage: 'm' }).icon).toBe('error')
    expect(errorRow({ kind: 'unknown' }).icon).toBe('error')
  })

  it('never inlines literal user-facing copy — title/subtitle are keys, not sentences', () => {
    for (const error of allKinds) {
      const row = errorRow(error)
      // A microcopy key matches /^errors\.[a-z-]+\.(title|subtitle)$/.
      expect(row.title).toMatch(/^errors\.[a-z-]+\.title$/)
      expect(row.subtitle).toMatch(/^errors\.[a-z-]+\.subtitle$/)
      // No spaces, no punctuation other than the dot separator.
      expect(row.title).not.toMatch(/[\s,;!?:]/)
      expect(row.subtitle).not.toMatch(/[\s,;!?:]/)
    }
  })

  it('never leaks the unknown.raw HTTP body or PAT bytes through the row', () => {
    const row = errorRow({
      kind: 'unknown',
      httpStatus: 500,
      raw: 'Bearer pat_secret_value_42 / X-User: very-private',
    })
    const serialized = JSON.stringify(row)
    expect(serialized).not.toContain('pat_secret_value_42')
    expect(serialized).not.toContain('Bearer')
    expect(serialized).not.toContain('very-private')
    expect(serialized).not.toContain('500')
  })

  it('never leaks the unknown.httpStatus through the row', () => {
    for (const status of [400, 418, 500, 502, 503]) {
      const row = errorRow({ kind: 'unknown', httpStatus: status })
      expect(JSON.stringify(row)).not.toContain(String(status))
    }
  })
})
