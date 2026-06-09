---
title: Prose Editorial Review — Addendum
status: review
created: 2026-06-04
updated: 2026-06-04
target: addendum.md
---

# Prose Editorial Review — Addendum

Clinical copy-edit. Grammar, clarity, voice consistency, awkward phrasing, hedging, table-cell parallelism, terminology drift, typos. No structural moves; no content changes. The addendum's voice should be neutral-technical and terse — the kind of prose an engineer skims on a Monday morning. Where the prose drifts toward conversational asides, apologetic hedging, or unparallel table cells, this pass flags it with a concrete replacement.

Total issues flagged: 27.

## Top issues (impact-ranked)

1. **§H matrix — "API value shape" cells are not parallel.** Some cells offer two alternatives joined by "or", some give one shape, and the prose around the matrix flags the cells themselves as uncertain ("may diverge…", "(best-known)" in the header). This is the densest block of mixed-confidence phrasing in the addendum. See item 17 below.
2. **§A table — "Notes" cells mix verb-first and noun-first.** Five rows start with a noun ("Filter DSL with…", "Same shape as people."), three start with a verb ("Used in drill-down…"), and one is a hybrid sentence ("All five fields required."). See item 1.
3. **§C.1 "(URL to verify at build)" / §C.1 "Open at build" / §H "Confirm exact field names…"** — three nearly identical build-time-verification asides scattered through the addendum, each phrased differently. See item 8.
4. **§B "Primitive NOT provided" — the `osascript` recommendation reads as deliberation, not decision.** "Recommendation: `osascript` because…" reads like the call hasn't been made; cf. the rest of the addendum which states design choices flatly. See item 6.
5. **§E — "draft starting points" hedge in the §E intro.** "These are draft starting points; UX spec downstream may refine" is hedge-stacked: "draft" + "starting points" + "may refine" + "downstream." The addendum's own intro already says this material is downstream draft. See item 11.

---

## §A — API surface

### 1. Table "Notes" column — verb/noun parallelism drift

The eight rows in the Notes column mix forms:

- Row 1 (people): "Filter DSL with `$or` / `$contains`. Substring match, case-insensitive." — noun-first.
- Row 2 (companies): "Same shape as people." — noun-first.
- Row 3 (deals): "Slug discovered via `GET /v2/objects`…" — noun-first (good).
- Row 4 (tasks): "**Deadline range and 'due today or undated' (FR-001) are client-side filters**…" — noun-first, but the bolded clause is mid-cell, not at the start.
- Row 5 (get by ID): "Used in drill-down for fetching linked record details." — verb-first ("Used").
- Row 6 (PATCH task): "See §H + FR-040 for the writable-field set." — imperative.
- Row 7 (create note): "All five fields required. Title derivation per FR-016 / FR-017." — noun-first.
- Row 8 (object schema): "For FR-030, FR-031." — fragment, no verb.
- Row 9 (self): "Returns `workspace_id`, …" — verb-first ("Returns").

Recommend a single shape across the column: noun-first declarative ("Slug discovered via…", "Drill-down: fetches linked record details.", "Identity probe response: `workspace_id`, …"). Concretely:

- Row 5: "Used in drill-down for fetching linked record details." → **"Drill-down fetch for linked record details."**
- Row 9: "Returns `workspace_id`, `workspace_slug`, `workspace_name`, `authorized_by_workspace_member_id`. For FR-025." → **"Response: `workspace_id`, `workspace_slug`, `workspace_name`, `authorized_by_workspace_member_id` (FR-025)."**
- Row 6: "See §H + FR-040 for the writable-field set." → **"Writable-field set per §H + FR-040."**

### 2. §A row 4 (tasks) — bolded mid-cell clause buries the lede

> Documented server-side filters: `assignee` and `is_completed`. **Deadline range and "due today or undated" (FR-001) are client-side filters** — fetch with `is_completed=false` + `assignee=<me>`, then filter and sort in the workflow.

