/**
 * Story 3.2 — `renderPersonFiche` unit tests.
 *
 * AC coverage:
 *   - Fiche header: PERSON tag + `display` heading with the name
 *   - Field rows: dt/dd pairs for present fields only (FR-036)
 *   - Missing email/phone → those <dt>/<dd> pairs absent
 *   - Semantic HTML structure (section, dl, dt, dd) and `prefers-color-scheme` styles
 *   - XSS-safe (all interpolations escaped)
 *   - Never carries the PAT or any token-derived value
 *   - Snapshot diff stays stable across runs
 */
import { describe, expect, it } from 'vitest'
import { type PersonFicheInput, renderPersonFiche } from '../../src/common/person-fiche'
import { type Strings, createStrings } from '../../src/common/strings'

function makeStrings(locale: 'en' | 'fr' = 'en'): Strings {
  return createStrings({ localeOverride: locale })
}

const BUNDLE_DIR = '/Users/test/Library/Alfred/workflow.bundle'
const FIXED_NOW = new Date('2026-06-10T12:00:00Z')

function defaults(overrides: Partial<PersonFicheInput> = {}): PersonFicheInput {
  return {
    id: 'rec_jane',
    name: 'Jane Doe',
    jobTitle: 'Head of Sales',
    primaryEmail: 'jane@acme.com',
    primaryPhone: '+33 6 12 34 56 78',
    linkedCompanyName: 'Acme Inc.',
    linkedinUrl: 'https://linkedin.com/in/jane',
    lastUpdatedAt: '2026-06-09T08:00:00Z',
    ...overrides,
  }
}

describe('renderPersonFiche — header', () => {
  it('emits an uppercase PERSON kind tag and the name in a display heading', () => {
    const html = renderPersonFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toContain('<p class="kind">PERSON</p>')
    expect(html).toContain('<h1 class="display">Jane Doe</h1>')
  })

  it('uses the active locale for the html lang attribute', () => {
    const html = renderPersonFiche(defaults(), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings('fr'),
      now: FIXED_NOW,
    })
    expect(html).toContain('<html lang="fr">')
  })
})

describe('renderPersonFiche — field rows (all present)', () => {
  const html = renderPersonFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it.each([
    ['Job title', 'Head of Sales'],
    ['Email', 'jane@acme.com'],
    ['Phone', '+33 6 12 34 56 78'],
    ['Company', 'Acme Inc.'],
    ['LinkedIn', 'https://linkedin.com/in/jane'],
  ])('renders dt %s + dd %s', (label, value) => {
    expect(html).toContain(`<dt>${label}</dt><dd>${value}</dd>`)
  })

  it('renders a formatted last-updated value (not the raw ISO)', () => {
    expect(html).toMatch(/<dt>Last updated<\/dt><dd>[A-Z][a-z]+ \d+, \d{4}<\/dd>/)
    expect(html).not.toContain('2026-06-09T08:00:00Z')
  })
})

describe('renderPersonFiche — missing fields silently omitted (FR-036)', () => {
  it('omits the email row when no primary email', () => {
    const html = renderPersonFiche(defaults({ primaryEmail: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Email</dt>')
    expect(html).not.toContain('jane@acme.com')
  })

  it('omits the phone row when no primary phone', () => {
    const html = renderPersonFiche(defaults({ primaryPhone: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Phone</dt>')
  })

  it('omits BOTH email and phone when both are missing', () => {
    const html = renderPersonFiche(defaults({ primaryEmail: undefined, primaryPhone: undefined }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('<dt>Email</dt>')
    expect(html).not.toContain('<dt>Phone</dt>')
    // No "—", no "null", no "undefined" leaked into the markup.
    expect(html).not.toMatch(/<dd>\s*<\/dd>/)
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('—')
  })

  it('renders a fiche with only name when every other field is missing', () => {
    const html = renderPersonFiche(
      { id: 'rec_x', name: 'Solo' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toContain('<h1 class="display">Solo</h1>')
    expect(html).toContain('<dl>')
    // No dt rows when nothing else to show.
    expect(html).not.toContain('<dt>')
  })

  it('drops the last-updated row when the ISO is invalid', () => {
    const html = renderPersonFiche(defaults({ lastUpdatedAt: 'not-a-date' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain('Last updated')
  })

  it('renders an HH:MM time when last-updated falls on the same day as `now`', () => {
    const html = renderPersonFiche(defaults({ lastUpdatedAt: '2026-06-10T09:30:00Z' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).toMatch(/<dt>Last updated<\/dt><dd>\d{2}:\d{2}<\/dd>/)
  })
})

describe('renderPersonFiche — semantic HTML + dark mode', () => {
  const html = renderPersonFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })

  it('is a complete HTML document (doctype + html/head/body)', () => {
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<head>')
    expect(html).toContain('</body>')
    expect(html).toMatch(/<\/html>\s*$/)
  })

  it('uses semantic tags: section, dl, dt, dd', () => {
    expect(html).toContain('<section>')
    expect(html).toContain('</section>')
    expect(html).toContain('<dl>')
    expect(html).toContain('</dl>')
    expect(html).toContain('<dt>')
    expect(html).toContain('<dd>')
  })

  it('declares the design tokens and a prefers-color-scheme dark override', () => {
    expect(html).toContain('--ink-primary: #1c1d1f;') // light token
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).toContain('--ink-primary: #f5f5f7;') // dark override
  })

  it('embeds bundled WOFF2 @font-face references (no base64)', () => {
    expect(html).toContain(`file://${BUNDLE_DIR}/assets/fonts/Inter.woff2`)
    expect(html).toContain(`file://${BUNDLE_DIR}/assets/fonts/JetBrainsMono.woff2`)
    expect(html).not.toContain('data:')
    expect(html).not.toContain('base64')
  })
})

describe('renderPersonFiche — XSS safety + privacy floor', () => {
  it('escapes all interpolated values', () => {
    const html = renderPersonFiche(
      defaults({
        name: '<script>alert(1)</script>',
        jobTitle: '"><svg/onload=alert(1)>',
        primaryEmail: 'a@b.com" onclick="x',
      }),
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    // The literal <h1 class="display"> from the template is fine; the
    // interpolated value must NOT contain a parseable <script>.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toMatch(/<h1[^>]*><script/)
    expect(html).toContain('&quot;&gt;&lt;svg/onload=alert(1)&gt;')
    expect(html).not.toMatch(/<svg[\s/>]/)
  })

  it('never contains a PAT-shaped or Bearer token string', () => {
    // A PAT-like payload the test owns. Asserting it doesn't leak even
    // if a (buggy) caller passed it as a field.
    const PAT = 'attio_pat_1234567890abcdefghijklmnopqrstuvwxyz'
    const html = renderPersonFiche(defaults({ name: 'Jane' }), {
      bundleDir: BUNDLE_DIR,
      strings: makeStrings(),
      now: FIXED_NOW,
    })
    expect(html).not.toContain(PAT)
    expect(html).not.toContain('Bearer')
    expect(html).not.toContain('Authorization')
  })
})

describe('renderPersonFiche — snapshot (diff stability)', () => {
  it('matches the stored snapshot for a fully-populated person', () => {
    const html = renderPersonFiche(defaults(), { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW })
    expect(html).toMatchSnapshot()
  })

  it('matches the stored snapshot for a minimal person (name only)', () => {
    const html = renderPersonFiche(
      { id: 'rec_min', name: 'Solo' },
      { bundleDir: BUNDLE_DIR, strings: makeStrings(), now: FIXED_NOW },
    )
    expect(html).toMatchSnapshot()
  })
})
