# Input reconciliation: PRD vs UX spines

Source inputs:

- PRD: `_bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/prd.md`
- Addendum: `_bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/addendum.md`

Reconciled against:

- `DESIGN.md` (this folder)
- `EXPERIENCE.md` (this folder)

---

## UJ coverage

- **UJ-1 (Morning to-do) → KF-1**: covered cleanly. RETARD grouping, ⏎/⌘⏎/⇧/→ all represented. Climax beat (Quick Look on the overdue task) lands. **Minor gap:** UJ-1's drill-down step 3 explicitly mentions "→ drill down" returning via backspace; KF-1 stops at ⌘⏎ and never walks the → branch on a task — drill-down for tasks (linked records + Write note / Mark complete) is shown only in the IA tree, not in any flow.
- **UJ-2 (Search from anywhere) → KF-2**: covered. The per-object context line, ⏎ open, ⇧ Quick Look, copy email beats are all present. **Notable gap:** UJ-2 step 3 explicitly walks ⌥⏎ (single-line note) and ⇧⌥⏎ (multi-line note) and the → drill-down branch; KF-2 demonstrates none of these. The microcopy catalog has the success strings but no flow rehearses the note-capture climax.
- **UJ-3 (First-time install) → KF-3**: covered cleanly. PAT generation, Configure sheet, identity probe, one-time "Connected to <workspace_name>" notification all land. Token rotation (UJ-3 step 7 / FR-026) is not walked in any flow — minor since rotation is an edge case.
- **UJ-4 (Update deal stage) → KF-4**: covered cleanly. → drill-down, sub-script-filter with options + current-value check, sync spinner, notification, backspace return all match. **Minor gap:** UJ-4 explicitly calls out that the _same_ flow applies to every scalar type (number / date / datetime / text / email / phone / record-reference) and that unsupported types render read-only with "edit in Attio" hint. KF-4 covers only single-select; no key flow demonstrates a text/number/date/datetime/record-reference edit, so the addendum §H type matrix is not exercised in a flow.

---

## FR coverage (51 FRs)

### Covered cleanly

FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-022, FR-023, FR-024, FR-025, FR-034, FR-035, FR-036, FR-037, FR-038, FR-040 (partial — see gaps), FR-041, FR-042 (partial), FR-043, FR-046, FR-051.

### Gaps in EXPERIENCE / DESIGN

