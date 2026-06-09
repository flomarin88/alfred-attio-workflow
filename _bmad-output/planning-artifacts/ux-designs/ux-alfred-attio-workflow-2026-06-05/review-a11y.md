# Accessibility Review

> Scope: DESIGN.md + EXPERIENCE.md (drafts dated 2026-06-05). WCAG 2.2 AA baseline; AAA noted where the spec reaches it. Reviewed against the three accessibility surfaces named in the brief: Alfred bar (Alfred-owned), Quick Look HTML (workflow-owned), macOS NSAlert / Notification Center (system-owned, copy-owned).

## Headline verdict

The spec is unusually accessibility-literate for an OSS Alfred workflow draft — it commits to icon+text state signals, semantic HTML, `prefers-reduced-motion`, and `rem` sizing without being asked. But the contrast table in DESIGN.md overstates how well the palette holds: **`ink-tertiary` fails WCAG AA in light mode at every size that matters (2.71:1 on surface, 2.60:1 on surface-raised)** and the spec itself uses `ink-tertiary` for the 11px field labels (`COMPANY`, `DEADLINE`, `OWNER`) — small text that requires 4.5:1, not the "AA-large only" pass DESIGN.md claims. The status-pill border, the only signal carrying the pill shape against `surface-raised`, also fails 3:1 UI-component contrast in both modes. Fixable with two ink-tertiary darkenings and an outline tightening; nothing structural.

## Contrast audit

All ratios computed against pure hex values per WCAG 2.2 relative-luminance formula. WCAG thresholds: **4.5:1** body text, **3:1** large text (≥18px or ≥14px bold) and UI components.

### Light mode

| Pairing                                                       | Ratio      | Required            | Verdict                                                           |
| ------------------------------------------------------------- | ---------- | ------------------- | ----------------------------------------------------------------- |
| `ink-primary` `#1c1d1f` on `surface` `#ffffff`                | 16.87:1    | 4.5                 | PASS AAA                                                          |
| `ink-primary` on `surface-raised` `#fafafa`                   | 16.16:1    | 4.5                 | PASS AAA                                                          |
| `ink-secondary` `#5e6066` on `surface`                        | 6.29:1     | 4.5                 | PASS AA (close to AAA 7:1)                                        |
| `ink-secondary` on `surface-raised`                           | 6.02:1     | 4.5                 | PASS AA                                                           |
| `ink-tertiary` `#9b9da3` on `surface` (used at 11px label)    | **2.71:1** | 4.5 small / 3 large | **FAIL** — fails AA at any size; below 3:1 even as UI             |
| `ink-tertiary` on `surface-raised`                            | **2.60:1** | 4.5                 | **FAIL**                                                          |
| `accent` `#266df0` on `surface` (as `→ edit` text affordance) | 4.64:1     | 4.5                 | PASS AA (thin margin)                                             |
| `accent-hover` `#1f5dd1` on `surface`                         | 5.92:1     | 4.5                 | PASS AA                                                           |
| `success` `#0fc27b` on `surface` (as icon tint — UI 3:1)      | 2.33:1     | 3.0 UI              | **FAIL** as standalone signal; OK if icon shape carries semantics |
| `warning` `#f5b900` on `surface` (icon tint)                  | **1.78:1** | 3.0 UI              | **FAIL** badly; the yellow vanishes on white                      |
| `error` `#ff5b59` on `surface` (icon tint)                    | 3.05:1     | 3.0 UI              | PASS UI (1% margin — fragile)                                     |
| `outline` `#d4d6d9` on `surface` (pill border, fiche border)  | **1.46:1** | 3.0 UI              | **FAIL** as UI component; the card outline is barely perceptible  |
| `outline` on `surface-raised` (pill border)                   | **1.40:1** | 3.0 UI              | **FAIL**                                                          |
| `divider` `#e8e9eb` on `surface`                              | 1.21:1     | n/a                 | Decorative — acceptable if rows have other separation             |
| `on-accent` `#ffffff` on `accent` (CTA fill, if used)         | 4.64:1     | 4.5                 | PASS AA (thin margin)                                             |
| `on-error` `#ffffff` on `error` (badge fill, if used)         | 3.05:1     | 4.5 small / 3 large | **FAIL** small text; OK for ≥18px                                 |
| `ink-primary` on `highlight` `#fff8d6` (search match)         | 15.78:1    | 4.5                 | PASS AAA                                                          |

