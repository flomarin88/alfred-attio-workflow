---
title: Alfred Workflow for Attio CRM — Design
status: final
created: 2026-06-05
updated: 2026-06-05
sources:
  - ../prds/prd-alfred-attio-workflow-2026-06-04/prd.md
  - ../prds/prd-alfred-attio-workflow-2026-06-04/addendum.md
colors:
  background: '#ffffff'
  surface: '#ffffff'
  surface-raised: '#fafafa'
  ink-primary: '#1c1d1f'
  ink-secondary: '#54565b'
  ink-tertiary: '#6e7077'
  divider: '#e8e9eb'
  outline: '#9ea0a6'
  accent: '#266df0'
  accent-hover: '#1f5dd1'
  on-accent: '#ffffff'
  success: '#0fc27b'
  warning: '#f5b900'
  error: '#ff5b59'
  on-error: '#ffffff'
  highlight: '#fff8d6'
typography:
  display:
    fontFamily: Inter Display, Inter, system-ui, -apple-system, sans-serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  heading:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  subheading:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.005em
  body:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.45'
    letterSpacing: -0.01em
  label:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.04em
    textTransform: uppercase
  mono:
    fontFamily: JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 12px
    fontWeight: '450'
    lineHeight: '1.5'
rounded:
  none: 0
  xs: 2px
  sm: 3px
  DEFAULT: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  unit: 4px
  gutter: 12px
  fiche-padding: 20px
  fiche-row-gap: 8px
  fiche-section-gap: 16px
components:
  fiche:
    background: surface
    color: ink-primary
    padding: fiche-padding
    border: 1px solid divider
    radius: lg
  fiche-row:
    color: ink-primary
    rowGap: fiche-row-gap
    labelColor: ink-tertiary
    labelTransform: uppercase
    labelTracking: 0.04em
  list-item-icon:
    size: 14px
    strokeWidth: 1.5
    color: ink-secondary
  edit-affordance:
    color: accent
    arrow: → edit
  pill-status:
    background: surface-raised
    border: 1px solid outline
    radius: full
    padding: 2px 8px
    fontSize: 11px
    color: ink-primary
---

# Design

