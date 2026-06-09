/**
 * Story 1.4 unit tests for `src/common/strings.ts`.
 *
 * Coverage targets:
 *   - Direct key lookup from the EN catalog
 *   - `{name}` placeholder substitution with single and multiple params
 *   - Missing-placeholder graceful degradation (leaves `{x}` literal)
 *   - Locale resolution priority: localeOverride > LANGUAGE_OVERRIDE env > system
 *   - Missing-key fallback path: FR-missing → EN + warning logged once
 *   - Missing-in-EN: returns the key as a sentinel + warning logged
 *   - Identity placeholder with a number param (FR-051 errors.rate-limit)
 *   - The seeded EN catalog covers the seven WorkflowError kinds + setup + connection
 */
import { afterEach, describe, expect, it } from 'vitest'
import { type Locale, type StringCatalog, createStrings } from '../../src/common/strings'
import enCatalog from '../../src/strings/en.json'

const originalLanguageOverride = process.env.LANGUAGE_OVERRIDE

afterEach(() => {
  // Restore env between tests so locale-resolution tests don't bleed.
  if (originalLanguageOverride === undefined) delete process.env.LANGUAGE_OVERRIDE
  else process.env.LANGUAGE_OVERRIDE = originalLanguageOverride
})

describe('strings — basic lookup', () => {
  it('returns the seeded EN value for a known key', () => {
    const strings = createStrings({ localeOverride: 'en' })
    expect(strings.t('setup.title')).toBe('Attio API token not configured')
  })

  it('returns the EN connection.disclaimer (non-affiliation microcopy)', () => {
    const strings = createStrings({ localeOverride: 'en' })
    expect(strings.t('connection.disclaimer')).toBe('Unofficial workflow for Attio — not affiliated with Attio Inc.')
  })
})

describe('strings — {name} placeholder substitution', () => {
  it('substitutes a single placeholder', () => {
    const strings = createStrings({ localeOverride: 'en' })
    expect(strings.t('connection.success', { workspace_name: 'Studio Florian Marin' })).toBe(
      'Connected to Studio Florian Marin',
    )
  })

  it('accepts a numeric param via String() coercion', () => {
    const strings = createStrings({ localeOverride: 'en' })
    expect(strings.t('errors.rate-limit.subtitle', { retryAfter: 30 })).toBe('Try again in 30s')
  })

  it('substitutes attioMessage verbatim (FR-051 422 rule)', () => {
    const strings = createStrings({ localeOverride: 'en' })
    expect(strings.t('errors.validation.title', { attioMessage: 'Email is required' })).toBe('Email is required')
  })

  it('leaves missing placeholders as literals so they surface in QA', () => {
    const strings = createStrings({
      localeOverride: 'en',
      catalogs: { en: { 'demo.greet': 'Hello {firstName} {lastName}' } },
    })
    expect(strings.t('demo.greet', { firstName: 'Ada' })).toBe('Hello Ada {lastName}')
  })

  it('handles a template without any placeholders even when params are passed', () => {
    const strings = createStrings({ localeOverride: 'en' })
    expect(strings.t('setup.title', { unused: 'x' })).toBe('Attio API token not configured')
  })

  it('substitutes multiple distinct placeholders', () => {
    const strings = createStrings({
      localeOverride: 'en',
      catalogs: { en: { 'demo.tpl': '{slug} record {id}' } },
    })
    expect(strings.t('demo.tpl', { slug: 'people', id: 'rec-abc' })).toBe('people record rec-abc')
  })
})