### Dark mode

| Pairing                                               | Ratio      | Required  | Verdict                                           |
| ----------------------------------------------------- | ---------- | --------- | ------------------------------------------------- |
| `ink-primary` `#f5f5f7` on `surface` `#101113`        | 17.35:1    | 4.5       | PASS AAA                                          |
| `ink-primary` on `surface-raised` `#1a1c1f`           | 15.68:1    | 4.5       | PASS AAA                                          |
| `ink-secondary` `#a3a5ab` on `surface`                | 7.67:1     | 4.5       | PASS AAA                                          |
| `ink-secondary` on `surface-raised`                   | 6.93:1     | 4.5       | PASS AA                                           |
| `ink-tertiary` `#6e7077` on `surface` (at 11px label) | **3.82:1** | 4.5 small | **FAIL AA for small text**; passes 3:1 large only |
| `ink-tertiary` on `surface-raised`                    | **3.45:1** | 4.5 small | **FAIL AA small**; passes large                   |
| `accent` `#4a86ff` on `surface`                       | 5.53:1     | 4.5       | PASS AA                                           |
| `accent-hover` `#6a9bff` on `surface`                 | 6.97:1     | 4.5       | PASS AA                                           |
| `success` `#10cc82` on `surface`                      | 8.98:1     | 3.0 UI    | PASS                                              |
| `warning` `#ffc827` on `surface`                      | 12.18:1    | 3.0 UI    | PASS                                              |
| `error` `#ff6e6c` on `surface`                        | 6.93:1     | 3.0 UI    | PASS                                              |
| `outline` `#34373c` on `surface`                      | **1.58:1** | 3.0 UI    | **FAIL** as UI component                          |
| `outline` on `surface-raised`                         | **1.43:1** | 3.0 UI    | **FAIL**                                          |
| `ink-primary` on `highlight` `#3a3415`                | 11.47:1    | 4.5       | PASS AAA                                          |

### Tally

- **Light mode:** 11 pass, 7 fail (most failures concentrated in `ink-tertiary` and `outline`).
- **Dark mode:** 13 pass, 4 fail (the dark palette is significantly stronger, but `ink-tertiary` at small label size and the `outline` border still fail).
- **Across both modes the spec's frontmatter claim "`ink-tertiary` stays at AA-large only and is reserved for labels" is incorrect.** The label token is 11px — that is small text, requiring 4.5:1, not the 3:1 large-text threshold.

## Findings by severity

### Critical

- **`ink-tertiary` fails AA in light mode, fails AA-small in dark mode, but is spec'd as the color for field labels (`{components.fiche-row}.labelColor: ink-tertiary`).** DESIGN.md line 172 asserts this is acceptable because labels are "AA-large only," but `{typography.label}` is 11px — well below the 14px-bold / 18px-regular large-text threshold. Every field label in every Quick Look fiche (`COMPANY`, `DEADLINE`, `OWNER`, `SOCIÉTÉ`, `ÉCHÉANCE`) fails AA in light mode. **Fix:** darken light `ink-tertiary` from `#9b9da3` to approximately `#6b6d72` (~4.6:1 on white); darken dark `ink-tertiary` from `#6e7077` to approximately `#8a8c92` (~5:1 on `#101113`). Or commit to using `ink-secondary` for labels — already AA-compliant in both modes.