- **FR-020** (empty-query behavior per object: recently-updated people/companies, open deals by recency, task → fallback to `todo` semantics): not addressed. The State Patterns table only describes "Empty: zero results"; the _empty-query_ (no search string) precondition is conflated with zero-results and never disambiguated. **EXPERIENCE gap.**
- **FR-021** (empty results microcopy quoting the query): covered in microcopy catalog ("No {object} match '{query}'") — OK.
- **FR-026** (token rotation via re-paste, hash-based detection): not surfaced anywhere in EXPERIENCE — no microcopy, no flow, no state pattern. **EXPERIENCE gap.**
- **FR-027** (multi-workspace not supported; README discloses): not surfaced in EXPERIENCE — no warning copy, no setup-prompt addendum. README is mentioned generically. **Minor EXPERIENCE gap.**
- **FR-028** (`attio:diag` keyword surfaces workspace slug, member, cache age, last error, PAT presence): listed in the IA tree as a leaf but no component spec, no layout, no microcopy catalog entry, no DESIGN treatment for a multi-line diagnostic readout. **DESIGN + EXPERIENCE gap.**
- **FR-030** (object discovery via `GET /v2/objects`; degrade keyword if object missing, one-time toast): not addressed. No microcopy for the "deals object hidden / renamed" toast; no state pattern for "object missing". **EXPERIENCE gap.**
- **FR-031** (24h attribute-definition cache; manual refresh story): partial. `attio:refresh` appears in the IA tree but EXPERIENCE never describes its visible result (success toast, what gets cleared). **EXPERIENCE gap.**
- **FR-032** (`attio:refresh` user-visible behavior): same as FR-031. No success notification copy in the catalog. **EXPERIENCE gap.**
- **FR-033** (per-object lifecycle attribute config field rewrites the result-list subtitle): not described in EXPERIENCE. Subtitle pattern in DESIGN/EXPERIENCE assumes the FR-013 default fields; the lifecycle-override branch is invisible. No component variant captured. **EXPERIENCE + DESIGN gap.**
- **FR-039** (Attio-sourced data never translated): mentioned in Voice/Tone briefly ("Data from Attio… is never translated" implicit) but not as a hard rule in EXPERIENCE. Status-pill section says "does not normalize / translate / shorten" so OK in spirit. Minor.
- **FR-040 task narrow-write caveat** (only `deadline_at`, `is_completed`, `assignees`, `linked_records` writable; `content` is read-only): not surfaced in EXPERIENCE drill-down spec. The drill-down list section says "Editable field row… read-only row" generically but never names the task-content read-only specifically. **EXPERIENCE gap.**
- **FR-042 per-type input UX**: covered in passing in the Interaction Primitives table (one line per primitive) but never as a per-type behavior spec. Date `YYYY-MM-DD` parse-error inline behavior, datetime system-TZ conversion at display & input boundaries, currency code-from-attribute-def (no user input), phone country-code inference, URL minimal scheme check — none of these are spelled out. **EXPERIENCE gap (notable).** DESIGN has no component for inline-parse-error rendering inside a drill-down row either.
- **FR-044** (non-scalar types rendered read-only with "edit in Attio →" affordance): named in EXPERIENCE only obliquely. No microcopy catalog entry for the "edit in Attio →" suffix string. No DESIGN component sketch. **EXPERIENCE + DESIGN gap.**
- **FR-045** (archived / read-only attributes hidden from drill-down entirely): not addressed in EXPERIENCE.
- **FR-047** (cache invalidation cross-cutting): listed in State Patterns indirectly ("drill-down re-renders with the new value") but not stated as the contract; list-page re-fetch behavior (re-render of search list if served from cache) per UJ-4 not surfaced. **Minor EXPERIENCE gap.**
- **FR-048** (record-reference whose target object isn't in {people, companies, deals, tasks} → read-only "edit in Attio →"): not addressed. Edge case missed.
- **FR-049** (schema-discovery failure: edit affordances suppressed; `attio:diag` surfaces it): not addressed in EXPERIENCE. No flow, no state pattern.
- **FR-050** (403 on PATCH stamps the row with persistent "Read-only — token lacks write scope" hint for the session): microcopy is in the catalog; State Patterns covers it as "PATCH failure / 403 read-only". OK. Minor: DESIGN has no visual treatment for a "stamped" read-only row distinct from a normal read-only row.
- **FR-051 422 verbatim**: covered (the catalog row marks 422 as Attio-verbatim).

### Not applicable to UX

FR-029 (reserved for V2). All NFR-A perf scripts are dev-side.

---

## NFR coverage (UX-relevant only)

- **NFR-003** (300ms loading state): covered in State Patterns (Loading row trigger).
- **NFR-007** (offline → cached + "Offline — showing cached data" prefix; mutating actions disabled): partially covered. The prefix row and microcopy land. The "mutating actions disabled but affordances still rendered, ⏎/⌘⏎ surface 'Cannot reach Attio — try again later'" branch is **not** mapped to a microcopy string in the catalog ("Cannot reach Attio — try again later" string is missing as a distinct entry; 5xx-after-retry string exists but doesn't cover the pre-flight offline-block case). **EXPERIENCE gap (notable).**
- **NFR-008** (401 → single result prompting re-paste; ⏎ opens README troubleshooting anchor): catalog has the 401 error string ("Token invalid — re-paste in config sheet") but doesn't distinguish it as the **interactive setup-prompt-equivalent row** (Alfred result with ⏎ → README) vs a passive notification. EXPERIENCE merges 401 into the Token-missing/invalid state row, which is reasonable but understated. **Minor.**
- **NFR-012** (EN + FR; `{name}` placeholder substitution; no ICU; adding a third language = strings file only): voice section names EN + FR + placeholder mechanism; OK.
- **NFR-013** (no auto-update; users re-download): not surfaced anywhere in EXPERIENCE or DESIGN. No microcopy for an "update available" state (which is a V2-8 item anyway), but also no acknowledgment in onboarding flow that the user owns updates. README mention is generic. **Minor EXPERIENCE gap.**

---

## Addendum coverage

### §E per-object Quick Look + drill-down field maps

DESIGN's Quick Look fiche component (section 2 of Components) provides tokens for: card, header row, field rows, linked-records list, status pill, metadata footer. This is sufficient as a _visual frame_ for all four object Quick Look maps in §E.

**Drill-down items in §E** include compound rows like "Linked people (top N)", "Open deals associated with this company", "Recent notes (last 3)". DESIGN's drill-down item sub-types are: editable field row, linked-record row, action row. The "**list-of-records-as-a-single-drill-down-row**" pattern (e.g. "Linked people" expanding/grouping multiple records) is not explicitly designed — is it one row per linked person, or one collapsed row? **DESIGN gap (notable):** the addendum's enumerated items imply both shapes and DESIGN doesn't resolve which.

Person Quick Look field "LinkedIn URL" → DESIGN fiche supports URLs as field-row values (no special clickable treatment named; OK for read-only).

### §H type matrix coverage

EXPERIENCE's per-type interaction primitives matrix is incomplete:

| Type               | Covered? | Gap                                                                                                                                                  |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| text (single-line) | partial  | Mentioned only as "inline Alfred text input"; empty-string → "no API call" rule per §H not surfaced                                                  |
| text (multi-line)  | partial  | Uses NSAlert per FR-017; OK                                                                                                                          |
| number             | partial  | Inline; "show error on NaN" parse path not specified                                                                                                 |
| currency           | **gap**  | Not named anywhere; currency code from attribute definition (no user input) not specified                                                            |
| email              | partial  | "Minimal `x@y.z` shape check" not surfaced                                                                                                           |
| phone              | **gap**  | Country-code-from-prefix or workspace-default inference behavior not surfaced                                                                        |
| date               | partial  | `YYYY-MM-DD` parse contract surfaced; inline parse-error row visualization not designed                                                              |
| datetime           | **gap**  | System-TZ ↔ UTC conversion at display + input + prefill boundaries is FR-042's load-bearing detail; not in EXPERIENCE or DESIGN                     |
| single-select      | covered  | KF-4 walks it; sub-script-filter with current-value check icon described                                                                             |
| record-reference   | partial  | Sub-search reusing F-B semantics noted in Interaction Primitives; the zero-results "No <object> match <query> / ⏎ is no-op" detail not in EXPERIENCE |
| URL                | **gap**  | "Minimal scheme check" not surfaced                                                                                                                  |

---

## Qualitative drop check

- **"Calm productivity"**: lands in DESIGN's Brand & Style section ("editorial-cold, calm productivity, simplicity"). Lands implicitly in EXPERIENCE's Voice/Tone ("calm, declarative, brief"). **Covered.**
- **"Editorial-cold"**: lands in DESIGN repeatedly (Brand & Style, type ladder rationale). **Covered.**
- **"1-3 keystrokes"** (PRD §1, the core promise): **not surfaced in EXPERIENCE or DESIGN as a constraint.** No spec says "any high-value action must be reachable in ≤3 keystrokes from `⌥space`". KF flows happen to demonstrate this but the principle is not codified. **Notable qualitative drop.**
- **"Single-instrument success metrics" / GitHub-issue-only signal** (PRD §7): not surfaced in EXPERIENCE — but this is arguably a PM/ops concern, not UX. Acceptable.
- **"Honest about constraints" / multi-workspace limitation** (UJ-3 closing paragraph + FR-027): UX onboarding flow (KF-3) does **not** echo this constraint. README is named as the disclosure surface but EXPERIENCE doesn't enumerate any in-Alfred copy about it. **Minor drop.**
- **"Frictionless extension of Attio, not a third-party tool grafted on top"**: lands in DESIGN Brand & Style intro. **Covered.**
- **"No emoji, no marketing gloss"**: lands in both DESIGN (Do's and Don'ts) and EXPERIENCE (Voice rule 3). **Covered.**
- **"⇧ Quick Look is the climax beat across all three read flows"**: KF-1, KF-2 both pivot on ⇧. **Covered structurally.**
- **"No optimistic UI"** (FR-046, a deliberate choice): EXPERIENCE State Patterns names the PATCH-in-flight spinner row. The _principle_ (we deliberately do not show optimistic state) is not stated as a design rule, just as a state. Minor.
- **"⌥space binding assumption" + dozens-of-times-a-day usage** (PRD §3): not surfaced as a load-bearing constraint anywhere in the spines. This is acceptable but worth knowing: the cost-of-context-switch framing that justifies the entire visual register doesn't appear.

---

## Gaps worth surfacing

1. **(notable)** FR-042 / addendum §H per-type input UX is under-specified. Currency, phone, URL, datetime (TZ conversion), date (parse-error row visualization), number (NaN handling) all need explicit interaction primitives. No key flow walks any of these non-single-select edit types.

2. **(notable)** FR-033 per-object lifecycle attribute (the workspace-configurable subtitle override) is invisible in DESIGN's result-list-item component spec and absent from EXPERIENCE patterns. The result-list subtitle is always shown with the FR-013 defaults.

3. **(notable)** FR-030 (object discovery / keyword degradation when an object is renamed or hidden) has no microcopy entry and no state-pattern row. The "deals object missing → one-time toast" beat will be invented at implementation time.

4. **(notable)** NFR-007 offline mutating-action gating: the "Cannot reach Attio — try again later" pre-flight block string is missing from the microcopy catalog, distinct from the 5xx-after-retry message. EXPERIENCE conflates them.

5. **(notable)** Addendum §E "list-of-records-as-a-single-drill-down-row" patterns ("Linked people (top N)", "Recent notes (last 3)") aren't resolved by DESIGN — single row that opens an expansion vs N independent rows is undefined.

6. **(notable)** "1-3 keystrokes" — the core PRD promise — is not codified as a UX design constraint. Worth pinning as a non-negotiable that future drill-down depth, modal layers, or input wizards must honor.

7. **(minor)** FR-028 `attio:diag` is in the IA tree but has no DESIGN treatment (multi-line readout component) and no microcopy. Similarly `attio:refresh` (FR-032) has no success notification copy.

8. **(minor)** FR-026 (token rotation), FR-027 (single-workspace), FR-044 ("edit in Attio →" suffix copy), FR-045 (archived attributes hidden), FR-048 (off-target record-reference), FR-049 (schema-discovery failure) all lack microcopy and/or component coverage. Edge-case rot.

9. **(minor)** FR-020 empty-query semantics (recently-updated for people/companies, open deals by recency, task → todo fallback) is missing from State Patterns — only "zero results" is named.