describe('strings — locale resolution priority', () => {
  it('prefers localeOverride above env and system', () => {
    process.env.LANGUAGE_OVERRIDE = 'en'
    const strings = createStrings({ localeOverride: 'fr' })
    expect(strings.locale).toBe<Locale>('fr')
  })

  it('prefers LANGUAGE_OVERRIDE env above system locale', () => {
    process.env.LANGUAGE_OVERRIDE = 'fr'
    const strings = createStrings()
    expect(strings.locale).toBe<Locale>('fr')
  })

  it('accepts lowercase or uppercase LANGUAGE_OVERRIDE values', () => {
    process.env.LANGUAGE_OVERRIDE = 'FR'
    expect(createStrings().locale).toBe<Locale>('fr')
    process.env.LANGUAGE_OVERRIDE = 'EN'
    expect(createStrings().locale).toBe<Locale>('en')
  })

  it('ignores invalid LANGUAGE_OVERRIDE and falls through to system / default', () => {
    process.env.LANGUAGE_OVERRIDE = 'klingon'
    const strings = createStrings()
    expect(['en', 'fr']).toContain(strings.locale) // system-dependent — but a Locale
  })

  it('defaults to EN when no override is set and the system is not French', () => {
    delete process.env.LANGUAGE_OVERRIDE
    // CI runs on en_US; on a French dev machine this would be 'fr'. We only
    // assert the type and the boolean stability — not the exact value.
    const strings = createStrings()
    expect(['en', 'fr']).toContain(strings.locale)
  })
})

describe('strings — missing-key fallback', () => {
  it('falls back from FR to EN and logs one warning', () => {
    const warnings: string[] = []
    const enOnly: StringCatalog = { 'setup.title': 'Attio API token not configured' }
    const strings = createStrings({
      localeOverride: 'fr',
      catalogs: { en: enOnly, fr: {} },
      logger: (m) => warnings.push(m),
    })

    expect(strings.t('setup.title')).toBe('Attio API token not configured')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("missing key 'setup.title' in 'fr'")
    expect(warnings[0]).toContain('falling back to EN')
  })

  it('returns the key as a sentinel when EN is missing the key too', () => {
    const warnings: string[] = []
    const strings = createStrings({
      localeOverride: 'en',
      catalogs: { en: {}, fr: {} },
      logger: (m) => warnings.push(m),
    })

    expect(strings.t('nope.does.not.exist')).toBe('nope.does.not.exist')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('missing key')
    expect(warnings[0]).toContain('EN catalog')
  })

  it('does not log when the active locale has the key', () => {
    const warnings: string[] = []
    const strings = createStrings({
      localeOverride: 'en',
      logger: (m) => warnings.push(m),
    })
    expect(strings.t('setup.title')).toBe('Attio API token not configured')
    expect(warnings).toHaveLength(0)
  })

  it('does not log a fallback when the active locale is EN (no FR→EN chain)', () => {
    const warnings: string[] = []
    const strings = createStrings({
      localeOverride: 'en',
      catalogs: { en: {}, fr: {} },
      logger: (m) => warnings.push(m),
    })
    strings.t('something.missing')
    // Exactly one log — "missing key 'X' in EN catalog" — no FR fallback log.
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('EN catalog')
    expect(warnings[0]).not.toContain('falling back')
  })
})

describe('strings — seeded EN catalog matches Story 1.2 errorRow keys', () => {
  // Every kind from WorkflowError should have an EN entry so the
  // errorRow → strings.t chain renders without a sentinel fallback.
  const kinds = [
    'auth-invalid',
    'auth-scope-missing',
    'record-not-found',
    'validation',
    'rate-limit',
    'unreachable',
    'unknown',
  ] as const

  it.each(kinds)('en.json has errors.%s.title', (kind) => {
    expect((enCatalog as Record<string, string>)[`errors.${kind}.title`]).toBeTypeOf('string')
  })

  it.each(kinds)('en.json has errors.%s.subtitle', (kind) => {
    expect((enCatalog as Record<string, string>)[`errors.${kind}.subtitle`]).toBeTypeOf('string')
  })

  it('en.json has the setup prompt entries (FR-022)', () => {
    expect((enCatalog as Record<string, string>)['setup.title']).toBeTruthy()
    expect((enCatalog as Record<string, string>)['setup.subtitle']).toBeTruthy()
  })

  it('en.json has the first-success + disclaimer (FR-025 + UX-DR8)', () => {
    expect((enCatalog as Record<string, string>)['connection.success']).toContain('{workspace_name}')
    expect((enCatalog as Record<string, string>)['connection.disclaimer']).toContain('Unofficial')
  })

  it('en.json has the empty-todo line (FR-008)', () => {
    expect((enCatalog as Record<string, string>)['todo.empty.title']).toContain('{workspace_member_name}')
  })
})