The cell reads cleanly without the bold. The bolded clause does not need emphasis — it's the cell's main point, but bolding inside a one-paragraph cell is conversational rather than technical. Recommend **dropping the bold**: "Documented server-side filters: `assignee` and `is_completed`. Deadline range and 'due today or undated' (FR-001) are client-side: fetch with `is_completed=false` + `assignee=<me>`, then filter and sort in the workflow."

### 3. §A row "Mark task complete / update task" — parenthetical is over-built

> `PATCH /v2/tasks/{id}` with `{ "is_completed": true }` (or other writable fields among the four listed in §H tasks paragraph)

"the four listed in §H tasks paragraph" reads as a verbal description of a cross-reference. Tighten to: **"`PATCH /v2/tasks/{id}` with `{ "is_completed": true }` (or other writable fields per §H)."**

### 4. §A trailing sentence — "Default `limit=9`" placement

> All requests use `Authorization: Bearer <token>` against `https://api.attio.com`. Default `limit=9` for search queries to match the Alfred 9-result cap.

"to match the Alfred 9-result cap" is fine. The sentence reads cleanly. No change.

---

## §B — fast-alfred primitives

### 5. §B first bullet — em-dash splice creates a comma-splice feel

> **`alfredClient.cache.setWithTTL(key, value, { maxAge })`** — replaces the current ad-hoc TTL constants in `people.ts` (FR-031, NFR-004).

"replaces the current ad-hoc TTL constants" is fine; "ad-hoc" is the right register. No issue.

### 6. §B "Primitive NOT provided" — recommendation phrasing reads as deliberation

> Implementation: shell out to `osascript -e 'display notification "..." with title "..."'` from a small helper in `src/common/notify.ts`. Alternative: bundle `terminal-notifier` and shell to it. Recommendation: `osascript` because it has zero install footprint and works on any Alfred 5 host.

The addendum's voice elsewhere states design calls flatly. Here, the three-step "Implementation / Alternative / Recommendation" reads like the call is still open. Two concrete fixes:

- Either flatten: **"Implementation: shell out to `osascript -e 'display notification "..." with title "..."'` from a small helper in `src/common/notify.ts`. Chosen over `terminal-notifier` (the obvious alternative) for zero install footprint and Alfred 5 compatibility."**
- Or, if the "Alternative" line should stay as record: rename "Recommendation:" → **"Chosen:"** to mark it as a decision.

### 7. §B bullet on `alfredClient.output(ScriptFilter)` — long sentence, embedded parenthetical

> **`alfredClient.output(ScriptFilter)`** — standard ScriptFilter rendering for every keyword script. The `ScriptFilter.rerun` field (Alfred-supported, range 0.1s – 5.0s) is the mechanism backing FR-046's polling loading state: the drill-down script emits a spinner row, sets `rerun=0.3`, and re-evaluates until the PATCH worker writes its result-file to `alfredInfo.cache()` and the script reads it back.

The 50-word second sentence is too long for a bullet. Two-sentence split:

> The `ScriptFilter.rerun` field (Alfred-supported, range 0.1s–5.0s) backs FR-046's polling loading state. The drill-down script emits a spinner row, sets `rerun=0.3`, and re-evaluates until the PATCH worker writes its result-file to `alfredInfo.cache()` and the script reads it back.

Also: "0.1s – 5.0s" with spaces around the en-dash is inconsistent with §B last bullet's range syntax; tighten to "0.1s–5.0s".

### 8. §B `alfredClient.alfredInfo.cache()` bullet — "should not invent ad-hoc `os.tmpdir()` paths"

> The engineer should not invent ad-hoc `os.tmpdir()` paths.

Voice drift — addresses "the engineer" directly in second person (effectively). Other bullets state rules in passive/declarative. Recommend: **"Ad-hoc `os.tmpdir()` paths are out of scope."** Or: **"Do not fall back to `os.tmpdir()`."**

---

## §C — Authentication mechanics

### 9. §C.1 opening sentence — "verified during PRD discovery" is parenthetical bloat

> The Attio canonical OAuth pages (`/docs/oauth/authorize`, `/docs/oauth/token`, verified during PRD discovery) document a confidential-client-only flow…

Move the verification provenance out of the parenthetical. Either drop it (the §C.3 table covers verification provenance explicitly) or split:

> The Attio canonical OAuth pages (`/docs/oauth/authorize`, `/docs/oauth/token`) document a confidential-client-only flow…

§C.3 already carries the "verified, 2026-06-04" timestamp.

### 10. §C.1 — three near-duplicate build-time-verification asides

Three places hedge with build-time verification using different phrasings:

- §C.1 bullet 1: "User generates a PAT at https://app.attio.com/settings/api (URL to verify at build)."
- §C.1 bullet 4: "Open at build: the exact endpoint name and response shape."
- §H closing paragraph: "Confirm exact field names and shapes at build."

These should land in one phrasing. Suggested canonical form: **"Verify at build."** Then:

- §C.1 bullet 1: "User generates a PAT at https://app.attio.com/settings/api (verify URL at build)."
- §C.1 bullet 4: "Verify at build: the exact endpoint name and `/v2/self` response shape."
- §H closing: "Verify field names and shapes at build."

### 11. §C.2 sketch step 4 — "TBD at V2 design time" hedge in mid-paragraph

> Forwarding transport (TBD at V2 design time): either (a) the relay's callback page shows the token for manual paste, (b) the workflow polls a relay endpoint keyed by `state`, or (c) the relay redirects to a registered loopback URI on the desktop with the token in the URL fragment.

"TBD at V2 design time" is fine for V2 sketch material. The three options are parallel (each begins with the relay or workflow as subject). No change.

### 12. §C.2 "Trade-offs the V2 spec must address" sentence — long list

> Trade-offs the V2 spec must address: who hosts and pays for the relay, what the relay logs (ideally nothing per-user), how the `client_secret` is rotated, what happens if the relay goes down.

The clauses are parallel (each a "wh-" question). The "(ideally nothing per-user)" parenthetical breaks the parallel — it states a position, not an open question. Recommend: **"…who hosts and pays for the relay, what the relay logs, how the `client_secret` is rotated, what happens if the relay goes down. Logging position: nothing per-user."** Or simply drop the parenthetical and let the V2 spec answer it.

### 13. §C.3 table — "Verified shape" cells mix levels of detail

- `/authorize` row: enumerates required + optional fields + a note on PKCE.
- `/oauth/token` row: enumerates required fields + response + a "no `refresh_token`, no `expires_in`" note.
- Scopes row: "Not enumerated…", quotation, "To enumerate at V2 design time."

The Scopes row mixes a present-tense observation with a future-tense action item. Recommend separating: **"Not enumerated on the canonical authorize page; mentioned generically as 'tasks, user management, object configuration and records'. V2 to enumerate."**

---

## §D — Workspace customization

### 14. §D item 2 — "_preferred_ list" italics carry hedge weight

> Per-object field maps in the workflow are a _preferred_ list (e.g. for `person`: `name`, `job_title`, `primary_email_address`, `company`, `created_at`); when an entry isn't present, it's silently skipped.

The italics on _preferred_ signal that the term is being used in a non-standard sense. Either define it inline or replace: **"Per-object field maps are a preference list (best-effort, not required)…"** Or drop italics and let context carry: **"Per-object field maps are a preferred list — entries absent from the schema are silently skipped."**

Also: "when an entry isn't present, it's silently skipped" has a slight antecedent ambiguity — "entry" refers to a field-map entry, but "isn't present" could read as referring to the schema. Tighten: **"…when a listed attribute is missing from the workspace schema, it's silently skipped."**

---

## §E — Per-object field maps

### 15. §E intro — stacked hedges

> The PRD requires per-object fields. These are draft starting points; UX spec downstream may refine.

Four hedge tokens in one sentence: "draft" + "starting points" + "may refine" + "downstream." The addendum's own opening line already establishes that this is downstream-material captured upfront. Tighten: **"Draft per-object field lists; UX spec will refine."** Or even: **"V1 draft per-object field lists."** (matches the existing "(V1 draft)" suffix in the section header).

### 16. §E bullet parallelism — voice consistency across the eight sub-lists

Each sub-list bullets nouns ("Full name", "Job title", "Primary email") — good, parallel.

But drill-down items mix action labels with descriptive labels:

