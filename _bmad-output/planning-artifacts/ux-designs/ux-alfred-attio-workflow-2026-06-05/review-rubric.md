# Spine Pair Review — Alfred Workflow for Attio CRM

**Run:** 2026-06-05
**DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/DESIGN.md`
**EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/EXPERIENCE.md`
**Reviewer:** rubric walker (seven-dimension cut)

## Overall verdict

A confident, decision-ready spine pair. DESIGN.md commits a real palette in light + dark with hexes, named tokens, and a typography ladder usable verbatim by an engineer; EXPERIENCE.md commits an unambiguous mod table, a usable IA tree, a substantial microcopy catalog in EN + FR, and four climax-bearing flows. The pair is strong on shape, voice, and downstream usability, and honest about its constrained surface (Alfred chrome) — but it underspecifies the F-G edit primitives FR-042 promised (per-type input UX, parse-error visual), under-states the FR-030 / FR-033 / FR-049 conditional-IA branches that affect _which_ affordances render, and ships zero visual references (no `mockups/`, no `wireframes/`, empty `imports/`), which leaves contrast judgments and dark-mode dependencies unresolved against the editorial-cold target. None of that breaks the contract; story-dev can proceed on KF-1 / KF-2 / KF-3 today, with KF-4's scalar-edit extensions and the diagnostic / refresh surfaces flagged for a follow-up pass.

---

## 1. Decision-readiness — adequate

**Judgment.** A downstream consumer (engineer or story-dev) can source-extract most decisions cleanly. Tokens have committed hexes (`background: '#ffffff'`, `accent: '#266df0'`, dark `accent: '#4a86ff'` "brightened from light's `#266df0` for AA contrast"); the type ladder names a use per token (`display` → "Fiche headline only — the record's primary name at the top of the Quick Look pane"); the mod table in Interaction Primitives covers every keystroke combination; the microcopy catalog ships verbatim EN + FR strings. Where the spine punts, it punts honestly — every `[ASSUMPTION]` flag names what would force a re-decision (Lucide glyph mapping, Alfred dark-icon convention, `rem` scaling in Quick Look). The decisions that _are_ deferred are scoped at the right altitude (visual-QA pass, not core IA).

What pulls this off "strong": several load-bearing FRs are referenced by number but never converted into a downstream contract. FR-042's per-type input UX is the load-bearing one — `EXPERIENCE.md` Interaction Primitives just says "Open inline edit input (FR-042)" and "Open sub-script-filter overlay (FR-042)" without spelling out what an inline parse-error row looks like, how a record-reference sub-search renders the current value, what currency input UX does when the workspace's currency code is implicit. DESIGN.md has no component for inline parse-error rendering inside a drill-down row.

### Findings

