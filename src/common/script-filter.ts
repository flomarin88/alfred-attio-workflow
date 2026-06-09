/**
 * ScriptFilter row builder + icon registry.
 *
 * Story 1.5 — Architecture §Implementation Patterns / Communication
 * Patterns: every Alfred row goes through `row(...)` so icon lookups,
 * default fields, and mod register stay uniform. No keyword script
 * constructs `AlfredItem` literals directly.
 *
 * The icon registry maps `IconKey` → PNG path under
 * `bundleDir/assets/icons/<name>.png` (light) or `<name>@dark.png` (dark).
 * Alfred picks the `@2x` variant on Retina displays automatically when
 * pointed at the `@1x` filename.
 */
import type { IconKey } from './constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark'

export interface AlfredMod {
  valid?: boolean
  arg?: string
  subtitle?: string
}

/**
 * Subset of the Alfred ScriptFilter list-item shape we actually produce.
 * Aligned with fast-alfred's `AlfredListItem` but kept here so the
 * common layer stays runtime-agnostic and testable.
 */
export interface AlfredItem {
  uid?: string
  title: string
  subtitle?: string
  arg: string
  valid: boolean
  icon: { path: string }
  quicklookurl?: string
  mods?: {
    cmd?: AlfredMod
    alt?: AlfredMod
    shift?: AlfredMod
  }
}

export interface RowOptions {
  uid?: string
  title: string
  subtitle?: string
  icon: IconKey
  arg?: string
  quicklookurl?: string
  /** Defaults to `true`. Errors and informational rows pass `false`. */
  valid?: boolean
  mods?: {
    cmd?: AlfredMod
    alt?: AlfredMod
    shift?: AlfredMod
  }
}

export interface IconRegistry {
  /**
   * Returns the absolute path to the icon PNG for the given key and
   * theme. Uses the bundleDir captured at registry-creation time.
   */
  pathFor(icon: IconKey, theme?: Theme): string
}

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

export interface IconRegistryOptions {
  /** Absolute path to the workflow bundle directory. */
  bundleDir: string
  /** Default theme when `pathFor` is called without a `theme` argument. */
  defaultTheme?: Theme
}

export function createIconRegistry(opts: IconRegistryOptions): IconRegistry {
  const bundleDir = opts.bundleDir.replace(/\/$/, '')
  const baselineTheme: Theme = opts.defaultTheme ?? 'light'

  return {
    pathFor(icon, theme = baselineTheme) {
      const suffix = theme === 'dark' ? '@dark' : ''
      return `${bundleDir}/assets/icons/${icon}${suffix}.png`
    },
  }
}

// ---------------------------------------------------------------------------
// row() builder
// ---------------------------------------------------------------------------

export type RowBuilder = (opts: RowOptions) => AlfredItem

export function createRowBuilder(iconRegistry: IconRegistry, theme?: Theme): RowBuilder {
  return function row(opts) {
    const item: AlfredItem = {
      title: opts.title,
      arg: opts.arg ?? '',
      valid: opts.valid ?? true,
      icon: { path: iconRegistry.pathFor(opts.icon, theme) },
    }

    if (opts.uid !== undefined) item.uid = opts.uid
    if (opts.subtitle !== undefined) item.subtitle = opts.subtitle
    if (opts.quicklookurl !== undefined) item.quicklookurl = opts.quicklookurl
    if (opts.mods !== undefined) item.mods = opts.mods

    return item
  }
}