- Person — Drill-down: "Open in Attio (⏎)" / "Open LinkedIn (⌘⏎)" / "Linked company → opens company drill-down" / "Write note (⌥⏎ semantics, becomes its own input step)" / "Recent notes (last 3, each opens in Attio)".
- Company — Drill-down: "Open in Attio" / "Open website" / "Linked people (top N) → each opens person Quick Look" / "Open deals associated with this company" / "Write note".
- Deal — Drill-down: "Open in Attio" / "Linked company" / "Linked people" / "Linked tasks" / "Write note".
- Task — Drill-down: "Open in Attio (or fallback to tasks list per FR-004)" / "Open linked person" / "Open linked company" / "Open linked deal" / "Mark complete" / "Write note".

Two concrete drifts:

- Person bullet "Linked company → opens company drill-down" uses an arrow and verb-third-person. The same shape in the Company list — "Linked people (top N) → each opens person Quick Look" — uses an arrow and a separate clause. Both work, but the Deal list drops the arrow entirely ("Linked company", "Linked people", "Linked tasks" without action verbs), so the same concept ("linked-record navigation") is rendered three different ways across §E.
- Recommend one form for "navigate to linked record": pick verb-led ("Open linked company") or noun-led ("Linked company →") and apply uniformly. The Deal drill-down currently leaves the action implicit, which under-specifies for an engineer reading the list as a spec.

Suggested uniform form (verb-led, matches §F-B keyword naming):

- "Open linked company"
- "Open linked people" (or "Open linked person" when single)
- "Open linked tasks"

### 17. §E Person — Drill-down "Write note (⌥⏎ semantics, becomes its own input step)"

The parenthetical "becomes its own input step" reads as an implementation aside in a UX list. Recommend dropping; the keyword chord plus the noun is enough: **"Write note (⌥⏎)"**. The "input step" implementation detail is §H/§F territory.

### 18. §E Task — Quick Look "Linked person / deal / company"

Slash-separated list breaks the noun-per-bullet pattern of every other Quick Look list. Recommend either three bullets ("Linked person", "Linked deal", "Linked company") or rephrase as a single grouping bullet: **"Linked records (person, deal, company)"**.

---

## §F — Migration from current code

### 19. §F item 1 — long sentence with parenthetical decision

> Rename keyword `people` → `person` in `info.plist` (consistent across F-B). Whether the source file is also renamed `people.ts` → `person.ts` is an engineering call (default: rename for symmetry with the keyword and the rest of F-B); update `.fast-alfred.config.cjs` bundler glob and CI accordingly.

The "Whether… is an engineering call" form is hedging where the rest of §F states migrations as imperatives. Recommend flattening:

> Rename keyword `people` → `person` in `info.plist` (consistent across F-B). Default: also rename `people.ts` → `person.ts` for symmetry with F-B keywords. Update `.fast-alfred.config.cjs` bundler glob and CI accordingly.

### 20. §F item 3 — long parenthetical interrupts the verb

> Replace `quicklookurl = person.web_url` (currently rendering the Attio webapp inside the preview pane, not satisfying FR-018 / FR-034) with a generated HTML fiche written to `alfredInfo.cache()` per FR-034.

The parenthetical is 12 words inside a 26-word sentence. Split:

> Replace `quicklookurl = person.web_url` with a generated HTML fiche written to `alfredInfo.cache()` per FR-034. The current value renders the Attio webapp inside the preview pane, which does not satisfy FR-018 / FR-034.

### 21. §F item 4 — "Decide naming" hedge

> Add `→` drill-down sub-script-filter entry. Decide naming: either dedicated files (`drilldown-person.ts`, `drilldown-deal.ts`, etc.) or a single `drilldown.ts` with object dispatch via query arg.

"Decide naming" is an open question stated as an imperative — different in register from "Add `→` drill-down…". Recommend: **"Open naming question: dedicated files (`drilldown-person.ts`, `drilldown-deal.ts`, etc.) or single `drilldown.ts` with object dispatch via query arg."** Or pick a default like §F item 1 does ("Default: single `drilldown.ts`…").

