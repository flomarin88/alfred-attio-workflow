/**
 * Story 3.4 — `renderDealFiche` unit tests.
 *
 * AC coverage:
 *   - DEAL kind tag + display name heading
 *   - Stage rendered as status pill (`.pill-status` span) using verbatim workspace label (FR-039)
 *   - Pill renders for several stage labels including non-Latin characters
 *   - Other rows: value, linked company, primary contact, close date, last updated
 *   - Missing fields silently omitted (FR-036)
 *   - Component contract identical to Story 3.2
 *   - Snapshot diff stays stable
 */
import { describe, expect, it } from 'vitest'
import { type DealFicheInput, renderDealFiche } from '../../src/common/deal-fiche'
import { type Strings, createStrings } from '../../src/common/strings'

function makeStrings(locale: 'en' | 'fr' = 'en'): Strings {
  return createStrings({ localeOverride: locale })
}

const BUNDLE_DIR = '/Users/test/Library/Alfred/workflow.bundle'
const FIXED_NOW = new Date('2026-06-10T12:00:00Z')

function defaults(overrides: Partial<DealFicheInput> = {}): DealFicheInput {
  return {
    id: 'rec_deal',
    name: 'Acme expansion',
    stage: 'Discovery',
    value: '$50,000',
    linkedCompanyName: 'Acme Inc.',
    primaryPersonName: 'Jane Doe',
    closeDateAt: '2026-09-15T00:00:00Z',
    lastUpdatedAt: '2026-06-09T08:00:00Z',
    ...overrides,
  }
}

describe('renderDealFiche — header', () => {
  it('emits an uppercase DEAL kind tag and the deal name in a display heading', () => {
    const html = renderDealFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toContain('<p class="kind">DEAL</p>')
    expect(html).toContain('<h1 class="display">Acme expansion</h1>')
  })
})

describe('renderDealFiche — stage status pill (FR-039)', () => {
  function pillOf(stage: string): string {
    return renderDealFiche(defaults({ stage }), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
  }

  it.each([
    ['Discovery'],
    ['Closed Won'],
    ['Qualification'],
    ['Négociation'], // accented Latin
    ['進行中'], // Japanese (Chinese characters)
    ['Согласование'], // Cyrillic
    ['🚀 Launch'], // emoji prefix
  ])('renders stage label %s verbatim inside the .pill-status span', (stage) => {
    const html = pillOf(stage)
    expect(html).toContain(`<span class="pill-status">${stage}</span>`)
    // Pill row label is "Stage".
    expect(html).toContain('<dt>Stage</dt>')
  })

  it('escapes a stage label that contains HTML-significant characters', () => {
    const html = pillOf('<script>alert(1)</script>')
    expect(html).toContain('<span class="pill-status">&lt;script&gt;alert(1)&lt;/script&gt;</span>')
    expect(html).not.toMatch(/<script[\s>]/i)
  })

  it('does NOT render a pill row when stage is missing', () => {
    const html = renderDealFiche(defaults({ stage: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    // The .pill-status CSS class is always declared in the layout block;
    // assert only that no `<span class="pill-status">` markup was emitted.
    expect(html).not.toContain('<span class="pill-status">')
    expect(html).not.toContain('<dt>Stage</dt>')
  })

  it('declares the .pill-status component in the layout CSS (surface-raised + outline)', () => {
    const html = pillOf('Discovery')
    expect(html).toContain('.pill-status')
    expect(html).toContain('background: var(--surface-raised);')
    expect(html).toContain('border: 1px solid var(--outline);')
  })
})

describe('renderDealFiche — field rows (all present)', () => {
  const html = renderDealFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it.each([
    ['Value', '$50,000'],
    ['Company', 'Acme Inc.'],
    ['Primary contact', 'Jane Doe'],
  ])('renders dt %s + dd %s', (label, value) => {
    expect(html).toContain(`<dt>${label}</dt><dd>${value}</dd>`)
  })

  it('renders a formatted close date (not the raw ISO)', () => {
    expect(html).toMatch(/<dt>Close date<\/dt><dd>[A-Z][a-z]+ \d+, \d{4}<\/dd>/)
    expect(html).not.toContain('2026-09-15T00:00:00Z')
  })

  it('renders a formatted last-updated value', () => {
    expect(html).toMatch(/<dt>Last updated<\/dt><dd>[A-Z][a-z]+ \d+, \d{4}<\/dd>/)
  })
})

describe('renderDealFiche — missing fields silently omitted (FR-036)', () => {
  it('renders a stage-only fiche when other fields are missing', () => {
    const html = renderDealFiche(
      { id: 'rec_x', name: 'Lean deal', stage: 'Discovery' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toContain('<h1 class="display">Lean deal</h1>')
    expect(html).toContain('<span class="pill-status">Discovery</span>')
    expect(html).not.toContain('<dt>Value</dt>')
    expect(html).not.toContain('<dt>Company</dt>')
    expect(html).not.toContain('<dt>Primary contact</dt>')
    expect(html).not.toContain('<dt>Close date</dt>')
    expect(html).not.toContain('<dt>Last updated</dt>')
  })

  it('drops the close-date row when the ISO is invalid', () => {
    const html = renderDealFiche(defaults({ closeDateAt: 'not-a-date' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Close date</dt>')
  })

  it('produces a name-only fiche when every other field is missing', () => {
    const html = renderDealFiche(
      { id: 'rec_min', name: 'Solo' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toContain('<h1 class="display">Solo</h1>')
    expect(html).not.toContain('<dt>')
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('—')
  })
})

describe('renderDealFiche — component contract parity', () => {
  const html = renderDealFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it('is a complete semantic HTML document', () => {
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<section>')
    expect(html).toContain('<dl>')
    expect(html).toMatch(/<\/html>\s*$/)
  })

  it('embeds bundled WOFF2 references and dark-mode tokens', () => {
    expect(html).toContain(`file://${BUNDLE_DIR}/assets/fonts/Inter.woff2`)
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).not.toContain('data:')
  })
})

describe('renderDealFiche — snapshot (diff stability)', () => {
  it('matches the stored snapshot for a fully-populated deal', () => {
    const html = renderDealFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toMatchSnapshot()
  })

  it('matches the stored snapshot for a non-Latin stage label', () => {
    const html = renderDealFiche(defaults({ stage: '進行中' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toMatchSnapshot()
  })
})
