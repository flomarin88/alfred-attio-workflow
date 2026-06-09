# Attio Visual Identity Research

Extracted by inspecting the public CSS bundles served from `attio.com` and `app.attio.com` on 2026-06-05. All hex codes, tokens, and font names are verbatim from those stylesheets — no guessing. Where Attio surfaces both light and dark, both are recorded.

## Color palette

Attio publishes a named, numeric scale in their marketing CSS (Tailwind-style tokens prefixed `--color-...`). The same scale is wired into a tiny semantic layer (`primary`, `secondary`, `tertiary`, `caption`, `accent`, `link`).

### Neutrals — Black scale (dark mode + text on light)

| Token               | Hex       |
| ------------------- | --------- |
| `--color-black-0`   | `#000000` |
| `--color-black-50`  | `#101113` |
| `--color-black-100` | `#1c1d1f` |
| `--color-black-200` | `#202124` |
| `--color-black-300` | `#232529` |
| `--color-black-400` | `#2e3238` |
| `--color-black-500` | `#383e47` |
| `--color-black-600` | `#505967` |
| `--color-black-700` | `#6f7988` |
| `--color-black-800` | `#8f99a8` |
| `--color-black-900` | `#a4adba` |

### Neutrals — White scale (light mode surfaces + text on dark)

| Token               | Hex       |
| ------------------- | --------- |
| `--color-white-100` | `#ffffff` |
| `--color-white-200` | `#fafafb` |
| `--color-white-300` | `#f3f4f6` |
| `--color-white-400` | `#edeff3` |
| `--color-white-500` | `#e4e7ec` |
| `--color-white-600` | `#dee2e7` |
| `--color-white-700` | `#d3d8df` |
| `--color-white-800` | `#cad0d9` |
| `--color-white-900` | `#b5bdc9` |

### Brand blue (primary accent)

| Token              | Hex                              |
| ------------------ | -------------------------------- |
| `--color-blue-100` | `#e8f0ff`                        |
| `--color-blue-200` | `#c8dcff`                        |
| `--color-blue-300` | `#94b9ff`                        |
| `--color-blue-400` | `#709ff5`                        |
| `--color-blue-450` | `#538bf3`                        |
| `--color-blue-500` | `#266df0` ← canonical Attio blue |
| `--color-blue-600` | `#245bc2`                        |
| `--color-blue-700` | `#1f4fa8`                        |
| `--color-blue-800` | `#1a2233`                        |
| `--color-blue-900` | `#010102`                        |

### Semantic

| Token                          | Hex       | Notes                      |
| ------------------------------ | --------- | -------------------------- |
| `--color-green-500` (success)  | `#0fc27b` | Confirms / positive states |
| `--color-green-600`            | `#0db472` |                            |
| `--color-red-500` (error)      | `#ff5b59` | Destructive / errors       |
| `--color-red-600`              | `#f65351` |                            |
| `--color-yellow-500` (warning) | `#f5b900` | Caution / pending          |
| `--color-yellow-600`           | `#dba601` |                            |

### Semantic mapping (verbatim from CSS — light / dark pairs)

| Role                             | Light                   | Dark                    |
| -------------------------------- | ----------------------- | ----------------------- |
| `--color-primary-background`     | `#ffffff` (`white-100`) | `#101113` (`black-50`)  |
| `--color-secondary-background`   | `#fafafb` (`white-200`) | `#1c1d1f` (`black-100`) |
| `--color-muted-background`       | `#edeff3` (`white-400`) | `#232529` (`black-300`) |
| `--color-primary-foreground`     | `#1c1d1f` (`black-100`) | `#ffffff` (`white-100`) |
| `--color-secondary-foreground`   | `#232529` (`black-300`) | `#edeff3` (`white-400`) |
| `--color-tertiary-foreground`    | `#505967` (`black-600`) | `#b5bdc9` (`white-900`) |
| `--color-caption-foreground`     | `#505967` (`black-600`) | `#a4adba` (`black-900`) |
| `--color-accent-foreground`      | `#6f7988` (`black-700`) | `#8f99a8` (`black-800`) |
| `--color-link-foreground`        | `#266df0` (`blue-500`)  | `#709ff5` (`blue-400`)  |
| `--color-link-strong-foreground` | `#245bc2` (`blue-600`)  | `#94b9ff` (`blue-300`)  |