### 22. §F item 6 — "Roughly ten new methods" closing aside

> New methods needed: `getSelf`, `listObjects`, `getObjectAttributes`, `patchRecord(slug, id, payload)`, `patchTask(id, payload)`, `createNote(payload)`, `listWorkspaceMembers`, plus search variants for `companies`, `deals`, `tasks`. Roughly ten new methods.

The closing "Roughly ten new methods" is redundant — the reader can count. Cut.

### 23. §F item 9 — voice drift to "supports `{name}`-style placeholder substitution"

> Centralize all UI strings into `src/strings/{en,fr}.json` (FR-037) and add a `strings.ts` helper that resolves locale at runtime (FR-038) and supports `{name}`-style placeholder substitution (NFR-012).

"resolves locale at runtime" and "supports `{name}`-style placeholder substitution" are parallel verb phrases — good. No change.

### 24. §F item 14 — "The dormant hotkey trigger UID" sentence

> The dormant hotkey trigger UID `028ACD78-…` currently declared in `info.plist` with no key/mod binding is unused.

Three modifiers stacked ("dormant", "currently declared… with no key/mod binding", "is unused"). Tighten:

> The hotkey trigger UID `028ACD78-…` in `info.plist` has no key/mod binding and is unused.

Then the next sentence ("Either bind it… or remove it. V1 default: remove…") reads cleanly.

### 25. §F item 15 — "Pre-V1 verification pass" sentence is a four-task run-on

> Pre-V1 verification pass against a fixture Attio workspace: curl-probe `PATCH /v2/objects/{slug}/records/{id}` for each editable attribute type in §H to confirm the value shape; curl-probe `POST /v2/notes` to confirm the five required fields; verify `GET /v2/tasks` filter parameters; verify the task deep-link URL still works (per FR-004).

The four tasks are parallel ("curl-probe", "curl-probe", "verify", "verify") — the verb shifts between probes 1–2 and probes 3–4. Recommend uniform verb (either all "verify" or all "curl-probe"):

> Pre-V1 verification pass against a fixture Attio workspace:
>
> - `PATCH /v2/objects/{slug}/records/{id}` value shape for each §H editable attribute type;
> - `POST /v2/notes` five required fields;
> - `GET /v2/tasks` filter parameters;
> - task deep-link URL still works (per FR-004).

(Bullet form would be a structural change — if structural moves are out of scope, keep prose form but standardize the verb: "verify… verify… verify… verify…".)

---

## §G — Distribution checklist

### 26. §G first bullet — long compound clause

> **README rewrite** (NFR-014) — must include PAT generation walkthrough with required scopes (read on records/tasks, write on tasks/notes, write on record attributes for F-G), EN + FR walkthrough (FR-037–FR-039), known limitations (single-workspace, no fuzzy search, task deep-link best-effort, no auto-update), license declaration, troubleshooting section keyed to FR-051 error copy.

70-word sentence. Five comma-separated items, two of them with internal parentheticals. Recommend semicolon separators to make the chunks parse:

> **README rewrite** (NFR-014) — must include: PAT generation walkthrough with required scopes (read on records/tasks, write on tasks/notes, write on record attributes for F-G); EN + FR walkthrough (FR-037–FR-039); known limitations (single-workspace, no fuzzy search, task deep-link best-effort, no auto-update); license declaration; troubleshooting section keyed to FR-051 error copy.

### 27. §G bullets — verb-tense drift across the list

The bullets shift between imperative and noun-phrase forms:

- "**README rewrite** … must include…" — noun, then verb-imperative.
- "**`info.plist` description rewrite** … one-paragraph user-facing summary in English." — noun, no verb.
- "**License decision** — once §8 decision lands, add…" — noun, verb-imperative.
- "**macOS version floor** — declare in README + `info.plist` once §8 decision lands…" — noun, verb-imperative.
- "**Alfred version floor** — Alfred 5+ in README and `info.plist`…" — noun, no verb.
- "**Release pipeline** — verify `fast-alfred pack`…" — noun, verb-imperative.
- "**Issue templates** — `.github/ISSUE_TEMPLATE/`…" — noun, noun-only completion.
- "**`npm run perf` script** — implements…" — noun, third-person verb.
- "**Alfred Gallery submission** — optional, once V1.0.0 is stable." — noun, adjective.

