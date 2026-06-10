/**
 * Story 3.3 — `renderCompanyFiche` unit tests.
 *
 * AC coverage:
 *   - COMPANY tag + display name heading
 *   - Field rows in fixed order (domain · industry · location · team · last-updated)
 *   - Linked-people count renders as a single field row, not a list
 *   - Missing fields silently omitted (FR-036)
 *   - Component contract identical to Story 3.2 (shell tags, dark mode, fonts)
 *   - Snapshot diff stays stable
 */
import { describe, expect, it } from 'vitest'
import { type CompanyFicheInput, renderCompanyFiche } from '../../src/common/company-fiche'
import { type Strings, createStrings } from '../../src/common/strings'

function makeStrings(locale: 'en' | 'fr' = 'en'): Strings {
  return createStrings({ localeOverride: locale })
}

const BUNDLE_DIR = '/Users/test/Library/Alfred/workflow.bundle'
const FIXED_NOW = new Date('2026-06-10T12:00:00Z')

function defaults(overrides: Partial<CompanyFicheInput> = {}): CompanyFicheInput {
  return {
    id: 'rec_acme',
    name: 'Acme Inc.',
    domain: 'acme.com',
    industry: 'Software',
    location: 'Paris, FR',
    teamCount: 42,
    lastUpdatedAt: '2026-06-09T08:00:00Z',
    ...overrides,
  }
}

describe('renderCompanyFiche — header', () => {
  it('emits an uppercase COMPANY kind tag and the name in a display heading', () => {
    const html = renderCompanyFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toContain('<p class="kind">COMPANY</p>')
    expect(html).toContain('<h1 class="display">Acme Inc.</h1>')
  })

  it('uses the active locale for html lang', () => {
    const html = renderCompanyFiche(defaults(), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings('fr'),
      now: FIXED_NOW,
    })
    expect(html).toContain('<html lang="fr">')
  })
})

describe('renderCompanyFiche — field rows (all present)', () => {
  const html = renderCompanyFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it.each([
    ['Domain', 'acme.com'],
    ['Industry', 'Software'],
    ['Location', 'Paris, FR'],
    ['Team size', '42'],
  ])('renders dt %s + dd %s', (label, value) => {
    expect(html).toContain(`<dt>${label}</dt><dd>${value}</dd>`)
  })

  it('renders a formatted last-updated value (not the raw ISO)', () => {
    expect(html).toMatch(/<dt>Last updated<\/dt><dd>[A-Z][a-z]+ \d+, \d{4}<\/dd>/)
    expect(html).not.toContain('2026-06-09T08:00:00Z')
  })

  it('renders the team count as a single field row, not a list', () => {
    expect(html).not.toContain('<ul>')
    expect(html).not.toContain('<ol>')
    expect(html).not.toContain('<li>')
    // Single dt/dd pair for Team size.
    const teamMatches = html.match(/<dt>Team size<\/dt>/g) ?? []
    expect(teamMatches).toHaveLength(1)
  })
})

describe('renderCompanyFiche — missing fields silently omitted (FR-036)', () => {
  it('renders only name + domain when other fields are missing', () => {
    const html = renderCompanyFiche(
      { id: 'rec_x', name: 'Acme', domain: 'acme.com' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toContain('<h1 class="display">Acme</h1>')
    expect(html).toContain('<dt>Domain</dt><dd>acme.com</dd>')
    expect(html).not.toContain('<dt>Industry</dt>')
    expect(html).not.toContain('<dt>Location</dt>')
    expect(html).not.toContain('<dt>Team size</dt>')
    expect(html).not.toContain('<dt>Last updated</dt>')
  })

  it('omits the location row when location is missing', () => {
    const html = renderCompanyFiche(defaults({ location: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Location</dt>')
    expect(html).not.toContain('Paris')
  })

  it('omits the team-size row when teamCount is undefined', () => {
    const html = renderCompanyFiche(defaults({ teamCount: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Team size</dt>')
  })

  it('renders teamCount=0 as the literal "0" (empty team is a signal, not a missing value)', () => {
    const html = renderCompanyFiche(defaults({ teamCount: 0 }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toContain('<dt>Team size</dt><dd>0</dd>')
  })

  it('produces a name-only fiche when every other field is missing', () => {
    const html = renderCompanyFiche(
      { id: 'rec_x', name: 'Solo' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toContain('<h1 class="display">Solo</h1>')
    expect(html).not.toContain('<dt>')
    // No empty values leaked.
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('—')
  })
})

describe('renderCompanyFiche — component contract (parity with Story 3.2)', () => {
  const html = renderCompanyFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it('is a complete HTML document with semantic tags', () => {
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<section>')
    expect(html).toContain('<dl>')
    expect(html).toContain('<dt>')
    expect(html).toContain('<dd>')
    expect(html).toMatch(/<\/html>\s*$/)
  })

  it('declares the design tokens and dark-mode media query', () => {
    expect(html).toContain('--ink-primary: #1c1d1f;') // light
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).toContain('--ink-primary: #f5f5f7;') // dark
  })

  it('embeds bundled WOFF2 @font-face references (no base64)', () => {
    expect(html).toContain(`file://${BUNDLE_DIR}/assets/fonts/Inter.woff2`)
    expect(html).toContain(`file://${BUNDLE_DIR}/assets/fonts/JetBrainsMono.woff2`)
    expect(html).not.toContain('data:')
    expect(html).not.toContain('base64')
  })

  it('escapes interpolated values (XSS-safe)', () => {
    const html = renderCompanyFiche(defaults({ name: '<script>alert(1)</script>', industry: '"><b>x</b>' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toMatch(/<h1[^>]*><script/)
    expect(html).toContain('&quot;&gt;&lt;b&gt;x&lt;/b&gt;')
  })
})

describe('renderCompanyFiche — snapshot (diff stability)', () => {
  it('matches the stored snapshot for a fully-populated company', () => {
    const html = renderCompanyFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toMatchSnapshot()
  })

  it('matches the stored snapshot for a name + domain only company', () => {
    const html = renderCompanyFiche(
      { id: 'rec_min', name: 'Acme', domain: 'acme.com' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toMatchSnapshot()
  })
})
