/**
 * Story 1.5 unit tests for `src/common/script-filter.ts`.
 *
 * Coverage targets:
 *   - Icon registry resolves all 9 IconKey values to expected paths
 *   - Light vs dark variants differ by the `@dark` suffix
 *   - row() returns the canonical AlfredItem shape with sensible defaults
 *   - Optional fields (uid, subtitle, quicklookurl, mods) are passed through
 *     when present and OMITTED from the returned object when absent
 *   - row() uses the registry-resolved icon path
 *   - row() inherits the row-builder's theme by default
 */
import { describe, expect, it } from 'vitest'
import type { IconKey } from '../../src/common/constants'
import { createIconRegistry, createRowBuilder } from '../../src/common/script-filter'

const BUNDLE_DIR = '/fake/bundle'

describe('createIconRegistry — pathFor', () => {
  it('returns the light @1x path by default', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR })
    expect(registry.pathFor('person')).toBe('/fake/bundle/assets/icons/person.png')
  })

  it('returns the @dark variant when theme=dark is requested', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR })
    expect(registry.pathFor('person', 'dark')).toBe('/fake/bundle/assets/icons/person@dark.png')
  })

  it('honors the configured defaultTheme when no theme is passed', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR, defaultTheme: 'dark' })
    expect(registry.pathFor('deal')).toBe('/fake/bundle/assets/icons/deal@dark.png')
  })

  it('strips a trailing slash from bundleDir', () => {
    const registry = createIconRegistry({ bundleDir: '/fake/bundle/' })
    expect(registry.pathFor('error')).toBe('/fake/bundle/assets/icons/error.png')
  })

  it('resolves every IconKey from the DESIGN.md UX-DR2 set', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR })
    const keys: IconKey[] = ['person', 'company', 'deal', 'task', 'info', 'sync', 'error', 'warning', 'success']
    for (const key of keys) {
      expect(registry.pathFor(key)).toBe(`/fake/bundle/assets/icons/${key}.png`)
      expect(registry.pathFor(key, 'dark')).toBe(`/fake/bundle/assets/icons/${key}@dark.png`)
    }
  })
})

describe('createRowBuilder — required fields and defaults', () => {
  const registry = createIconRegistry({ bundleDir: BUNDLE_DIR })
  const row = createRowBuilder(registry)

  it('returns the canonical AlfredItem shape with sensible defaults', () => {
    const item = row({ title: 'Hello', icon: 'info' })
    expect(item).toEqual({
      title: 'Hello',
      arg: '',
      valid: true,
      icon: { path: '/fake/bundle/assets/icons/info.png' },
    })
  })

  it('passes through optional uid / subtitle / quicklookurl when provided', () => {
    const item = row({
      uid: 'rec-1',
      title: 'Florian Marin',
      subtitle: 'CTO · Acme Corp',
      icon: 'person',
      arg: 'https://app.attio.com/...',
      quicklookurl: 'file:///cache/quicklook/person-rec-1.html',
    })
    expect(item.uid).toBe('rec-1')
    expect(item.subtitle).toBe('CTO · Acme Corp')
    expect(item.arg).toBe('https://app.attio.com/...')
    expect(item.quicklookurl).toBe('file:///cache/quicklook/person-rec-1.html')
  })

  it('omits optional fields that were not provided', () => {
    const item = row({ title: 'Hello', icon: 'info' })
    expect(item).not.toHaveProperty('uid')
    expect(item).not.toHaveProperty('subtitle')
    expect(item).not.toHaveProperty('quicklookurl')
    expect(item).not.toHaveProperty('mods')
  })

  it('passes through mods when present', () => {
    const item = row({
      title: 'Florian Marin',
      icon: 'person',
      mods: {
        cmd: { valid: true, arg: 'https://linkedin.com/in/florian', subtitle: 'Open LinkedIn' },
        alt: { valid: false, subtitle: 'Write note…' },
      },
    })
    expect(item.mods?.cmd?.arg).toBe('https://linkedin.com/in/florian')
    expect(item.mods?.alt?.valid).toBe(false)
  })

  it('honors valid: false for non-selectable rows', () => {
    const item = row({ title: 'Loading…', icon: 'sync', valid: false })
    expect(item.valid).toBe(false)
  })
})

describe('createRowBuilder — theme propagation', () => {
  it('uses light theme by default', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR })
    const row = createRowBuilder(registry)
    const item = row({ title: 't', icon: 'task' })
    expect(item.icon.path).toBe('/fake/bundle/assets/icons/task.png')
  })

  it('threads the explicit theme through to icon resolution', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR })
    const rowDark = createRowBuilder(registry, 'dark')
    const item = rowDark({ title: 't', icon: 'task' })
    expect(item.icon.path).toBe('/fake/bundle/assets/icons/task@dark.png')
  })

  it('row-builder theme overrides registry defaultTheme', () => {
    const registry = createIconRegistry({ bundleDir: BUNDLE_DIR, defaultTheme: 'dark' })
    const row = createRowBuilder(registry, 'light')
    const item = row({ title: 't', icon: 'task' })
    expect(item.icon.path).toBe('/fake/bundle/assets/icons/task.png')
  })
})