- **The "color is never the only state signal" claim is contradicted by `success` and `warning` tints in light mode.** EXPERIENCE.md L222–228 (Accessibility Floor) and L132 (Colors intro) both promise state never relies on color alone. The state-table on EXPERIENCE.md L173–193 names "`sync` icon", "`info` icon", "`warning` icon", "`success` icon", "`error` icon" — but the underlying icons inherit the semantic color from DESIGN.md L147–149. In light mode, `success` (`#0fc27b`, 2.33:1) and `warning` (`#f5b900`, 1.78:1) on `#ffffff` are below the 3:1 UI threshold — meaning the icon **glyph shape is the only carrier**, not the color. That actually satisfies the spec's promise — but it means the icons must be **shape-distinct, not just color-distinct**. Verify at icon-finalize: success ≠ a green checkmark only; it must be a checkmark of any tint. **Fix:** explicitly write in the spec that semantic icons are shape-distinguishable (check / triangle-bang / x-circle / info / sync), and that color is decorative.

### High

- **`outline` border on the Quick Look fiche fails 3:1 UI-component contrast in both modes.** The fiche card outline is the only visual that separates the editorial-cold card from the background — and at 1.46:1 (light) / 1.58:1 (dark) it is sub-perceptual for low-vision users. The status pill's outlined border has the same problem (1.40:1 on `surface-raised`). DESIGN.md L210–217 commits to "depth from borders, not shadows" but the borders fail the WCAG 1.4.11 Non-Text Contrast SC. **Fix:** darken light `outline` from `#d4d6d9` to ~`#a8aab0` (~3.0:1); darken dark `outline` from `#34373c` to ~`#5a5d63` (~3.1:1 on `#101113`). The editorial register survives — Attio's own card borders are not invisible.

- **The 14px body claim with `rem`-based sizing is asserted but not specified.** EXPERIENCE.md L224 says "user's macOS Larger Text setting is respected in Quick Look HTML via `rem`-based units" with `[ASSUMPTION: verify Alfred's Quick Look pane respects rem scaling]`. macOS "Larger Text" (under Accessibility → Display) **does not** scale Quick Look HTML by default — that setting affects native macOS controls, not WebKit-rendered content. The only way to honor user scaling inside Alfred's Quick Look pane is to (a) base all sizes on `em`/`rem` from a `html { font-size: 100% }` root and (b) trust that the user's Safari/system text-zoom propagates — which it generally doesn't for Alfred's preview. **Fix:** either commit to a concrete approach (CSS `font-size: 100%`, no `px` for type, line-height in unit-less numbers) and accept that scaling is a best-effort, OR document explicitly that text-resize is out of scope for V1 and recommend users zoom Alfred's Quick Look via Alfred preferences. Don't leave this as `[ASSUMPTION]`.

- **`accent` text in light mode passes AA at 4.64:1 with only 0.14 margin** — and the `→ edit` affordance is the entire signal that a row is editable. EXPERIENCE.md L152–153 says "A row with a small `→ edit` accent-blue suffix is editable. A row without that suffix is read-only." If the accent color is the only differentiator, it's color-alone signaling. **Fix:** either keep the arrow `→` as the visible affordance (the arrow glyph carries the semantic even when color is desaturated) — explicitly call this out — or use `accent-hover` `#1f5dd1` (5.92:1) for the edit suffix to gain margin.

### Medium

- **The status pill carries semantic information ("Discovery", "Customer", "Negotiation") with no programmatic state — no `aria-label`, no `role`.** Screen readers will announce it as plain text. For deal-stage / lifecycle context, that's actually fine; for task-completion ("Completed", "Open"), a screen-reader user benefits from `aria-label="Task status: Completed"` so the state is unambiguous out of context. **Fix:** in the Quick Look fiche template, status pills should render as `<span class="pill" aria-label="{field_name}: {value}">{value}</span>` so the label-value relationship survives flattening.