- **high** FR-042 per-type input UX is referenced but not specified (EXPERIENCE.md §Interaction Primitives row "Edit-affordance row in drill-down (text / number / URL)" and §State Patterns "Edit input loaded" row). The State Patterns table says "Inline Alfred text input prefilled with the current value; ⏎ submits, parse failures keep the input open" — which is shape, not behavior per type. _Fix:_ Add a per-type table to EXPERIENCE.md.Component Patterns ("Edit input — per type") with one row each for text / number / URL / date / datetime / email / phone / currency, naming the prefill format, the parse rule, the re-prompt copy reference (`{microcopy.date-parse-error}`, etc.), and any conversion at display vs. submit (datetime system-TZ).
- **high** No DESIGN.md component for the inline parse-error row (DESIGN.md §Components lists five types: result-list item, Quick Look fiche, drill-down list item, setup prompt, status pill — but no error/parse-error row variant). State Patterns names "Drill-down row replaced by a single error row with the parse-error microcopy" but the visual treatment (icon? `error` color? prefix?) is uncommitted. _Fix:_ Add a sixth component "Inline error row" to DESIGN.md.Components with token references (`error` color icon, `body-sm` text, no background fill per Don't-rule).
- **medium** FR-026 token rotation flow is missing from the spine (no microcopy in EXPERIENCE.md.Voice and Tone catalog beyond the `Token changed — refreshing identity` string; no State Pattern row; not walked in KF-3 or any flow). The reconcile-prd notes this as a minor gap; the rubric agrees it's medium because rotation is rare but its UX boundary (when does the workflow detect the new hash; what does the user see during the re-probe) is undefined. _Fix:_ Add one row to State Patterns ("Token rotation detected — re-probe identity") and one paragraph to KF-3 or a fifth KF.
- **low** `attio:refresh` user-visible behavior is partially specified (EXPERIENCE.md §Maintenance & diagnostics surfaces says "shows a one-row loading state, then a notification on success") but the _content_ of the loading row is not in the microcopy catalog. _Fix:_ Add `{microcopy.refresh-loading}` = `Flushing caches…` / `Vidage des caches…`.

---

## 2. Substance over theater — strong

**Judgment.** The spines work hard, talk little. The DESIGN.md frontmatter ships 17 color tokens, 7 typography tokens, 7 radius tokens, 4 spacing tokens, 5 component shape tokens — every one with a committed value, none decorative. The Brand & Style section earns its editorial-cold register in two paragraphs ("**editorial-cold, calm productivity, simplicity**", "Inter at weight 500 with negative tracking provides the editorial-cold feel inside Quick Look without bringing in a serif") and pays it off with a concrete Do/Don't list ("Don't introduce a second accent color. The single-hue accent is the brand discipline.", "Don't use background fills for status. Pills are outlined").

EXPERIENCE.md likewise: the microcopy catalog is 27 rows of EN + FR strings, not commentary about microcopy philosophy; the State Patterns table has 11 edit-specific rows mapped to FR triggers; the mod table is 11 rows with a "Where" column that prevents misuse. The Voice and Tone rules are three lines ("**Direct address, no hedging.**", "**System verbs, not user pleas.**", "**No emoji, no exclamation marks.**") and the catalog enforces them.

The only paragraphs that flirt with theater: the Brand & Style "boutique software feel" phrasing and the "frictionless extension of Attio, not a third-party tool grafted on top" line. Both are short, both anchor the editorial-cold target — they read as register-setting for the editorial register DESIGN.md prose is allowed to carry, not bloat.

### Findings

- _(none material)_

---

## 3. Strategic coherence — strong

**Judgment.** The 1-to-3-keystrokes thesis from the PRD is hoisted to the top of EXPERIENCE.md as a hard constraint ("A change to the spec that adds a keystroke to a common path requires explicit decision-log justification") and the mod table, IA tree, and State Patterns all hold against it. The brand-mirror thesis from the decision log ("Attio's audience is already on Attio's visual language; copying that language collapses the cognitive switch cost — exactly what the PRD thesis (\"1–3 keystrokes\") wants") is the same thesis — editorial-cold is justified by the keystroke goal, not by aesthetic preference, which is the right altitude.

The Quick-Look-is-read-only call (EXPERIENCE.md §Component Patterns: "⇧ Quick Look is **read-only**. To act on the record, the user closes Quick Look (⇧ again or any other key) and uses **⏎**, **→**, or a mod from the parent list.") is a strategic decision that pays off the keystroke thesis — it keeps Quick Look a "calm authoritative" surface (echoed in Don'ts: "Don't add motion to the Quick Look fiche") and prevents the fiche from accreting actions that would require a 4th keystroke.

The single-level drill-down (FR-019) and the linked-records-grouping concession (EXPERIENCE.md §Drill-down list "This is the single concession to 'list-of-records-as-a-single-row' in V1 — done because Alfred drill-down is single-level and a flat scroll is the only path") show the spec wrestling with its constraint and naming the trade-off, not papering over it.

### Findings

- **low** The lifecycle-override subtitle pattern (FR-033, EXPERIENCE.md §Component Patterns: "Lifecycle override in subtitle (FR-033). When the workspace has configured a lifecycle attribute slug…") is the one place where the IA branches conditionally on workspace config without the keystroke thesis explicitly endorsing it. The override adds visible text to a row but doesn't add keystrokes, so it's coherent — flagging only because the spec doesn't name why it's a row-component variant rather than a sniff via `attio:diag`. _Fix:_ One sentence to the Lifecycle override paragraph stating "the override is config-only, surfaces no new keystroke, and is the canonical pattern for any future per-workspace subtitle augmentation".

---

## 4. Done-ness clarity — adequate

**Judgment.** Frontmatter says `status: draft` on both files — so by its own admission, the pair is not done. Whether it is done _enough_ for downstream consumption depends on the consumer. For brand + IA + macro-flow story-dev: yes. For F-G edit-flow story-dev: no — see Decision-readiness findings.

Where the spec is done, it is unambiguously done. The mod table, the microcopy catalog, the color tokens, the type ladder, the IA tree, and KF-1 through KF-4 are committed to specific verbs, specific hexes, specific copy. Where the spec is not done, it flags the gap explicitly: `[ASSUMPTION]` markers carry a verify-condition ("verify exact convention at build", "verify Alfred's Quick Look pane respects `rem` scaling at finalize") and the Open questions section names four unresolved items ("Icon mapping", "fiche corner radius in Quick Look", "Dark-mode subtitle contrast in Alfred bar", "Status-pill localization") that are correctly scoped as visual-QA-pass concerns.

The pair has a sibling document, `reconcile-prd.md`, that already inventories what's missing against the PRD — and the rubric agrees with most of its findings (FR-020 empty-query semantics, FR-026 token rotation, FR-028 diag layout, FR-030 object hidden / renamed, FR-031 / FR-032 refresh UX, FR-033 lifecycle subtitle, FR-040 task-content read-only caveat, FR-042 per-type input, FR-044 / FR-048 edit-in-Attio suffix, FR-045 archived-attribute hiding, FR-049 schema unavailable, NFR-007 pre-flight offline microcopy). That document is the most honest done-ness signal in the workspace and should be the trigger list for the next Update pass.

### Findings

- **medium** Frontmatter `status: draft` understates how much _is_ committed. Either flip to `finalized` for the brand + IA + KF-1/KF-2 layer (with explicit deferral notes), or split the file into a stable section and a draft section. The current state makes downstream consumers ask "can I rely on the color tokens" when the answer is "yes, those are committed." _Fix:_ Surface a "Frozen vs draft surfaces" callout below the title in both spines listing what is committed (color tokens, type ladder, mod table, IA tree, KF-1–KF-4, microcopy catalog) and what is open (F-G per-type UX, FR-030 / FR-033 / FR-049 conditional IA, diag/refresh surfaces).
- **low** The `reconcile-prd.md` findings are not linked from the spine — a consumer reading DESIGN.md or EXPERIENCE.md does not know that reconciliation exists. _Fix:_ One-line link from the top of EXPERIENCE.md ("See `reconcile-prd.md` for the FR-by-FR coverage status against the V1 PRD.").

---

## 5. Scope honesty — strong

**Judgment.** The PRD scope is named and bounded. EXPERIENCE.md's "Design constraint — 1 to 3 keystrokes" section commits the deferrals up front: "Flows that exceed 3 keystrokes are **deferred to V2** (creation; multi-select edit) or require a configuration step done once (PAT paste)". DESIGN.md commits one V2 deferral on serif type ("The workflow does **not** ship a serif in V1: it's not embeddable in a public OSS bundle without a license") with named open-source substitutes (Source Serif Pro, Lora) for if/when. The Don'ts list a hard-rule deferral ("Don't render Tiempos or any commercial serif in V1. Inter only").

The constrained-surface honesty is unusually strong. EXPERIENCE.md §Foundation names exactly what the workflow controls per surface ("Alfred bar — keyword input and result list, themed by the user's Alfred theme. The workflow controls icon, title, subtitle, and mod-text per row; layout and color are Alfred-owned") and what it does not ("macOS notifications — used for confirmations and errors… Workflow provides title + body strings; system owns rendering"). DESIGN.md §Brand & Style does the same with the two-register split ("Inside Alfred (list items, drill-down rows) the workflow owns icon + title + subtitle + mod-text only", "Inside Quick Look (the HTML preview pane, FR-034) the workflow owns the full canvas"). The brand register lives where the workflow can render it; everywhere else, the workflow concedes to Alfred / macOS — which is the only honest call for an Alfred workflow.

The `[ASSUMPTION]` flag on `highlight` token ("rare, V1 may not use") is good scope honesty: a token kept in the system in case it's needed, with the unknown cost disclosed.

### Findings

- _(none material)_

---

## 6. Downstream usability — adequate

**Judgment.** A story-dev agent (human or AI) implementing KF-1 (morning todo) can ship from this pair without asking a follow-up. The IA tree is unambiguous, the result-list-item component has every field named, the per-object context line pattern is referenced to FR-013, the State Patterns table covers the five list states the script must surface, and the success / failure notifications have catalog strings. KF-3 (onboarding) is similarly self-contained: setup-prompt component spec is in DESIGN.md and EXPERIENCE.md, the README is named as the help surface, the first-success notification has a catalog string.

KF-4 (deal stage update) is implementable for the single-select case (sub-script-filter overlay with current option marked by `success` icon) but the eight other scalar types (number / URL / text / date / datetime / email / phone / currency) in the addendum §H matrix are not. The reconcile-prd flags this as the single biggest gap, and the rubric agrees.

The cross-file token-name discipline is good: EXPERIENCE.md references `{colors.accent}`, `{typography.body}`, `{components.fiche-row}` — and every reference resolves to a DESIGN.md token. The Voice/Tone catalog placeholders (`{workspace_name}`, `{object}`, `{query}`, `{field}`, `{new_value}`, `{content_truncated}`, `{workspace_member_name}`, `{N}`, `{M}`, `{slug}`) are namespaced and consistent.

Zero visual references is the limiting factor. The Open questions name three visual-QA items (Lucide icon mapping, fiche corner radius, dark-mode subtitle contrast) that a mockup or screenshot would resolve in 5 minutes. The `mockups/`, `wireframes/`, `imports/` directories are absent or empty.

### Findings

- **high** No mockups, wireframes, or imports. `imports/` exists but is empty; `mockups/` and `wireframes/` do not exist. The Open questions section names the three visual-QA items this would resolve. _Fix:_ Generate at minimum (a) a Quick Look fiche key-screen render at 480px in light + dark for a person, deal, and task record; (b) an Alfred list-item key-screen for each of the five components; (c) the inline-edit-input and parse-error key-screen for FR-042. Link each from the relevant spec section.
- **medium** FR-030 object-hidden / object-renamed branches affect _which keywords degrade_, which a story-dev needs to know up front. EXPERIENCE.md microcopy catalog has the two toast strings but no State Pattern row and no IA-tree annotation. _Fix:_ Add an "Object discovery" subsection to Foundation that names the GET /v2/objects probe, the hidden/renamed branches, and links to the catalog strings.
- **medium** FR-049 schema unavailable is in the State Patterns table ("F-G affordances suppressed for the object; drill-down rows are open-and-navigate only; `attio:diag` surfaces the gap") but the visual consequence (drill-down list with no edit affordance suffix) is not in DESIGN.md and not in the Drill-down list Component Pattern. A story-dev shipping a drill-down list needs to know whether the suppressed state renders identically to a read-only row or has its own treatment. _Fix:_ One paragraph to EXPERIENCE.md §Drill-down list: "When schema discovery has failed for the object (FR-049), all rows render without the `→ edit` suffix and behave as read-only; no separate visual treatment — schema gap surfaces only through `attio:diag`."
- **medium** `attio:diag` rows in EXPERIENCE.md §Maintenance & diagnostics are spec'd as a six-row read-only table but no DESIGN.md component matches them. The result-list-item component assumes title + subtitle + icon; the diag rows have title + subtitle but no real icon discipline (icons listed are `info` / `sync` / `warning` / `error` / `success` for state, not for diag). _Fix:_ Add an "attio:diag row" sub-variant to the Drill-down list Component Pattern that names the icon family (e.g. all `info` glyph or `mono` text glyph) and confirms the row is non-actionable.

---

## 7. Shape fit — strong

**Judgment.** DESIGN.md sections are in canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. No invented sections; the editorial register lives inside the canonical sections, not in extra ones. The optional Inspiration section is correctly omitted (the decision log + `.working/attio-visual-research.md` carry that material; the spine references brand-mirror at the right altitude in Brand & Style).

EXPERIENCE.md required defaults are all present in canonical order: Foundation → Information Architecture → Voice and Tone → Component Patterns → State Patterns → Interaction Primitives → Accessibility Floor → Key Flows. The two added sections — "Design constraint — 1 to 3 keystrokes" at the top and "Maintenance & diagnostics surfaces" near the bottom — earn their place. The keystroke constraint is the load-bearing thesis from the PRD and belongs above Foundation; the diagnostic surfaces are real keywords (`attio:diag`, `attio:refresh`) that need spec but don't fit the user-facing Key Flows mold.

Responsive is correctly omitted (DESIGN.md §Layout & Spacing: "There is no responsive grid: Quick Look is a fixed-width pane (~480px in practice, varies with Alfred version). The fiche layout is **single-column, left-aligned**. No multi-column grids in V1."). The omission is named, not silent.

### Findings

- **low** EXPERIENCE.md "Open questions" section at the bottom is not a canonical default but is a useful artifact — flagging only because if the team has a convention for where TBDs live (decision log vs. spine footer), the spine should match it. _Fix:_ If the convention is decision-log-only, fold the four Open questions into `.decision-log.md` and remove the section from EXPERIENCE.md; if the convention allows spine TBDs, no change.

---

## Mechanical notes

- **Frontmatter completeness.** Both files have `title`, `status`, `created`, `updated`, `sources`. DESIGN.md frontmatter additionally carries the token system (colors, typography, rounded, spacing, components) — that's the canonical shape per the spec. EXPERIENCE.md frontmatter cross-references DESIGN.md via `sources`. Clean.
- **Cross-file token references.** All `{colors.*}`, `{typography.*}`, `{spacing.*}`, `{components.*}` references in EXPERIENCE.md resolve to DESIGN.md frontmatter tokens.
- **Naming consistency.** Component names match across DESIGN.md.Components (5 components: Alfred result-list item, Quick Look fiche, Drill-down list item, Setup prompt result, Status pill) and EXPERIENCE.md.Component Patterns (same 5 components, named the same way: Result-list item, Quick Look fiche, Drill-down list, Setup prompt, Status pill — minor: "Alfred" prefix dropped in EXPERIENCE.md, "list item" → "list" in drill-down; harmless but worth normalizing).
- **Mermaid syntax.** The IA tree in EXPERIENCE.md is rendered as a fenced code block (not a Mermaid diagram). It is unambiguous, well-indented, and scans fast. Not a defect — flagging only because a Mermaid `graph TD` rendering would be a small downstream win for navigation tools.
- **UJ / FR name verbatim.** UJ-1 / UJ-2 / UJ-3 / UJ-4 are referenced correctly. FR numbers cited in the spine spot-checked against the PRD reconcile — all resolve.
- **Glossary.** No standalone glossary; terms (`fiche`, `drill-down`, `Quick Look`, `mod`, `keyword`) are defined inline at first use and used consistently thereafter.
- **Visual references inventory.** `mockups/` absent. `wireframes/` absent. `imports/` exists but empty. `.working/attio-visual-research.md` exists and is the visual-research substrate; it is referenced implicitly via the brand-mirror direction in DESIGN.md.Brand & Style but is not linked. _Fix:_ either link `.working/attio-visual-research.md` from DESIGN.md.Brand & Style as the visual research substrate, or move it into `imports/` and link it there.
- **Status field.** Both files carry `status: draft` (see Done-ness finding above).
- **EN/FR microcopy parity.** The 27-row catalog has both columns filled with no missing cells. The em-dash / tiret-cadratin discipline is named explicitly ("EN use **em-dashes** to separate cause and remediation. FR uses **tirets cadratins** (`—`) for the same purpose; never hyphens").