A checklist parses better if every bullet is verb-imperative after the dash. Concretely:

- "**`info.plist` description rewrite** (NFR-015) — write a one-paragraph user-facing summary in English."
- "**Alfred version floor** — declare Alfred 5+ in README and `info.plist` per OQ-3 decision log."
- "**Issue templates** — add `.github/ISSUE_TEMPLATE/` with `bug.md`, `feature.md`, `setup-failure.md`, `api-change.md` matching NFR-016 labels."
- "**`npm run perf` script** — implement the NFR-001/NFR-002 timed-invocation baseline for pre-release perf checks."
- "**Alfred Gallery submission** — submit once V1.0.0 is stable (optional)."

---

## §H — Editable scalar attribute types

### 28. §H preamble — stacked hedges

> **Build-time verification required** — see §F item 15 for the full verification scope. The payload shapes below reflect documented + observed shapes and may diverge from Attio's actual PATCH contract (single-select, single record-reference, and text especially); treat as starting point, not frozen contract.

Two hedge tokens ("may diverge", "starting point, not frozen contract") plus the bold "Build-time verification required" plus the matrix header "(best-known)". The reader is told four times that this is provisional. Recommend pruning to one statement, attached to the header:

> **Build-time verification required** (see §F item 15). Payload shapes below are documented + observed; single-select, single record-reference, and text shapes especially need confirmation at build.

Drop "(best-known)" from the matrix header column once the preamble carries the caveat.

### 29. §H matrix — "Input UX" column parallelism

The column mixes phrasings:

- `text` single-line: "Inline Alfred text input, prefilled"
- `text` multi-line: "Native macOS multi-line input window (same as FR-017 note)"
- `number`: "Inline text input; parse to number; show error on NaN"
- `currency`: "Inline text input; parse to number; currency code from attribute definition"
- `email-address`: "Inline text input; minimal `x@y.z` shape check"
- `phone-number`: "Inline text input"
- `date`: "Inline text input; require `YYYY-MM-DD`"
- `datetime`: "Inline text input; require `YYYY-MM-DDTHH:MM` interpreted in macOS system timezone"
- `single-select` / `status` / `stage`: "Sub-script-filter listing options from `GET /v2/objects/{slug}/attributes` → `options`"
- `record-reference`: "Sub-search over target object type (re-uses F-B search)"
- `url`: "Inline text input; minimal scheme check"

Three patterns mix:

- (a) noun-only ("Inline text input")
- (b) noun + semicolon-separated constraints ("Inline text input; require `YYYY-MM-DD`")
- (c) noun + parenthetical ("Sub-search over target object type (re-uses F-B search)")

The pattern is functional but inconsistent. Recommend canonicalizing on (b): noun + semicolon-separated constraints, with parenthetical only for cross-references. Example fixes:

- `phone-number`: "Inline text input" → **"Inline text input; country-code prefix parsing"**
- `text` multi-line: "Native macOS multi-line input window (same as FR-017 note)" → **"Native macOS multi-line input window; same flow as FR-017 note"**
- `record-reference`: "Sub-search over target object type (re-uses F-B search)" → **"Sub-search over target object type; re-uses F-B search"**

### 30. §H matrix — "API value shape (best-known)" column parallelism

Most cells give a JSON literal; some give two literals joined by "or".

- `text` single-line: `"new string"` or `[{ "value": "new string" }]` (multi-value wrapper, observed in some Attio responses)
- `text` multi-line: Same as single-line
- `number`: `42` or `[{ "value": 42 }]`
- `currency`: `[{ "currency_value": 50000, "currency_code": "EUR" }]`
- `email-address`: `[{ "email_address": "x@y.z" }]`
- (etc.)

Two issues:

- The "or" in rows 1 and 3 signals uncertainty about Attio's contract. This is already covered by the preamble ("payload shapes…may diverge"). Recommend picking the more-likely-correct shape (multi-value wrapper, per the parenthetical observation) and dropping the alternative; let build-time verification reconcile.
- Row 1's "(multi-value wrapper, observed in some Attio responses)" is a 9-word parenthetical inside a code cell — too noisy. Move the rationale to the preamble or drop.

### 31. §H matrix — `datetime` cell has a 60-word example

> Workflow converts system-TZ input → UTC before PATCH and converts UTC → system TZ for display (drill-down, Quick Look, prefill). Centralized in `src/common/tz.ts`. Example: user in CEST types `2026-07-15T14:30`; PATCH sends `2026-07-15T12:30:00Z`; display shows `2026-07-15 14:30` (CEST).

The cell is 55 words — by far the densest in the matrix. Concrete trim:

> Workflow converts system-TZ ↔ UTC at PATCH and display boundaries (drill-down, Quick Look, prefill). Centralized in `src/common/tz.ts`. Example: CEST input `2026-07-15T14:30` → PATCH `…T12:30:00Z` → display `2026-07-15 14:30`.

Trailing double space at end of cell ("…(CEST). |") is a stray typo — remove.

### 32. §H closing paragraph — "Tasks are a separate endpoint with a narrower writable surface"

> **Tasks are a separate endpoint with a narrower writable surface.** Task updates use `PATCH /v2/tasks/{id}` rather than the generic records-endpoint shape. **Per Attio docs, the only writable task fields are `deadline_at`, `is_completed`, single `assignee` (workspace member), and `linked_records`.** Task `content` (title/body) is not PATCH-able — it is rendered read-only in task drill-down per FR-040. The body is the writable subset directly (no `data.values` wrapper). Confirm exact field names and shapes at build.

Three issues:

- "single `assignee` (workspace member)" — terminology drift. §A row 6's earlier reference (now `assignees` per §H preamble structural-review note) and the §H prose here disagree on singular/plural. Pick one and apply uniformly. If singular, also fix the §B "Primitive NOT provided" reference if any. (Structural review item 21 already flagged this; the prose pass confirms the inconsistency.)
- "The body is the writable subset directly (no `data.values` wrapper)." — "the body" is ambiguous (HTTP body, task body, request body?). Tighten: **"Request body carries the writable subset directly (no `data.values` wrapper)."**
- "Confirm exact field names and shapes at build." — same build-time-verification phrasing variant flagged in item 10. Standardize to "Verify… at build."

### 33. §H final paragraph — "Attribute defs as gatekeeper"

> Before showing an edit affordance, the workflow consults the cached attribute definition (FR-031) to check: (a) is the type in FR-040, (b) is `is_archived: false`, (c) is `is_writable` / `is_system: false`.

The three checks are questions (a/b/c), but only (a) is phrased as a yes/no question. (b) and (c) are JSON-literal statements. Make all three parallel:

> Before showing an edit affordance, the workflow consults the cached attribute definition (FR-031) to confirm: (a) type is in FR-040; (b) `is_archived` is `false`; (c) `is_writable` is `true` and `is_system` is `false`.

Also: the final sentence — "Read-only-system attributes (`created_at`, `record_id`) are never edit-affordanced." — "edit-affordanced" is a coined verb. The rest of the addendum uses "edit affordance" as a noun. Tighten: **"Read-only system attributes (`created_at`, `record_id`) never receive an edit affordance."**

Also: hyphenation drift — "Read-only-system attributes" (double-hyphen, atypical) vs the previous sentence's "Read-only-system" usage. Use single-hyphen "read-only system attributes" throughout.

---

## Cross-cutting terminology

### 34. "writable" vs "PATCH-able"

The addendum uses both:

- §A row 6: "writable fields among the four listed in §H tasks paragraph"
- §H preamble: "narrower writable surface"
- §H closing: "Task `content` (title/body) is not PATCH-able"
- §H closing: "writable subset"