- **The Quick Look HTML structure is declared semantic (`<section>`, `<dl>`, `<dt>`, `<dd>`) but no heading hierarchy is specified.** The fiche has a record name in `display` typography, then "Linked records" / "Recent activity" section headings in `heading` typography. These should be `<h1>` (record name) and `<h2>` (section headings) — but the spec doesn't say. Document order is good (DESIGN.md L226 / EXPERIENCE.md L226), but a screen-reader user navigating by heading needs the levels right. **Fix:** add to DESIGN.md Components.fiche: "Record name renders as `<h1>`; section headings render as `<h2>`. Field labels render as `<dt>`, values as `<dd>`."

- **FR labels stay UPPERCASE for fiche fields (`SOCIÉTÉ`, `ÉCHÉANCE`, `RESPONSABLE`) per EXPERIENCE.md L131.** Uppercase French text strips diacritic readability cues for users with dyslexia or low vision; VoiceOver may also mispronounce some uppercase French words (it occasionally reads uppercase as initialisms). The typography token uses `textTransform: uppercase` in CSS — which means **the underlying HTML can stay lowercase / sentence-case and the visual transform is purely cosmetic**. This is correct for a11y (screen readers read the source, not the rendered transform), but worth explicitly noting in the spec so the implementer doesn't write `<dt>SOCIÉTÉ</dt>` in the template. **Fix:** "Label markup is sentence-case in source; CSS `text-transform: uppercase` provides the visual treatment. Screen readers receive the natural-case string."

- **The FR microcopy table mostly respects French typography but is inconsistent.** Good: L98 `« {query} »` uses guillemets with non-breaking spaces (implicit); L101 `Tâche complétée : {content_truncated}` correctly uses a space before `:` (should be `&nbsp;` non-breaking in HTML); L121 `Format attendu : AAAA-MM-JJ` correct. Issues: L107 `Aucun·e {object}` uses the inclusive midpoint — a stylistic choice, but VoiceOver in French reads it as "aucun point e" which is jarring (consider `Aucun ou aucune` or accept the trade-off as a deliberate inclusive-language choice); L100 `Hors ligne — données en cache` is fine; L108 `Token invalide — recoller dans la config` uses the imperative infinitive which is grammatically correct in French interface copy but flat — that's an editorial choice, not a11y. **Fix:** add a note to EXPERIENCE.md Voice and Tone: "FR strings render `:` `;` `?` `!` with a preceding ` ` (non-breaking space) in HTML output; JSON sources should use the literal NBSP character or `&nbsp;` per template engine. Guillemets `« »` always pair with NBSP inside."

- **The `RETARD` group label in `todo` (EXPERIENCE.md L149, L245) is FR-only.** It's used as a group heading in the Alfred list. EN equivalent missing from the microcopy table — should be `OVERDUE` in EN. **Fix:** add to microcopy table: `Overdue group label | OVERDUE | RETARD`.

### Low

- **The multi-line note NSAlert (FR-017) prompt copy is not specified anywhere.** EXPERIENCE.md L37 says "Workflow provides the prompt copy only; macOS owns the rest" but the actual prompt label string is absent from the microcopy table. NSAlert prompt text is the only context a screen-reader user has when the dialog opens (VoiceOver announces the alert title and message field). **Fix:** add to microcopy table: `Multi-line note prompt title | Add a note to {record_name} | Ajouter une note à {record_name}`, and `Multi-line note prompt message | Markdown supported. ⌘⏎ to save. | Markdown pris en charge. ⌘⏎ pour enregistrer.`

- **Icon stroke-width `1.5px` (DESIGN.md L99, L241, L286) is on the thin edge for users with low vision.** Apple's HIG suggests 1.5–2px for outline glyphs at 14–16px canvases; 1.5px renders as ~1 device-pixel on non-Retina and 3 device-pixels on Retina @2x. On non-Retina external displays it can sub-pixel-render to less than full opacity. **Fix:** keep 1.5px as the visual target but ship `@1x` and `@2x` PNG assets where the `@1x` glyph is hand-tuned to 1px-aligned (no fractional positioning), per Alfred's icon convention.