> Visual identity tokens for the Alfred workflow that mirrors Attio's editorial-cold register. Light mode is the frontmatter default; dark mode is specified inline under Colors. Token names use the workflow's own scheme (not Attio's internal CSS variable names, which are private).

## Brand & Style

The workflow is **register-compatible with Attio without claiming origin** — editorial-cold, calm productivity, simplicity. It is an unofficial, community-built tool for Attio users; the visual language draws on the same disciplines (Inter at weight 500, near-black ink, single-blue accent, restrained elevation) so the workflow does not visually clash when used alongside Attio, but every distribution surface — README, Alfred Gallery listing, `attio:diag`, and a first-run notification — carries an explicit non-affiliation statement. See EXPERIENCE.md microcopy catalog for the disclaimer strings and the Components section below for the icon-licensing commitment (Lucide / SIL OFL, never traced from Attio's assets).

The style is **muted, deliberate, and quietly typographic**. Depth comes from **1-pixel borders and subtle elevation**, not shadows. Color is **restrained**: a near-black ink on white, a single brand-blue accent (`#266df0`), and three semantic colors used sparingly. Typography is **Inter at weight 500** with **negative tracking** — the same tightening Attio uses to give body copy its grown-up, "boutique software" feel. No emoji, no rounded cartoon glyphs, no marketing gradients.

Two registers coexist:

- **Inside Alfred** (list items, drill-down rows) the workflow owns icon + title + subtitle + mod-text only. Visual identity lives in **icon choice and microcopy register**.
- **Inside Quick Look** (the HTML preview pane, FR-034) the workflow owns the full canvas. This is where the editorial-cold register lands fully — fiches that read like a record card from Attio, not a generic "preview" web page.

The README, GitHub release page, and Alfred Gallery listing inherit the same register: Inter, near-black on cream-white or pure white, single-blue accent, no marketing gloss.

## Colors

The palette has one accent only — `accent`. Semantic colors (success / warning / error) are used for state badges and inline icons, never as primary surfaces. Information hierarchy is carried by **ink weight** (`ink-primary` / `ink-secondary` / `ink-tertiary`), not by hue.

### Light mode (frontmatter default)

| Token                    | Hex       | Use                                                                                           |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------- |
| `background` / `surface` | `#ffffff` | Fiche background, default Alfred row underlay                                                 |
| `surface-raised`         | `#fafafa` | Subtle row alternation in long lists, status pills                                            |
| `ink-primary`            | `#1c1d1f` | Primary text — record name, fiche headings, active drill-down row                             |
| `ink-secondary`          | `#54565b` | Subtitle text in Alfred items, fiche row values                                               |
| `ink-tertiary`           | `#6e7077` | Field labels, metadata (last-updated, deadlines past)                                         |
| `divider`                | `#e8e9eb` | Fiche row separators, section dividers                                                        |
| `outline`                | `#9ea0a6` | Card border, status-pill outline (3.05:1 against `surface`, meets WCAG 3:1 for UI components) |
| `accent`                 | `#266df0` | Edit affordances, active selection cue, links in fiche                                        |
| `accent-hover`           | `#1f5dd1` | `accent` hover (Quick Look only — Alfred has no hover)                                        |
| `success`                | `#0fc27b` | "Connected to <workspace>" notification icon, task-completed badge                            |
| `warning`                | `#f5b900` | "Cached data shown" prefix, "Token rotation imminent" hint                                    |
| `error`                  | `#ff5b59` | 401 / 403 / 404 / 422 error notif icons; "RETARD" group label                                 |
| `highlight`              | `#fff8d6` | Search-match highlight inside fiche prose [ASSUMPTION: rare, V1 may not use]                  |

### Dark mode

Quick Look HTML responds to `prefers-color-scheme: dark`. Alfred list rendering is theme-controlled by the user's Alfred theme — the workflow only swaps icons (when the theme is dark) and chooses subtitle text that reads in both registers.

| Token                    | Dark hex                                                        |
| ------------------------ | --------------------------------------------------------------- |
| `background` / `surface` | `#101113`                                                       |
| `surface-raised`         | `#1a1c1f`                                                       |
| `ink-primary`            | `#f5f5f7`                                                       |
| `ink-secondary`          | `#b7b9be`                                                       |
| `ink-tertiary`           | `#9b9da3` _(passes AA-body against `#101113` at 4.71:1)_        |
| `divider`                | `#26282c`                                                       |
| `outline`                | `#5e6066` _(passes 3:1 against `surface-raised`)_               |
| `accent`                 | `#4a86ff` _(brightened from light's `#266df0` for AA contrast)_ |
| `accent-hover`           | `#6a9bff`                                                       |
| `success`                | `#10cc82`                                                       |
| `warning`                | `#ffc827`                                                       |
| `error`                  | `#ff6e6c`                                                       |
| `highlight`              | `#3a3415` _(muted gold)_                                        |

Contrast: `ink-primary` on `surface` exceeds WCAG AAA in both modes; `ink-secondary` on `surface` exceeds WCAG AA; `ink-tertiary` on `surface` stays at AA-large only and is reserved for labels, never running body.

## Typography

A single typeface family — **Inter** (SIL OFL) — carries the whole experience. Inter is **bundled with the `.alfredworkflow`** as WOFF2 (variable font) and `@font-face`-loaded by the Quick Look HTML; the Inter Display optical-size variant is reserved for the fiche `display` token. The font is never relied on as a system install, because Inter is not present on a default macOS. Monospace is **JetBrains Mono** (SIL OFL, also bundled) for code-like values (record IDs, API endpoint references in `attio:diag`).

The workflow does **not** ship a commercial serif in V1. Tiempos Text appears on some Attio surfaces but is commercially licensed and cannot be embedded in OSS; the calm-productivity register works in Inter alone. The fallback chain in `font-family` is `Inter Display, Inter, system-ui, -apple-system, sans-serif` — but the first two entries are bundled, so the system fallback is defensive only.

### Type ladder

| Token        | Use                                                                                 |
| ------------ | ----------------------------------------------------------------------------------- |
| `display`    | Fiche headline only — the record's primary name at the top of the Quick Look pane   |
| `heading`    | Section headings inside the fiche ("Linked records", "Recent activity")             |
| `subheading` | Drill-down row title in Alfred (carries the action verb: "Stage: Discovery — edit") |
| `body`       | Alfred result-list title, fiche row values                                          |
| `body-sm`    | Alfred result-list subtitle, fiche metadata                                         |
| `label`      | Fiche field labels (`COMPANY`, `DEADLINE`, `OWNER`) — uppercase, tracked            |
| `mono`       | Record IDs, workspace slugs, debug values in `attio:diag`                           |

Body weight is **500**, not 400. This is the Attio signature — text feels more confident at 500 weight, especially at 14px. Negative tracking (`-0.01em`) compensates for the optical "spread" of Inter at small sizes.

The display size (28px) is used **once per Quick Look fiche** — for the record name. Everything else stays at 18px or smaller. The fiche reads like a record card, not a marketing hero.

## Layout & Spacing

Base unit is **4px**. All measurable spacing is a multiple of 4. The Quick Look fiche uses three spacing tokens to define its rhythm:

- `fiche-padding: 20px` — outer padding of the card.
- `fiche-row-gap: 8px` — vertical gap between adjacent rows (label + value pairs).
- `fiche-section-gap: 16px` — between logical sections of the fiche (record header → fields → linked records → metadata).

Alfred list items inherit Alfred's own spacing (the workflow does not control row height or padding inside Alfred's chrome). The workflow does control the **subtitle separator** — the convention is **middle dot + space** (`·`) between segments of the per-object context line (FR-013), not slash or pipe.

There is no responsive grid: Quick Look is a fixed-width pane (~480px in practice, varies with Alfred version). The fiche layout is **single-column, left-aligned**. No multi-column grids in V1.

## Elevation & Depth

Depth comes from **borders and tonal shifts**, not shadows. The Quick Look fiche has:

- A **1-pixel border** (`outline`) — defines the card.
- A **subtle background** (`surface-raised`) on alternating rows where row count exceeds 4 — to aid scanning, not for decoration.
- **No drop shadow.** The fiche sits flush inside Alfred's Quick Look pane.

Status pills and edit affordances use **inset rings** (a 1-pixel inner border in `outline`) plus a subtle background fill. No glow, no blur, no neumorphic effects.

[ASSUMPTION] A faint top-shadow on the fiche may be added in dark mode to lift the card off the `#101113` background. To verify visually at finalize key-screen render.

## Shapes

Default border radius is **4px** (`rounded.DEFAULT`). The scale is sharp by design — Attio's editorial register avoids softness.

- `xs: 2px` — inline icons inside text, status pills.
- `sm: 3px` — small chips (mod-hint badges in Alfred items, if ever rendered).
- `4px` — fiche rows, edit affordances.
- `md: 6px` — fiche card corners (when rendered inside Quick Look's larger pane).
- `lg: 8px` — fiche outer card corner radius.
- `full: 9999px` — workspace member avatars (when shown), status pills.

The workflow does not use `xl: 12px` or larger in V1; the visual register stays compact.

## Components

The workflow has five visible component types. Their behavioral specs live in EXPERIENCE.md.

### 1. Alfred result-list item

What the workflow controls per ScriptFilter row: **icon (16×16) + title + subtitle + mod-text**.

- **Icon** — 16×16 PNG asset shipped with the workflow, one per object type and per state (default / completed / error). All icons are drawn from **Lucide** (ISC license) and never traced, copied, or derived from Attio's icon set. The mapping below is the V1 contract: `person` → `lucide:user`, `company` → `lucide:building-2`, `deal` → `lucide:handshake`, `task` → `lucide:circle-check` (default) / `lucide:circle-check-big` (completed) / `lucide:circle-alert` (error). Stroke 1.5, 14×14 visual on a 16×16 canvas. Both light and dark variants ship; Alfred swaps via the standard `iconType=fileicon` + suffix convention [ASSUMPTION: verify exact filename convention at build kickoff].
- **Title** — typography `body`. The record's primary name verbatim from Attio. Truncates at Alfred's natural width.
- **Subtitle** — typography `body-sm`. Per-object context line per FR-013, with `·` separators.
- **Mod-text** — appears when a mod is held. Should mirror the action ("Open LinkedIn", "Write note", "Mark complete"). Same `body-sm` weight; Alfred styles the color.

### 2. Quick Look fiche (HTML, fully owned)

The fiche is the workflow's flagship visual artifact. Per-object field maps in PRD addendum §E define content; this section defines visual form.

- **Card** — `background`, `outline` border, `rounded.lg` corners, `fiche-padding` outer padding.
- **Header row** — record primary name in `display` typography, optional small object-type label in `label` typography above it (`PERSON`, `COMPANY`, `DEAL`, `TASK`).
- **Field rows** — label + value pairs. Label in `label` typography (`ink-tertiary`), value in `body` (`ink-primary`). Row separator: 1-pixel `divider` line.
- **Linked records** — small avatars + names in a vertical list, separated from field rows by `fiche-section-gap`.
- **Status pill** (deal stage, task completion, lifecycle) — pill with `outline` border, `surface-raised` background, `body-sm` text. No fill color carries the status; the text + label carry it.
- **Metadata footer** — last-updated date in `body-sm` `ink-tertiary`, right-aligned. One line.

### 3. Drill-down list item (Alfred)

Same chrome as the result-list item. Three sub-types:

- **Editable field row** — title shows `<Field>: <current value>`, subtitle shows the type's edit prompt ("ENTER to edit", "ENTER to pick stage", "ENTER to choose company"). `edit-affordance` color cue (accent blue) shows in the subtitle as `→ edit`.
- **Linked-record row** — title shows the linked record's primary name; subtitle shows the object type label (`PERSON`, `COMPANY`, etc.). Per FR-019, **⏎** opens the linked record in Attio (not a nested drill-down — single-level constraint).
- **Action row** — title shows the action verb ("Write note…", "Mark complete"). Icon matches the action.

### 4. Setup prompt result (FR-022)

A single Alfred row, displayed when no PAT is configured. Icon `info`, title `Attio API token not configured`, subtitle `⏎ for setup instructions`. ⏎ opens the README in the default browser. No other affordances visible.

### 5. Status pill (in fiche and in subtitle when applicable)

Used for deal stage, task completion, lifecycle attribute. Token `pill-status`. The pill content is the workspace's actual attribute value verbatim ("Discovery", "Negotiation", "Customer"). No icon, no color — type and shape carry the affordance.

## Do's and Don'ts

**Do**

- Use Inter at weight 500 for body. Negative tracking (`-0.01em`) is non-negotiable for the editorial-cold feel.
- Carry hierarchy with ink weight, not hue. `ink-primary` / `ink-secondary` / `ink-tertiary` is the entire palette for type.
- Keep borders to 1px. Shadows stay at 0-5% opacity if used at all.
- Use `·` (middle dot + spaces) as the subtitle segment separator. Not `/`, not `|`, not `—`.
- Render Quick Look in both light and dark via `prefers-color-scheme`.
- Strip the PAT from any HTML output (cache files, debug values). NFR-010 is a design boundary.

**Don't**

- Don't use emoji or rounded cartoon glyphs anywhere. Object icons are outline, monoline, 1.5px stroke.
- Don't introduce a second accent color. The single-hue accent is the brand discipline.
- Don't use background fills for status. Pills are outlined; stage / status text is the signal.
- Don't add motion to the Quick Look fiche. The pane should feel static and authoritative — no fade-ins, no slide-ups.
- Don't render Tiempos or any commercial serif in V1. Inter only.
- Don't trace, copy, or derive icons from Attio's assets. V1 ships Lucide glyphs exclusively (mapping in Components above). If Lucide lacks a glyph for a future object type, source from another ISC/MIT/OFL-licensed set — never from Attio's own surfaces.
- Don't omit the non-affiliation disclaimer from any public-facing surface (README, Alfred Gallery, `attio:diag`, first-run notification). The disclaimer is the legal floor of the brand discipline, not optional polish.