"writable" is the right canonical term (matches Attio's `is_writable` attribute). Recommend replacing "PATCH-able" with "writable" in §H closing: "Task `content` is not writable" rather than "Task `content` is not PATCH-able."

### 35. "workspace member" vs "me"

The addendum refers to the current user's workspace identity as:

- §A row 9: "`authorized_by_workspace_member_id`"
- §B `alfredClient.config` bullet: "the cached workspace ID, workspace slug, 'me' workspace member ID"
- §C.1: "workspace ID, workspace slug, and current workspace member ID"
- §F-A tasks row: "`assignee=<me>`"
- §H closing: "single `assignee` (workspace member)"

Five distinct phrasings for one concept. The cleanest canonical form is **"workspace member ID"** (matches Attio's field name). The scare-quoted "'me'" in §B and the placeholder `<me>` in §A row 4 are informal — recommend "current workspace member ID" or just "workspace member ID" with antecedent clear from context.

### 36. "fiche" — domain term, unexplained

§F item 3 uses "HTML fiche". The PRD body (per the structural review) introduces this term in the FR-018 / FR-034 area. In the addendum it appears once, unexplained. If the PRD body defines it, no fix here; if not, briefly gloss: **"generated HTML fiche (Quick Look preview document)"** on first use in §F item 3.

---

## Typos and small fixes

### 37. §C.1 — "`userconfigurationconfig`" looks wrong

> User pastes the PAT into the Alfred workflow's native `userconfigurationconfig` secure textfield

This appears to be a typo for `userconfiguration` (or a concatenation of two adjacent code identifiers). Verify against `info.plist`.

### 38. §C.2 step 2 — ellipsis in URL example

> opens `https://app.attio.com/authorize?client_id=…&redirect_uri=<RELAY_DOMAIN>/callback&response_type=code&state=<random>`

Mixed conventions: `…` (Unicode ellipsis) for the client_id value, `<RELAY_DOMAIN>` (angle-bracket placeholder) for the redirect_uri, `<random>` (lowercase angle-bracket) for state. Pick one placeholder style. Recommend angle-bracket placeholders throughout: `client_id=<CLIENT_ID>&redirect_uri=<RELAY_DOMAIN>/callback&response_type=code&state=<STATE>`.

### 39. §H `phone-number` row — trailing ellipsis

> `[{ "original_phone_number": "+33 …", "country_code": "FR" }]`

Unicode ellipsis inside an example string literal. Convention check — if the rest of the matrix uses `...` (three dots) or `…` (Unicode), standardize. `single-select` row above uses `"id": "..."` (three dots). Standardize to `"..."` (three dots) here: `"+33 ..."`.

### 40. §H `datetime` row — trailing double space at cell end

> …display shows `2026-07-15 14:30` (CEST). |

Two trailing spaces before the cell pipe. Remove one.

### 41. §A row "Search tasks" — bold mid-sentence inside a cell

Flagged in item 2 above. Bold inside table cells reads as emphasis-creep elsewhere in the doc (none of the other §A cells use bold). Cut.

### 42. Section header punctuation drift

- §A: "Attio API surface used by V1" — no trailing period.
- §B: "fast-alfred primitives leveraged" — no trailing period.
- §C: "Authentication mechanics" — no trailing period.
- §C.3: "What's verified from Attio docs (PRD discovery, 2026-06-04)" — parenthetical date.
- §E: "Per-object Quick Look and drill-down field maps (V1 draft)" — parenthetical scope marker.
- §G: "Distribution checklist (build-time)" — parenthetical scope marker.
- §H: "Editable scalar attribute types — input UX and API payload matrix (F-G)" — em-dash + parenthetical.

Headers are inconsistent. §A, §B, §C, §D, §F use bare titles; §C.3, §E, §G, §H decorate. No fix needed if the doc owner is fine with this — flagging as taste, not error.

---

## Final notes

The addendum's voice is mostly solid: terse, declarative, technical. The drift patterns are concentrated in three places:

- **Table cells** (§A Notes column, §H Input UX column, §H API value shape column) where short-form parallelism erodes.
- **Build-time-verification asides** (§C.1, §C.3, §H, §F-15) which use four different phrasings for the same concept.
- **Hedge stacking** (§E intro, §H preamble) where 3–4 hedge tokens stack in a single sentence.

Fixing the three drift patterns above would address roughly two-thirds of the 42 issues flagged. Everything else is line-level.