- **Reduced motion is correctly handled** — EXPERIENCE.md L228 commits to honoring `prefers-reduced-motion: reduce` for the future field-edit spinner. V1 has no animations. Spec is correct.

- **Keyboard focus inside Quick Look.** Quick Look is read-only and not focusable (the pane previews, doesn't take focus). The spec acknowledges this implicitly. But the HTML should still set `tabindex="-1"` on the root container and ensure no interactive elements (links, buttons) appear in the fiche — otherwise a screen-reader user navigating via VoiceOver's web rotor might land on stale links. **Fix:** spec the fiche as a pure document — no `<a>`, no `<button>`. If the metadata footer ever shows a record URL, render as `<span>`, not `<a>`.

- **macOS notification copy is screen-reader friendly.** FR-051 errors ("Token invalid — re-paste in config sheet", "Attio is unreachable — try again later") read as full sentences with cause and remediation. VoiceOver reads notification title + body; the em-dash separation works (VoiceOver pauses on em-dashes). 422 verbatim Attio messages are a known compromise (FR-051 explicitly chooses fidelity over translation) — flag for testing in case Attio returns jargon-heavy messages, but the spec's choice is reasonable.

- **EN idioms that may not translate.** Most strings translate cleanly. "Re-paste in config sheet" (L104) is fine. "Token rotation imminent" (DESIGN.md L148) is jargon — not in the microcopy table but referenced in the colors guide as a future warning use; flag for the actual string. The "RETARD" label is a French short-form that doesn't have a direct English idiom (English would use "OVERDUE" or "LATE"); already covered above.

## What's a11y-strong about this spec

EXPERIENCE.md has a dedicated "Accessibility Floor" section (L219–230) — most workflow specs of this size don't bother. The commitments to icon+text state, `prefers-reduced-motion`, semantic HTML, `rem` sizing, and localized strings are individually correct even where the implementation details need sharpening. The decision to ship status pills as outlined-only (no fill-color carries status — DESIGN.md L254, L271) is the right call for color-independence, even though the outline contrast itself needs fixing. And the editorial discipline of "hierarchy by ink weight, not by hue" (DESIGN.md L132) means the palette is already monochromatic by intent — a strong a11y baseline that just needs the ink-tertiary darkening to land.

## Open a11y questions for build

- Does Alfred's Quick Look WebKit context inherit the user's Safari default font-size? If not, the `rem`-based scaling claim is theatrical. Test on a fresh macOS install at the three Safari zoom defaults.
- Does VoiceOver navigating an Alfred result list announce subtitle text after title text in a single utterance, or as a separate announcement? This affects whether the `·` middle-dot separator is heard as "middle dot" (verbose) or skipped.
- Does macOS NSAlert with a text input expose the prompt message as `accessibilityLabel` for the input field, or only as the alert dialog's title? Determines whether the FR-017 message string is read aloud at all.
- When Alfred renders the workflow's icon at `@dark` against a user-themed background (e.g. Catppuccin Mocha at `#1e1e2e`), does the workflow's chosen `ink-primary` icon tint still satisfy 3:1 against the actual rendered background? The spec assumes Alfred handles this; in practice users may set high-saturation themes that defeat the assumption.
- For FR users: should the lifecycle-attribute pill values be translated when the workspace's option labels themselves are in French (`Découverte` vs `Discovery`)? EXPERIENCE.md L330 notes this is verbatim per FR-039, but a screen-reader user in a mixed-locale workspace will hear French and English announced with the same VoiceOver voice unless `lang="fr"` is set per-pill. Worth specifying that fiche output sets the document `lang` attribute to match the user's `LC_MESSAGES`, and per-element `lang` attributes when Attio field values are known to be in a different language (rare, but flagged).
- Is the `attio:diag` row content navigable by VoiceOver as a list, or as opaque rows? Alfred ScriptFilter rows have title + subtitle but no `role="row"` semantics — VoiceOver users may not perceive the diagnostic snapshot as structured. Probably out-of-scope (Alfred-owned), but worth confirming.