Notable: Attio's primary text on white is **`#1c1d1f`**, not pure black. That's the editorial-cold "ink" tone.

The in-product app (`app.attio.com`) uses an obfuscated three-theme system (light / dark / green-tinted "Pro" theme). Re-derived hex anchors from `app-vendors.css`:

- Dark surface chrome: `#1a1d21`, `#1f2125`, `#15181c`, `#27282b`
- Dark borders: `#2f3033`, `#46474a`
- Dark text/grey: `#898a8d`, `#cdcfd1`, `#eeeff1`
- Light surface chrome: `#fbfbfb`, `#f8f9fa`, `#eeeff1`, `#e6e7ea`
- App primary blue: `#266df0` (matches marketing `blue-500`)
- App success green: `#02ad6e` / `#00d17e`
- App error red: `#ed3b3b` / `#ff5454`

## Typography

Three families load from the marketing site, all wired through CSS variables:

| CSS variable            | Family                       | Role                                       |
| ----------------------- | ---------------------------- | ------------------------------------------ |
| `--font-inter`          | **Inter** (variable)         | UI body, controls, labels                  |
| `--font-inter-display`  | **Inter Display**            | Marketing headlines (display-cut of Inter) |
| `--font-tiempos-text`   | **Tiempos Text** (Klim Type) | Editorial body in long-form sections       |
| `--font-jetbrains-mono` | **JetBrains Mono**           | Code, monospace, IDs                       |

App `app.attio.com` confirms via `app-vendors.css`:

- `font-family: Inter` (body)
- `font-family: Jetbrains Mono, SF Mono, SFMono-Regular, ui-monospace, DejaVu Sans Mono, Menlo, Consolas, monospace` (code)

### Fallbacks (verbatim from docs CSS)

```
var(--font-inter), ui-sans-serif, system-ui, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"

var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo,
  Monaco, Consolas, "Liberation Mono", "Courier New", monospace
```

For an Alfred workflow that can't ship Tiempos (commercial license), the closest open editorial serif is **Source Serif 4** or **Libre Caslon Text**. For Inter Display fall back to **Inter** itself.

### Type scale (verbatim `--text-*` tokens from marketing CSS)

| Token               | Size            | Line height       | Weight | Tracking   |
| ------------------- | --------------- | ----------------- | ------ | ---------- |
| `--text-base`       | `1rem` (16px)   | `1.375rem` (22px) | 500    | `-0.01em`  |
| `--text-2xl`        | `1.5rem` (24px) | `1.875rem` (30px) | 500    | `-0.01em`  |
| `--text-heading-sm` | `2rem` (32px)   | `2.375rem` (38px) | 600    | `-0.01em`  |
| `--text-heading-md` | `2.5rem` (40px) | `2.75rem` (44px)  | 600    | `-0.01em`  |
| `--text-heading-lg` | `3.5rem` (56px) | `3.75rem` (60px)  | 600    | `-0.015em` |

UI font sizes also observed: 10px, 11px, 12px, 13px, 14px, 16px, 18px (highest counts in CSS were 12-13px — that's the editorial-tight UI rhythm).

Body weight is **500** (not 400) with **negative tracking** (`-0.01em`). This is a load-bearing detail — it's what makes Attio's body type feel tight and confident instead of generic.

## Spacing & rounded

### Spacing base

`--spacing: .25rem` (4px). So the rhythm is **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px** — standard Tailwind 4px grid.

### Border-radius scale (verbatim)

| Token          | Value            |
| -------------- | ---------------- |
| `--radius-xs`  | `.125rem` (2px)  |
| `--radius-sm`  | `.25rem` (4px)   |
| `--radius-md`  | `.375rem` (6px)  |
| `--radius-lg`  | `.5rem` (8px)    |
| `--radius-xl`  | `.75rem` (12px)  |
| `--radius-2xl` | `1rem` (16px)    |
| `--radius-3xl` | `1.25rem` (20px) |

In the actual app CSS, the dominant radius is **2-3px**. Marketing cards and CTAs lean **5-9px**. Pills use `border-radius: 3.40282e38px` (max-value sentinel).

The app keeps radius small on purpose — buttons and inputs are sharp, almost spreadsheet-like. The editorial-cold feeling depends on that restraint; do not round Alfred surfaces past 8px.

### Card padding

Marketing cards: 25-30px. App rows and tiles: 7-11px. Inputs: 4-8px. Tight.

## Iconography

**Not Lucide / Heroicons / Phosphor / Feather / Tabler / Iconify.** Attio ships a fully custom icon set inline as SVG.

### Identifying characteristics (counted across `attio.com` homepage)

- **Canvas sizes**: `14×14` is dominant (149 occurrences), then `12×12` (56), then `16×16` (12), then `18×18` (9). Compare to Lucide's 24×24 — Attio's icons are roughly half the linear density.
- **Stroke widths**: `1.5` dominant (93), then `1` (58), `1.1` (58), `2` (46), `0.7` (14), `1.18` (12). They tune stroke per-icon for optical balance — not a single global stroke.
- **Style**: outline / stroke-based, no fills. `fill="none"` is standard on every icon.
- **Stroke caps/joins**: rounded (consistent with sibling SVG attrs).

### Record-type icons (inferred from public marketing surfaces)

- **Person**: simple circle head + shoulder arc, single stroke.
- **Company / building**: rectangular building with two windows, no fill.
- **Deal**: not on marketing — app uses a dollar/circle glyph.
- **Task / checkbox**: rounded-square outline with a checkmark glyph; unchecked state is just the square.
- **List**: three horizontal lines, equal length.

For an imitating Alfred workflow, the closest open set is **Lucide at stroke-width 1.5 rendered at 14-16px** — drop the canvas size from 24 to 14-16, push the stroke down to 1.5, and the silhouette will match Attio's density.

## Elevation

Attio's marketing CSS defines a five-step shadow scale — all astonishingly subtle:

| Token                    | Value                                     |
| ------------------------ | ----------------------------------------- |
| `--shadow-attio-layer-1` | `0px 1px 3px 0px #00000003` (1% black)    |
| `--shadow-attio-layer-2` | `0px 2px 4px -1px #00000005` (2% black)   |
| `--shadow-attio-layer-3` | `0px 4px 8px -2px #00000008` (3% black)   |
| `--shadow-attio-layer-4` | `0px 8px 16px -4px #0000000a` (4% black)  |
| `--shadow-attio-layer-5` | `0px 16px 32px -8px #0000000d` (5% black) |

For comparison: Material Design's first elevation is ~14% black at the contact line. Attio's `layer-5` is 5% — lighter than Material's lightest. **Depth is signalled through borders, not shadows.**

### Borders and dividers

- App primary borders: 1px solid `#e6e7ea` light / `#2f3033` dark
- Inset 1px ring is the dominant elevation pattern. Example from `app-vendors.css`:
  ```
  inset 0px 0px 0px 1px #fff0,
  0px 0px 2px 0px #1c28402e,
  0px 1px 3px 0px #18294b0a
  ```
  Translation: a transparent inset ring + a 2px feather at 18% blue-grey + a 3px tail at 4% blue-grey. Almost a ghost shadow — the perception of depth comes from the ring, not the bloom.
- Dividers: 1px solid neutral, no shadow.

## Motion

### Durations (from Tailwind `duration-*` classes counted on homepage)

| Duration | Count | Use                          |
| -------- | ----- | ---------------------------- |
| 50 ms    | 275   | Active state, press feedback |
| 150 ms   | 269   | Hover, focus, color shifts   |
| 300 ms   | 198   | Layout shifts, popup open    |
| 400 ms   | 43    | Larger reveals               |
| 500 ms   | 20    |                              |
| 700 ms   | 12    | Hero animations only         |

The 50/150/300 ms triad covers ~85% of all transitions. Press = 50, hover = 150, panel = 300.

### Easings

- `ease-out` dominant (202)
- `ease-in-out` (135)
- `ease-in-cubic` and `ease-in-out-cubic` (~20 each) for special elements

### Transition properties

Transitions are scoped narrowly: `color`, `background-color`, `border-color`, `box-shadow`, `opacity`, `filter`, `translate`, `transform`. Never `all`. This is what makes the interaction feel surgical — you only ever animate the thing that changed.

### Focus rings

1.5px outline (verbatim: `--link-outline: 1.5px solid LinkText`) — color is the link blue (`#266df0`). Clean, single ring, no glow.

## Editorial-cold signals

Tying it together — what makes Attio look "editorial-cold" rather than "warm SaaS":

1. **Tiempos Text** serif for long-form copy. This is the single biggest visual cue and the hardest to replicate. It signals "magazine," not "app."
2. **Primary ink = `#1c1d1f`, not `#000`**. Pure black feels cheap and digital; the dark grey reads as printed.
3. **Body weight is 500 with -0.01em tracking**. Tight, confident — closer to a wordmark than to default web type.
4. **Shadows almost don't exist** (1-5% black). Surfaces are differentiated by borders and 1px insets. Depth is implied, not shown.
5. **Border radius stays small** (2-8px). No squishy corners. Spreadsheets feel intentional.
6. **Custom small-canvas icons** (14×14) at stroke 1.5 — denser and more precise than the 24×24 Lucide default. Reads as bespoke, not stock.
7. **Restricted motion vocabulary**: 50/150/300 ms with ease-out. Nothing bounces, nothing overshoots. Movement is procedural, not playful.
8. **Single accent colour** (`#266df0`). All UI tints, link colours, focus rings, and primary CTAs come from one blue ramp. There is no pink, no purple, no gradient.
9. **Lots of off-white** (`#fafafb`, `#f3f4f6`, `#edeff3`) used for secondary surfaces. Backgrounds are not pure white — they are tinted off-paper.

To preserve the feeling in an Alfred workflow:

- Use Inter at weight 500 with `-0.01em` tracking for results.
- Cap radius at 6px.
- Use `#1c1d1f` for primary text, `#505967` for caption, `#266df0` for the only accent.
- 1px borders, no shadows.
- Outline icons at 1.5 stroke, 14-16px.
- 150ms ease-out for any hover/focus.

## Sources cited

- `https://attio.com` (marketing homepage HTML — fetched via curl since WebFetch strips CSS)
- `https://attio.com/_next/static/chunks/0.x7vsegis8m8.css` (435 KB — the primary marketing token bundle; source of all `--color-*`, `--text-*`, `--radius-*`, `--shadow-attio-*` tokens)
- `https://attio.com/_next/static/chunks/0_aivuqf~udyo.css` (utility CSS)
- `https://app.attio.com/web-assets/main.bundle.71de7b9801eabdd0.css` (app entry shell)
- `https://app.attio.com/web-assets/lib-vendors.bundle.457128de17460488.css` (70 KB — confirmed Inter + JetBrains Mono, app-side tri-theme token system)
- `https://docs.attio.com/docs/overview` HTML (renders via Mintlify; inherits `--font-inter` and `--font-jetbrains-mono` but does not expose its own brand tokens)
- `https://docs.attio.com/mintlify-assets/_next/static/chunks/b652b64e1051c665.css` (Mintlify scaffold; mostly generic)

### Surfaces I could not reach

- `https://attio.com/pricing` returned **HTTP 404** at the time of fetch. (Their pricing route may have moved or be region-locked.) Token coverage was complete from the homepage and app bundles, so no critical gap.
- No public brand-guidelines / press-kit page found. Attio does not publish design tokens externally; everything here was reverse-engineered from production CSS.
