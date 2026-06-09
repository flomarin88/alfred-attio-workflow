---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-06-08'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/prd.md
  - _bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/.decision-log.md
  - _bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/.decision-log.md
  - _bmad-output/planning-artifacts/architecture.md
---

# alfred-attio-workflow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for `alfred-attio-workflow`, decomposing the requirements from the PRD, UX Design (DESIGN.md + EXPERIENCE.md), and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

Numbered FR-001 to FR-051 across 7 feature groups in the PRD. Listed by group with the requirement summary; PRD §5 carries the full statement, success criteria, and edge cases.

**F-A — Morning to-do (UJ-1)**

- FR-001: `todo` keyword lists current user's open tasks scoped to "due today or undated + assigned to me", overdue tasks segmented under `OVERDUE` / `EN RETARD`.
- FR-002: Each row renders task content + linked person + linked deal + linked company; missing links silently omitted.
- FR-003: Sort: `deadline_at` asc, `created_at` desc tiebreaker.
- FR-004: ⏎ opens task in Attio (constructed `…/tasks?command-menu-page=task&id=…` URL; silent fallback to tasks list view on contract break).
- FR-005: ⌘⏎ marks task complete via API, invalidates task cache (per FR-047), notifies success or workflow-rendered error per FR-051.
- FR-006: ⇧ opens Quick Look fiche showing task content, deadline, assignee, linked records.
- FR-007: → opens drill-down with linked records + quick actions; backspace returns.
- FR-008: Empty state row with `{workspace_member_name}`-interpolated copy.
- FR-009: Loading-state row with `sync` icon when query unresolved.

**F-B — Universal search (UJ-2)**

- FR-010: Four keywords `person`, `company`, `deal`, `task` accepting free-text.
- FR-011: Max 9 results per keyword.
- FR-012: Substring filter (case-insensitive) on the object's primary name attribute; no fuzzy.
- FR-013: Per-object context line — person: job title + company, company: domain or location, deal: stage + value, task: deadline + status.
- FR-014: ⏎ opens record via `web_url`.
- FR-015: ⌘⏎ opens LinkedIn (person) / website (company); for deal/task degrades to opening in Attio with a one-time hint; `cmd_enter_hint_dismissed` boolean persisted globally.
- FR-016: ⌥⏎ — single-line note creation; title auto-derived to 80 chars; `format=plaintext`.
- FR-017: ⇧⌥⏎ — multi-line note via macOS NSAlert; title auto-derived from first non-empty line, 80 chars; newlines preserved.
- FR-018: ⇧ opens Quick Look per-object fiche.
- FR-019: → opens single-level drill-down; opening linked records leaves Alfred to Attio (V1 cap; V2-5 lifts).
- FR-020: Empty queries — `person`/`company` show recently updated; `deal` shows open deals by recency; `task` falls through to `todo` semantics.
- FR-021: Empty results row with query-aware copy.

**F-C — Onboarding & auth (UJ-3)**

- FR-022: First-invocation without PAT shows setup prompt row "Attio API token not configured — ⏎ for setup instructions".
- FR-023: ⏎ on setup prompt opens README PAT-setup anchor; README documents Attio Settings → Developer → API tokens + Alfred preferences → Configure path.
- FR-024: PAT stored in Alfred `userconfigurationconfig` secure textfield; read via `alfredClient.env.getEnv`.
- FR-025: First successful API call probes `GET /v2/self` → `workspace_id`, `workspace_slug`, `workspace_name`, `authorized_by_workspace_member_id`; cached via `alfredClient.config`; first-success macOS notification "Connected to {workspace_name}"; failure modes named.
- FR-026: Token rotation detection by SHA-256 hash comparison; identity invalidated on mismatch.
- FR-027: Multi-workspace not supported V1; PAT is workspace-scoped; documented in README.
- FR-028: `attio:diag` keyword surfaces workspace, member, cache age, last error, PAT presence, workflow version — never PAT bytes.
- FR-029: Reserved for V2 OAuth flow keyword.

**F-D — Workspace customization**

- FR-030: `GET /v2/objects` on first run; per-keyword graceful degradation when object renamed or hidden.
- FR-031: `GET /v2/objects/{slug}/attributes` cached 24h; refreshable via `attio:refresh`.
- FR-032: `attio:refresh` flushes all caches + re-fetches identity + schemas; success notification with object/schema counts.
- FR-033: Per-object lifecycle attribute slug textfields in `info.plist` (`LIFECYCLE_ATTRIBUTE_PERSON/COMPANY/DEAL`); appends a segment to FR-013 context line; tasks excluded (use FR-013 status field directly).

**F-E — Quick Look + drill-down rendering**

- FR-034: Quick Look HTML to `alfredInfo.cache()`; inline CSS; no external deps.
- FR-035: Drill-down items use ScriptFilter pattern; each item independently actionable.
- FR-036: Both Quick Look and drill-down gracefully degrade — missing attributes silently omitted.

**F-F — Localization**

- FR-037: EN + FR strings centralized in `src/strings/{en,fr}.json`; no inline literals.
- FR-038: Auto-detect macOS system locale; `LANGUAGE_OVERRIDE` config field overrides; fallback EN.
- FR-039: Attio record values are never translated.

**F-G — Field updates (UJ-4)**

- FR-040: Editable scalar types on records — text, number, currency, email, phone, date/datetime, single-select, single record-reference, URL. Tasks have narrower writable set (deadline, is_completed, assignees, linked_records); task content is read-only.
- FR-041: Drill-down renders each editable attribute as a row with current value inline.
- FR-042: Per-type input UX — text input prefill for scalars; sub-picker for single-select; sub-search for record-reference; datetime parsed in macOS TZ, converted UTC for PATCH and back for display.
- FR-043: Save fires `PATCH /v2/objects/{slug}/records/{id}` or `PATCH /v2/tasks/{id}`; on success → cache invalidation per FR-047 + macOS notification "Updated {field}: {new_value}"; on failure → FR-051 error notification.
- FR-044: Non-FR-040 attribute types render read-only with "→ edit in Attio" suffix.
- FR-045: Archived attributes hidden entirely from drill-down.
- FR-046: No optimistic UI; spinner via `ScriptFilter.rerun` + status file convention while PATCH in flight.
- FR-047 (cross-cutting): Cache invalidation on every mutation; record entry + list pages containing it; schema cache untouched.
- FR-048: Record-reference attribute whose target is not {people, companies, deals, tasks} renders read-only with "edit in Attio →" suffix.
- FR-049: Attribute-def discovery failure → F-G affordances suppressed for that object; `attio:diag` surfaces the gap.
- FR-050: 403 on PATCH marks the field "read-only — token lacks write scope" for the session; cleared on token rotation.
- FR-051 (cross-cutting): All workflow-rendered error notifications use EN/FR strings except 422 (Attio's field-level message verbatim); HTTP status → user-visible copy mapping (401 / 403 / 404 / 422 / 429 / 5xx).

### NonFunctional Requirements

- NFR-001: Cached lists render in a single frame; `npm run perf` script as measurable baseline.
- NFR-002: Cold API-bound queries show loading after 300ms (NFR-003) and complete in < 2s on typical broadband.
- NFR-003: Loading state shown after 300ms of unresolved query.
- NFR-004: Per-object TTLs — tasks 60s, people 10min, companies 24h, deals 5min, schemas 24h.
- NFR-005: Attio 429 backoff + 1 retry; second failure → workflow-rendered error.
- NFR-006: No background polling.
- NFR-006a: Concurrency model — last-writer-wins on filesystem cache; PATCHes not deduplicated client-side.
- NFR-007: Offline detection = socket failure or 5xx after retry; mutations gated pre-flight; cached results shown with "Offline — showing cached data" prefix.
- NFR-008: 401 → single row prompting re-paste in Alfred preferences.
- NFR-009: No telemetry/analytics/remote logging; PAT never logged; `alfredClient.log` only.
- NFR-010: PAT in Alfred encrypted `userconfigurationconfig`; never written elsewhere; `attio:diag` never reveals PAT bytes.
- NFR-011: Quick Look HTML cache scrubbed on `attio:refresh` and workflow update.
- NFR-012: EN + FR in V1; `{name}` placeholder substitution; ICU pluralization out of scope.
- NFR-013: `semantic-release` produces `.alfredworkflow` artifact attached to GitHub Releases; no auto-update.
- NFR-014: README rewrite required pre-V1.0.0 — install + scopes + walkthrough + known limitations + license + non-affiliation.
- NFR-015: `info.plist` description rewrite pre-V1.0.0.
- NFR-016: GitHub Issue labels + templates (`bug`, `feature`, `setup-friction`, `perf`, `api-change`); quarterly triage.

### Additional Requirements

From the Architecture document (Important gaps with stated defaults + integration constraints):

- Foundation helpers must be authored before keyword scripts: `constants.ts`, `error.ts`, `cache.ts`, `auth.ts`, `tz.ts`, `notify.ts`, `strings.ts`, `script-filter.ts`, `status.ts`.
- ESLint flat config with `no-restricted-imports` enforcing the internal-boundary table from Architecture §Architectural Boundaries.
- vitest configured with mirror-tree under `test/` (one `.test.ts` per source file); 70% coverage min on helpers, raised to 85% pre-V1.0.0.
- `scripts/perf.mjs` (NFR-001/002) measurable baseline; output appended to release notes.
- `scripts/verify-attio-shapes.mjs` (addendum §F item 15) probes each encoder type against a fixture workspace pre-release.
- Inter + Inter Display + JetBrains Mono WOFF2 (SIL OFL) bundled in `assets/fonts/`; loaded via `@font-face` with `file://` paths to `alfredInfo.bundleDir()`.
- Lucide icons exported as PNG at 14×14 stroke-1.5 in `assets/icons/` per DESIGN.md mapping; light/dark/2x variants for object types and state badges.
- `AttioClient` expansion ~10 new methods: `getSelf`, `listObjects`, `getObjectAttributes`, `queryRecords`, `getRecord`, `patchRecord`, `patchTask`, `createNote`, `listWorkspaceMembers`, `listTasks`.
- zod schemas in `src/common/attio/schemas.ts` for every response shape; `.transform()` step converts Attio `snake_case` to internal `camelCase`.
- Per-type PATCH encoders one file each under `src/common/attio/encoders/`; dispatch via index array.
- Status file convention (FR-046) — JSON under `alfredInfo.cache()/_status/<request_id>.json`; design comment to be locked when `status.ts` is authored.
- Existing brownfield migration items (addendum §F): rename `people` → `person` keyword, replace dead cache constants, replace fake Quick Look (web_url → HTML fiche), fix throw-on-missing-PAT, remove dormant hotkey UID `028ACD78-…`.
- `.github/ISSUE_TEMPLATE/` with 4 templates matching NFR-016 labels; PR template; pre-commit hooks (Husky + lint-staged).
- `npm run test && npm run lint && npm run build` as CI gates on every push.
- License: MIT default (decision deferred to engineering but documented in addendum §G).
- macOS floor: macOS 13+ (Ventura), aligned with Alfred 5; declared in README + `info.plist`.

### UX Design Requirements

From DESIGN.md and EXPERIENCE.md, the UX deliverables that need code work (UX-DRs are separate from the FRs, which are PRD-level capability statements):

- **UX-DR1: Inter / Inter Display / JetBrains Mono WOFF2 bundling.** Inter (SIL OFL) and JetBrains Mono (OFL) packaged in the `.alfredworkflow` under `assets/fonts/`, loaded via `@font-face` in Quick Look HTML with `file://` paths. Never relied on as system fonts.
- **UX-DR2: Lucide icon set + mapping table.** Person → `user`, Company → `building-2`, Deal → `handshake`, Task → `circle-check` (with `circle-check-big` for completed and `circle-alert` for error). All 14×14 stroke-1.5; exported as PNG with light/dark/2x variants. Never traced, copied, or derived from Attio assets.
- **UX-DR3: Light + dark mode token application.** Quick Look HTML responds to `prefers-color-scheme`. Alfred bar inherits user theme; per-object icons swap via `@dark` filename convention. WCAG-AA verified tokens for both modes.
- **UX-DR4: Quick Look HTML fiche component per object type.** Person, Company, Deal, Task fiches per addendum §E field maps. Tagged template literal `html`` ` helper for XSS-safe interpolation; `getStyles(mode)` for theming; semantic HTML (`<section>`, `<dl>`, `<dt>`, `<dd>`).
- **UX-DR5: Status pill component (outlined, no fill).** Renders deal stage / task `is_completed` / lifecycle attribute value. Token `pill-status` from DESIGN.md. Uses workspace's actual option label verbatim per FR-039.
- **UX-DR6: ScriptFilter `row()` builder.** Centralized `src/common/script-filter.ts` so no keyword script constructs `AlfredItem` literals. Title/subtitle/mod-text register normalized.
- **UX-DR7: Microcopy catalog implementation.** 30+ entries from EXPERIENCE.md §Voice and Tone catalog populated as `src/strings/{en,fr}.json` with the dot-notation keys named in `strings.t(...)` calls. EN and FR both shipped V1.
- **UX-DR8: Non-affiliation microcopy + disclaimer placement.** First-run notification "Unofficial workflow for Attio — not affiliated with Attio Inc." (EN) / "Workflow non officiel pour Attio — sans affiliation à Attio Inc." (FR). Disclaimer row 0 in `attio:diag` output. README non-affiliation section.
- **UX-DR9: `attio:diag` redaction.** Row 3 shows `Token: configured` or `missing` only — never hash bytes. Row 5 endpoint patterns strip record IDs (`<redacted>`). `DIAG_INCLUDE_IDENTITY` config flag for users sharing public screenshots.
- **UX-DR10: Drill-down state machine + state file convention.** Drill-down single-level (FR-019). Editable field row exposes `→ edit` suffix. Edit input states: text input, sub-picker, sub-search, parse-error row, PATCH-in-flight spinner via `rerun`. State file under `alfredInfo.cache()/_status/`.
- **UX-DR11: macOS notification helper.** `src/common/notify.ts` wrapping `osascript -e 'display notification …'`. Success / error / info variants; FR-051 error copy threading.
- **UX-DR12: Localization fallback + override.** `strings.ts` resolves locale: `LANGUAGE_OVERRIDE` env var > macOS system locale > EN. Fallback to EN with a debug log warning when key is missing. `{name}`-style placeholder substitution.
- **UX-DR13: Onboarding cliff documentation.** README PAT-setup anchor includes screenshots of Attio settings + explicit "now open Alfred preferences → Workflows → Attio → Configure" step. No in-product onboarding tour.
- **UX-DR14: Known Limitations section in README.** 8 design-intent items from EXPERIENCE.md: single-level drill-down, Quick Look mouse-copy, onboarding cliff, subtitle truncation, no-undo on mark-complete, todo-vs-task-search mapping, no-cancel during edit, 9-result cap.
- **UX-DR15: Accessibility floor implementation.** WCAG AA contrast verified for `ink-primary`/`ink-secondary`/`ink-tertiary`/`outline` against `surface` and `surface-raised` in both modes. Color-independent state signals (icon + text). `prefers-reduced-motion` respected for the future spinner animation.

### FR Coverage Map

**Functional Requirements:**

- FR-001..009 → Epic 1 (read-only `todo` keyword)
- FR-010..015 → Epic 2 (search + open + mods)
- FR-016, FR-017 → Epic 4 (note creation)
- FR-018 → Epic 3 (Quick Look in search)
- FR-019 → Epic 5 (drill-down)
- FR-020, FR-021 → Epic 2 (empty queries + empty results)
- FR-022..028 → Epic 1 (onboarding + auth + diag)
- FR-029 → out of scope V1 (V2 OAuth keyword)
- FR-030..032 → Epic 1 (schema discovery + cache + `attio:refresh`)
- FR-033 → Epic 2 (lifecycle override in subtitle)
- FR-034..036 → Epic 3 (Quick Look + drill-down rendering + graceful degradation)
- FR-005 → Epic 4 (mark task complete — first exercise of FR-047 + FR-051)
- FR-006, FR-007 → Epic 5 (drill-down in todo / per-object actions)
- FR-040..046, FR-048..050 → Epic 5 (full F-G edit surface)
- FR-047 (cross-cutting cache invalidation) → Epic 1 skeleton, Epic 4 first mutations, Epic 5 full coverage
- FR-051 (cross-cutting error policy) → Epic 1 skeleton, Epic 4 first surfaces, Epic 6 full FR catalog parity
- FR-037..039 → Epic 1 (scaffold EN-only + locale resolution) + Epic 6 (FR parity + override + lookup audit)

**Non-Functional Requirements:**

- NFR-001..003 → Epic 1 (loading state + perf-budget-as-baseline) + Epic 6 (perf script measurement)
- NFR-004..006a → Epic 1 (cache TTLs, retry, no polling, concurrency)
- NFR-007 → Epic 1 (offline detection) + Epic 4 (mutation pre-flight block)
- NFR-008 → Epic 1 (401 prompt re-paste)
- NFR-009..011 → Epic 1 (no telemetry, PAT storage, scrub on refresh)
- NFR-012 → Epic 1 (locale + placeholders) + Epic 6 (FR parity)
- NFR-013..016 → Epic 6 (semantic-release, README, info.plist, issue templates)

**UX Design Requirements:**

- UX-DR1 (Inter bundling), UX-DR2 (Lucide), UX-DR6 (row builder), UX-DR8 (disclaimer microcopy), UX-DR9 (`attio:diag` redaction), UX-DR11 (notify helper), UX-DR12 (i18n fallback) → Epic 1
- UX-DR3 (light+dark tokens — full), UX-DR4 (fiche components), UX-DR5 (status pill), UX-DR15 (a11y floor) → Epic 3
- UX-DR10 (drill-down state machine) → Epic 5
- UX-DR7 (microcopy catalog full), UX-DR8 (full disclaimer placement), UX-DR13 (onboarding cliff docs), UX-DR14 (Known Limitations section) → Epic 6

## Epic List

### Epic 1: Get connected and see today

Install workflow, paste PAT, immediately see today's tasks with linked context. This epic delivers the workflow's onboarding + first-value moment end-to-end. Foundation helpers (cache, error, auth, tz, notify, strings, script-filter, status, constants), ESLint flat config with boundary enforcement, vitest with mirror-tree under `test/`, Inter + Lucide assets bundled, EN strings scaffold, `AttioClient` read-only methods, identity probe, non-affiliation disclaimer, and read-only `todo` keyword.

**FRs covered:** FR-001 to FR-009, FR-022 to FR-028, FR-030 to FR-032, FR-037 to FR-039 (EN only scaffold), FR-047 (skeleton), FR-051 (skeleton)
**NFRs covered:** NFR-001 to NFR-011, NFR-014/015 (minimal stubs to unblock dev)
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3 (partial, light + dark tokens defined but only light-mode application until Epic 3 lands the fiche), UX-DR6, UX-DR8, UX-DR9, UX-DR11, UX-DR12

### Epic 2: Find any record from anywhere

Search any Attio record from Alfred and open it in Attio or LinkedIn/website without opening the app first. Keywords `person`, `company`, `deal`, `task`; result rows with `⏎` (open in Attio) and `⌘⏎` (LinkedIn / website / fallback hint for deal+task); empty-query defaults; lifecycle attribute overlay in subtitle.

**FRs covered:** FR-010 to FR-015, FR-020, FR-021, FR-033
**Builds on:** Epic 1 (helpers, `AttioClient.queryRecords`, strings, `row()`)

### Epic 3: Preview records with Quick Look

Glance at a record's details (person, company, deal, task) in the Quick Look pane without ever opening Attio. HTML fiche generator with `prefers-color-scheme` light/dark, per-object field maps from addendum §E, status pill component, full a11y floor (WCAG AA contrast verified, semantic HTML, color-independent state signals). Wires `⇧` in every search keyword (Epic 2) and in `todo` (Epic 1).

**FRs covered:** FR-006, FR-018, FR-034, FR-035, FR-036
**UX-DRs covered:** UX-DR3 (full light+dark application), UX-DR4, UX-DR5, UX-DR15
**Builds on:** Epics 1-2

### Epic 4: Act on records from the bar (notes + mark complete)

Log notes and mark tasks complete from Alfred without opening Attio. `⌘⏎` on task rows fires PATCH; `⌥⏎` opens single-line note input; `⇧⌥⏎` opens macOS NSAlert for multi-line; success notifications + FR-051 error notifications; first full exercise of the FR-047 cache invalidation contract.

**FRs covered:** FR-005, FR-016, FR-017, FR-047 (full mutation paths), FR-051 (first user-facing surfaces)
**NFRs covered:** NFR-007 mutating-action pre-flight block
**Builds on:** Epics 1-3

### Epic 5: Edit scalar fields with drill-down

Update any scalar field (stage, value, email, phone, date, etc.) on any record without leaving Alfred. F-G full edit surface: drill-down dispatcher, per-type input UX (text / number / email / phone / date / datetime / single-select / record-reference / URL), PATCH state machine with `ScriptFilter.rerun` spinner, read-only fallbacks for non-editable types and off-target record-references, 403 read-only marker, schema-discovery failure handling, `scripts/verify-attio-shapes.mjs` curl-probe.

**FRs covered:** FR-007 (drill-down in todo), FR-019, FR-040 to FR-046, FR-048, FR-049, FR-050
**UX-DRs covered:** UX-DR10
**Builds on:** Epics 1-4

### Epic 6: French localization and public OSS shipping

French users get a native-feeling workflow; new users discover the workflow on GitHub Releases and complete setup successfully without support friction. EN+FR microcopy parity sweep + language override config, README rewrite (install + scopes + walkthrough + Known Limitations + license + non-affiliation), info.plist description, GitHub Issue Templates + labels, perf baseline script + measurement, semantic-release artifact verification.

**FRs covered:** FR-037 to FR-039 (full catalog parity + override), FR-051 (full FR catalog parity)
**NFRs covered:** NFR-001/002 (perf script + measurement), NFR-013 to NFR-016
**UX-DRs covered:** UX-DR7, UX-DR8 (full disclaimer placement), UX-DR13, UX-DR14
**Builds on:** Epics 1-5 (polish + distribution layer over the built surface)

---

## Epic 1: Get connected and see today

Install workflow, paste PAT, immediately see today's tasks with linked context.

### Story 1.1: Project foundations and CI gates

As a maintainer,
I want vitest, ESLint flat config with the internal-boundary rules from the architecture, Husky + lint-staged pre-commit hooks, and the bundled fonts + icon directories scaffolded,
So that every subsequent story has a working local dev loop and CI gates that prevent layering violations from landing.

**Acceptance Criteria:**

**Given** the repo as it stands on `feat/people`
**When** I run `npm install` then `npm run lint && npm run test && npm run build` on a fresh checkout
**Then** all three commands exit 0 with no errors, vitest reports "no tests" (or runs a sample placeholder), and ESLint enforces the internal-boundary table from Architecture §Architectural Boundaries with `no-restricted-imports`.
**And** the directories `src/common/`, `src/strings/`, `assets/fonts/`, `assets/icons/`, `test/`, `scripts/` exist with `.gitkeep` placeholders where empty.
**And** Inter, Inter Display, and JetBrains Mono WOFF2 files are committed to `assets/fonts/` with their SIL OFL license file alongside, and Lucide PNG exports for `person / company / deal / task / info / sync / error / warning / success` (+ `@2x`, `@dark`, `@2x@dark` variants) are committed to `assets/icons/` with the Lucide ISC license file alongside.
**And** the CI workflow `.github/workflows/ci.yml` runs lint + test + build on every push and PR.
**And** a Husky pre-commit hook runs Prettier + ESLint on staged files only.

### Story 1.2: Error model and Result wrapping

As an AI agent implementing later stories,
I want a shared `WorkflowError` discriminated union and a `Result<T, E>` async wrapper,
So that every async call site follows the same error-handling pattern instead of throwing.

**Acceptance Criteria:**

**Given** `src/common/error.ts` and the constants module
**When** I import `WorkflowError`, `Result`, `errorRow`, and `ok` / `err` helpers
**Then** `WorkflowError` carries the seven `kind` variants from Architecture (`auth-invalid`, `auth-scope-missing`, `record-not-found`, `validation`, `rate-limit`, `unreachable`, `unknown`) with their associated payloads (`httpStatus`, `attioMessage`, `fieldSlug`, `retryAfter`, etc.).
**And** `Result<T, E>` is a tagged union of `{ ok: true; data: T }` and `{ ok: false; error: E }`, with `ok(data)` and `err(error)` constructors.
**And** `errorRow(error: WorkflowError)` returns an Alfred-row object whose title/subtitle reference the FR-051 microcopy key family (`errors.{kind}`), without inlining literals.
**And** unit tests cover the round-trip of every `kind` and validate that `errorRow` does not interpolate the PAT or any sensitive payload field.

### Story 1.3: Cache layer with invalidation contract

As an AI agent,
I want a cache module that wraps `alfredClient.cache` with explicit key derivation and FR-047 invalidation methods,
So that mutations and reads share a single contract instead of each script inventing its own keys.

**Acceptance Criteria:**

**Given** `src/common/cache.ts`
**When** I call `cache.key('record', 'people', 'abc-123')` and `cache.key('list', 'people', queryHash)` and `cache.key('schema', 'attributes', 'deals')` and `cache.key('identity')`
**Then** the returned strings are stable across invocations with the same args and never overlap between categories.
**And** `cache.setRecord(slug, id, value)` writes the canonical record cache; `cache.getRecord(slug, id)` reads it back; `cache.invalidateRecord(slug, id)` clears that entry plus any cached list pages that contained it (verified by a list-page snapshot containing the record being absent after the call).
**And** TTLs read from `constants.ts` per object — tasks 60s, people 10min, companies 24h, deals 5min, schemas 24h.
**And** vitest covers: stable key generation, TTL expiry behavior (using `vi.useFakeTimers`), and `invalidateListsContaining` correctness when a list contains the invalidated record.

### Story 1.4: Localization scaffold with EN catalog

As an AI agent,
I want `strings.ts` with locale resolution (`LANGUAGE_OVERRIDE` env > macOS system locale > EN fallback) and `t(key, params?)` with `{name}` substitution,
So that every UI string in subsequent stories is rendered through one helper, never inlined.

**Acceptance Criteria:**

**Given** `src/common/strings.ts` and `src/strings/en.json`
**When** I call `strings.t('setup.title')`
**Then** I receive the EN string declared in `en.json` for that key.
**And** `strings.t('errors.validation', { attioMessage: 'Email is required' })` substitutes the `{attioMessage}` placeholder.
**And** when the configured locale resolves to a missing key, the function returns the EN fallback for that key and emits one debug-log warning via `alfredClient.log`.
**And** `src/strings/en.json` is seeded with the FR-022/FR-025 setup + first-success microcopy entries needed by Epic 1 (the rest of the catalog lands in Epic 6); `fr.json` exists as an empty `{}` to keep the loader honest.
**And** vitest covers placeholder substitution, locale resolution priority, and EN fallback path.

### Story 1.5: Shared output primitives (notify + row + icons + constants)

As an AI agent,
I want `notify.ts` (osascript shell-out), `script-filter.ts` (centralized `row()` builder), an icon registry, and shared `constants.ts`,
So that every keyword script renders rows, calls notifications, and references constants through a single uniform shape.

**Acceptance Criteria:**

**Given** `src/common/notify.ts`, `script-filter.ts`, and `constants.ts`
**When** I call `notify.success('Connected to Studio')` and `notify.error('Token invalid')`
**Then** the helper spawns `osascript -e 'display notification "..." with title "..."'` with the workflow name as the title and the message as the body; the call returns a `Result<void, WorkflowError>`; failure to spawn returns `{ kind: 'unknown' }`.
**And** `row({ title, subtitle?, icon, arg, quicklookurl?, mods? })` returns an `AlfredItem` with consistent shape; `icon` is a key into the icon registry (mapping the DESIGN.md icon names to bundled PNG file paths under `alfredInfo.bundleDir()/icons/`).
**And** `constants.ts` exports `API_BASE_URL`, `DEFAULT_RESULT_LIMIT = 9`, TTL constants per object, retry params (`RETRY_INITIAL_DELAY_MS = 1000`, `RETRY_MAX_DELAY_MS = 8000`), and the `IconKey` type.
**And** unit tests cover `row()` icon resolution, ScriptFilter shape, and `notify` osascript invocation via a mocked `child_process.spawn`.

### Story 1.6: Token validation and identity probe

As a user pasting my PAT for the first time,
I want the workflow to detect the token, validate it via `GET /v2/self`, and cache my workspace identity,
So that subsequent invocations don't re-probe and so a token rotation is detected automatically.

**Acceptance Criteria:**

**Given** `src/common/auth.ts` and `src/common/attio/identity.ts`
**When** any keyword script's entry calls `auth.assertCurrent(alfredClient)` and a PAT is configured
**Then** the PAT value is read via `env.getEnv`, hashed with SHA-256 in memory, compared to the cached hash from `alfredClient.config`, and on mismatch the cached identity + record cache are invalidated and `/v2/self` is re-probed.
**And** the identity probe parses the response with a zod schema (`{ workspace_id, workspace_slug, workspace_name, authorized_by_workspace_member_id }`) and persists the four fields via `alfredClient.config`.
**And** on first successful probe (no prior identity cached), a one-time macOS notification fires with the FR-025 microcopy `Connected to {workspace_name}`.
**And** if the PAT is missing, `auth.assertCurrent` returns `{ ok: false, error: { kind: 'auth-invalid' } }` without making an API call (so the keyword caller can render the setup prompt).
**And** unit tests cover the hash-mismatch path, missing-PAT path, and successful probe; the test for "no hash bytes written to config" asserts the cached value is the hash, not the PAT itself, and that the hash never appears in `alfredClient.log` outputs.

### Story 1.7: Attio API client read paths

As an AI agent,
I want an `AttioClient` with read-only methods, zod-validated responses, and FR-051 error mapping,
So that every keyword in Epic 1 (and onward) talks to Attio through a single, validated, retry-aware client.

**Acceptance Criteria:**

**Given** `src/common/attio/client.ts` and `src/common/attio/schemas.ts`
**When** I call `client.getSelf()`, `client.listObjects()`, `client.getObjectAttributes(slug)`, `client.listTasks({ assigneeWorkspaceMemberId, isCompleted })`, or `client.queryRecords(slug, body)`
**Then** each method returns a `Result<T, WorkflowError>` where `T` is the zod-parsed shape with `snake_case` → `camelCase` transformation.
**And** the internal `fetch(method, path, body?)` sets `Authorization: Bearer ${PAT}`, retries once with exponential backoff on HTTP 429 using the response's `Retry-After`, and maps HTTP status to `WorkflowError.kind` per FR-051 (401 → `auth-invalid`, 403 → `auth-scope-missing`, 404 → `record-not-found`, 422 → `validation` with `attioMessage`, 429 second failure → `rate-limit`, 5xx after retry or socket failure → `unreachable`).
**And** zod schema parse failures surface as `{ kind: 'validation', attioMessage: '<zod issue>' }` (separate from Attio 422s by the absence of `httpStatus: 422`).
**And** the client respects cache: read methods consult `cache.get*` first and on miss fetch + `cache.set*`.
**And** vitest covers each method against fixtures under `test/fixtures/`, the 429 retry path with fake timers, the 401/403/404/422/5xx mappings, and the cache-hit path (no fetch).

### Story 1.8: Diagnostic snapshot keyword (`attio:diag`)

As a user filing a GitHub issue,
I want a `attio:diag` keyword that surfaces a copy-safe snapshot of my workflow state,
So that I can paste it into a public issue without leaking my token or my record IDs.

**Acceptance Criteria:**

**Given** the user has invoked the `attio:diag` keyword
**When** the script runs against either a configured or unconfigured workflow
**Then** the result list shows a fixed 7-row snapshot per EXPERIENCE.md §`attio:diag`: row 0 disclaimer, row 1 workspace, row 2 me (suppressed when `DIAG_INCLUDE_IDENTITY=false`), row 3 token presence (no bytes), row 4 cache ages, row 5 last error with `<redacted>` record IDs, row 6 workflow version.
**And** no row's title or subtitle contains the PAT value, a SHA-256 prefix or hash, a record ID, or a full endpoint URL with an ID.
**And** when no PAT is configured, rows 1, 2, 4 show "—" and row 3 shows `Token: missing`.
**And** vitest snapshot tests verify that no row contains values matching the PAT regex or any record-ID pattern.

### Story 1.9: Cache refresh keyword (`attio:refresh`)

As a user whose admin just added a new deal stage,
I want a `attio:refresh` keyword that flushes all caches and re-fetches identity + object schemas,
So that I see the new stage in my drill-down picker without waiting for the 24h TTL.

**Acceptance Criteria:**

**Given** the user has invoked `attio:refresh`
**When** the script runs against a configured workflow
**Then** all `alfredClient.cache` entries are cleared (records, lists, schemas, identity hash), all HTML files in `alfredInfo.cache()` are deleted, and `/v2/self` + `/v2/objects` + `/v2/objects/{slug}/attributes` for each known object are re-fetched.
**And** on success, a macOS notification fires with the FR-032 microcopy `Cache cleared — {N} objects, {M} attribute sets`.
**And** on failure, the FR-051 error notification fires with the matching `errors.{kind}` microcopy.
**And** the script returns no list (Alfred closes after the notification); the next keyword invocation rebuilds caches lazily.

### Story 1.10: Morning to-do keyword read-only

As a user starting my day,
I want a `todo` keyword that shows my open tasks for today (with overdue grouped) and their linked person/deal/company on a single row,
So that I see what to do without opening Attio.

**Acceptance Criteria:**

**Given** the user has configured a PAT and has tasks assigned to them in Attio
**When** the user invokes `todo`
**Then** the result list shows up to 9 task rows scoped to `is_completed=false` + `assignee=me` + (`deadline_at <= end of today` OR no deadline), with overdue tasks grouped at the top under the `OVERDUE` / `EN RETARD` heading and today's tasks following (FR-001).
**And** each row's title is the task content; the subtitle joins `{linked_person} · {linked_deal} · {linked_company}` with `·` separators, omitting missing links silently (FR-002).
**And** rows are sorted by `deadline_at` asc within each group, with `created_at` desc as tiebreaker (FR-003).
**And** ⏎ on a row constructs the URL `https://app.attio.com/{workspace_slug}/tasks?command-menu-page=task&id={task_id}` and opens it in the default browser (FR-004); on contract break (404 in browser), the user falls back to opening the tasks list view manually — the workflow does not detect.
**And** the empty state shows one row using the `todo.empty` microcopy with the workspace member name interpolated (FR-008).
**And** when the PAT is missing, the setup prompt row appears (FR-022); ⏎ opens the README PAT-setup anchor in the browser (FR-023).
**And** when offline (per NFR-007), cached tasks are shown prefixed by an `Offline — showing cached data` row.
**And** vitest covers grouping + sorting against a fixture of mixed overdue/today/undated tasks, the empty state, and the missing-PAT state.

---

## Epic 2: Find any record from anywhere

Search any record from Alfred and open it in Attio or LinkedIn/website.

### Story 2.1: `person` keyword (search + open + LinkedIn)

As a user who needs a person's email from outside Attio,
I want a `person <query>` keyword that returns matching people with their job title + company in the subtitle and lets me open the record in Attio or jump to LinkedIn,
So that I find a contact without alt-tabbing to Attio.

**Acceptance Criteria:**

**Given** a configured workflow and at least 1 person in the workspace
**When** the user types `person <q>` and hits ⏎
**Then** up to 9 rows render (FR-011), each with title = primary name and subtitle = `{job_title} · {company_name}` (FR-013), substring-match on the person name (FR-012).
**And** ⏎ on a row opens the row's `web_url` in the default browser (FR-014).
**And** ⌘⏎ opens the person's LinkedIn URL when present (FR-015); when absent, ⌘⏎ degrades to ⏎ behavior with a one-time hint shown the first time (`cmd_enter_hint_dismissed` flag in `alfredClient.config`).
**And** empty `person` query shows recently-updated people sorted by `updated_at` desc (FR-020).
**And** no results returns one row using the `search.empty.people` microcopy (FR-021).
**And** vitest covers the substring filter, the recently-updated fallback, and the `cmd_enter_hint_dismissed` toggle.

### Story 2.2: `company` keyword

As a user prospecting a target account,
I want a `company <query>` keyword that surfaces companies with domain or location in the subtitle and lets me open the website,
So that I jump to a company's site from Alfred.

**Acceptance Criteria:**

**Given** a configured workflow and at least 1 company in the workspace
**When** the user types `company <q>` and hits ⏎
**Then** up to 9 rows render with title = company name and subtitle = `{domain}` (preferred) or `{location}` (fallback) per FR-013, substring-matched.
**And** ⏎ opens the company's `web_url` in Attio; ⌘⏎ opens the company's primary website URL.
**And** empty query shows recently-updated companies.
**And** vitest covers the domain-or-location fallback and the website-mod path.

### Story 2.3: `deal` keyword

As a user tracking a deal,
I want a `deal <query>` keyword that surfaces deals with stage + value in the subtitle,
So that I jump to a deal's record card from Alfred.

**Acceptance Criteria:**

**Given** a configured workflow and at least 1 deal in the workspace
**When** the user types `deal <q>` and hits ⏎
**Then** up to 9 rows render with title = deal name and subtitle = `{stage} · {value}` per FR-013, substring-matched on the deal name.
**And** ⏎ opens the deal in Attio via `web_url`.
**And** ⌘⏎ degrades to ⏎ + a one-time hint (LinkedIn/website not applicable for deals).
**And** empty query shows open deals sorted by recency.
**And** vitest covers the stage+value subtitle and the ⌘⏎ hint path.

### Story 2.4: `task` keyword

As a user searching for a task by content,
I want a `task <query>` keyword that surfaces tasks with deadline + completion status,
So that I find a specific task without scrolling `todo`.

**Acceptance Criteria:**

**Given** a configured workflow and at least 1 task in the workspace
**When** the user types `task <q>` and hits ⏎
**Then** up to 9 rows render with title = task content and subtitle = `{deadline} · {is_completed status}` per FR-013 (note: this differs from `todo`'s mapping which shows linked records).
**And** empty query falls through to `todo` semantics per FR-020.
**And** ⏎ opens the task in Attio (constructed URL per FR-004); ⌘⏎ degrades to ⏎ + one-time hint.
**And** vitest covers the FR-002 vs FR-013 subtitle divergence between `todo` and `task <q>`.

### Story 2.5: Lifecycle attribute config in subtitle

As a user whose workspace tags people as `Lead`, `Customer`, `Churned`,
I want to configure the lifecycle attribute slug per object in the workflow preferences and see that value appended to the result subtitle,
So that I can identify a person's status without opening their record.

**Acceptance Criteria:**

**Given** `info.plist` has been extended with `LIFECYCLE_ATTRIBUTE_PERSON`, `LIFECYCLE_ATTRIBUTE_COMPANY`, `LIFECYCLE_ATTRIBUTE_DEAL` textfields (FR-033)
**When** the user sets `LIFECYCLE_ATTRIBUTE_PERSON=lifecycle_stage` and runs `person florian`
**Then** the matching row's subtitle reads `{job_title} · {company_name} · {lifecycle_value}` with `·` separator.
**And** when the configured slug is empty, the row's subtitle reads exactly the FR-013 default with no trailing segment.
**And** when the configured slug doesn't exist in the workspace schema, the row's subtitle still uses the FR-013 default (silent skip) and `attio:diag` row 4 surfaces "lifecycle slug not found in schema" the next time it's invoked.
**And** the same behavior applies to `company` and `deal` (with `task` intentionally excluded per FR-033).
**And** vitest covers the present-slug, empty-slug, and missing-slug paths.

---

## Epic 3: Preview records with Quick Look

Glance at a record's details without ever opening Attio.

### Story 3.1: Tagged-template HTML helper and CSS token rendering

As an AI agent implementing fiches,
I want a `html\`\``tagged template that XSS-escapes interpolated values, a`getStyles(mode)`function that emits inline CSS from DESIGN.md tokens, and an`@font-face` block referencing the bundled WOFF2 files,
So that every per-object fiche shares the same rendering primitives.

**Acceptance Criteria:**

**Given** `src/common/quicklook.ts`
**When** I call `html\`<h1>${userInput}</h1>\``with`userInput = '<script>alert(1)</script>'`**Then** the output string contains the escaped`&lt;script&gt;`sequence; no`<script>`tag is parseable as HTML in the result.
**And**`getStyles('auto')`returns a`<style>`block with both light tokens (top-level CSS variables) and a`@media (prefers-color-scheme: dark)`block overriding to dark tokens;`getStyles('light')`and`getStyles('dark')`emit single-mode styles.
**And**`@font-face`rules reference`file://`paths to`alfredInfo.bundleDir() + '/fonts/Inter.woff2'`, `Inter-Display.woff2`, `JetBrainsMono.woff2`; the rendered HTML does not embed base64 font data.
**And** vitest covers XSS escape (5+ payloads), the dark-mode CSS branching, and the bundled-font path resolution.

### Story 3.2: Person fiche

As a user previewing a person record,
I want a Quick Look fiche showing the person's primary name (display heading), job title, primary email, primary phone, linked company, LinkedIn URL, and last-updated date,
So that I see the person's profile without opening Attio.

**Acceptance Criteria:**

**Given** a cached person record and a person row in the result list
**When** the user presses ⇧ on the row
**Then** the row's `quicklookurl` points at an HTML file under `alfredInfo.cache()/quicklook/person-{id}.html` containing the person fiche per addendum §E.
**And** the fiche header uses the `display` typography token for the name and a small uppercase `PERSON` label above it.
**And** field rows are label + value pairs with the label in uppercase `label` typography (`ink-tertiary`) and the value in `body` (`ink-primary`).
**And** missing fields are silently omitted per FR-036 (no `—`, no `null`).
**And** the fiche is semantic HTML (`<section>`, `<dl>`, `<dt>`, `<dd>`) and renders identically in light and dark modes via `prefers-color-scheme`.
**And** the fiche never contains the PAT or any token-derived value.
**And** vitest covers a person fixture with all fields present, a person with missing email/phone, and snapshot diff of the rendered HTML.

### Story 3.3: Company fiche

As a user previewing a company record,
I want a Quick Look fiche showing name, domain, industry, location, linked-people count, and last-updated date,
So that I see the company profile from Alfred.

**Acceptance Criteria:**

**Given** a cached company record
**When** the user presses ⇧
**Then** the company fiche renders per addendum §E with the same component contract as Story 3.2 (`display` heading, `label` rows, semantic HTML, light+dark).
**And** the linked-people count is rendered as a single field row, not a list.
**And** missing fields silently omit per FR-036.
**And** vitest covers a company with full fields and a company with only name + domain.

### Story 3.4: Deal fiche

As a user previewing a deal,
I want a Quick Look fiche showing name, stage (in a status pill), value, linked company, primary linked person, close date, and last-updated date,
So that I see the deal state from Alfred.

**Acceptance Criteria:**

**Given** a cached deal record
**When** the user presses ⇧
**Then** the deal fiche renders per addendum §E.
**And** the stage is rendered as a status pill component (outlined, no fill, `surface-raised` background, `outline` border, `body-sm` text) using the workspace's actual option label verbatim per FR-039.
**And** missing fields silently omit.
**And** vitest covers the status pill rendering against several stage labels (including ones with non-Latin characters).

### Story 3.5: Task fiche + wire ⇧ in `todo`

As a user previewing a task from my morning to-do list,
I want a Quick Look fiche showing the task content, deadline, assignee, and linked person/deal/company,
So that I can decide whether to act on it without opening Attio.

**Acceptance Criteria:**

**Given** a cached task record and the user is viewing the `todo` result list
**When** the user presses ⇧ on a task row
**Then** the task fiche renders per addendum §E with deadline + assignee + linked-records as labeled field rows; the task content is rendered as the `display` heading.
**And** task content is **not** shown with an edit affordance (read-only, per FR-040 task narrower writable surface).
**And** the same fiche rendering wires into the search `task` keyword row's ⇧ as well.
**And** vitest covers an overdue task, an undated task, and a task with no linked records.

---

## Epic 4: Act on records from the bar (notes + mark complete)

Log notes and mark tasks complete from Alfred.

### Story 4.1: Mark task complete (⌘⏎ on task row)

As a user closing out a task during my morning to-do review,
I want ⌘⏎ on a task row to mark it complete via the Attio API and remove it from my list,
So that I update CRM hygiene without opening Attio.

**Acceptance Criteria:**

**Given** a `todo` or `task <q>` result list with at least one incomplete task
**When** the user presses ⌘⏎ on a task row
**Then** the workflow fires `PATCH /v2/tasks/{id}` with `{ "is_completed": true }`, awaits the success response, invalidates the task cache entry via `cache.invalidateRecord('tasks', id)` and the task list pages that contained it per FR-047, and re-fetches the list.
**And** a macOS notification fires with the `success.task-completed` microcopy interpolating the truncated task content.
**And** on failure (any FR-051 error kind), a macOS notification fires with the matching `errors.{kind}` microcopy; the list does not refresh and the task remains visible.
**And** when offline (NFR-007), ⌘⏎ does not fire the API call; instead a notification fires with the `offline.preflight-block` microcopy.
**And** the `cmd_enter_hint_dismissed` flag is not consulted on task rows (the hint applies only to deal/task `cmd-enter open` variant per FR-015 — distinct from this mark-complete path).
**And** vitest covers the success path, the 401 / 403 / 5xx error paths, the offline-block path, and the cache invalidation correctness (a subsequent `todo` call does not re-show the completed task even before the 60s TTL expires).

### Story 4.2: Single-line note creation (⌥⏎)

As a user logging a quick note,
I want ⌥⏎ on any record row to take the current Alfred query as the note body and create an Attio Note linked to that record,
So that I log activity without opening the record in Attio.

**Acceptance Criteria:**

**Given** any result list row (person, company, deal, task)
**When** the user types `person florian` and the row is selected, then types additional text and presses ⌥⏎
**Then** the workflow constructs a `POST /v2/notes` call with `parent_object`, `parent_record_id`, `content = <Alfred query text after the keyword>`, `format = "plaintext"`, and `title = content.slice(0, 80)` per FR-016 + addendum §A.
**And** newlines embedded in the content are stripped to a space; trailing whitespace is trimmed; control characters (NUL, ESC) are stripped.
**And** on success, the macOS notification fires `success.note-added` with the record name interpolated.
**And** on failure (FR-051), the FR-051 error notification fires; the keyword does not re-render the result list.
**And** when offline, the pre-flight block notification fires per NFR-007.
**And** the cache for the parent record is invalidated per FR-047 so that the next Quick Look reflects the new note count.
**And** vitest covers the title truncation at 80 chars, the newline stripping in single-line mode, and the FR-051 error mapping.

### Story 4.3: Multi-line note creation (⇧⌥⏎)

As a user writing a longer note,
I want ⇧⌥⏎ on any record row to open a macOS NSAlert text input for multi-line content and submit it as a note,
So that I can log meaningful detail without opening Attio's note editor.

**Acceptance Criteria:**

**Given** any result list row
**When** the user presses ⇧⌥⏎
**Then** the workflow spawns an `osascript` command that displays an `NSAlert` with a multi-line text input, a title naming the record, and OK / Cancel buttons (the prompt copy is sourced from `strings.t('notes.multiline-prompt', { record_name })`).
**And** on OK with non-empty content, the workflow calls `POST /v2/notes` with `content = <full input>`, `format = "plaintext"`, and `title = first non-empty line of content, truncated to 80 chars` per FR-017.
**And** newlines are preserved in multi-line content; control characters are stripped.
**And** on Cancel or empty content, no API call is made.
**And** the rest of the contract matches Story 4.2 (cache invalidation, success / error notification, offline pre-flight).
**And** vitest covers the title-from-first-line behavior with several content shapes (single line, leading blank lines, no newlines) and the cancel path (mocked osascript exit code).

---

## Epic 5: Edit scalar fields with drill-down

Update any scalar field on any record without leaving Alfred.

### Story 5.1: Drill-down dispatcher and read-only navigation

As an AI agent implementing the drill-down surface,
I want `drilldown.ts` to dispatch by `(object, record_id)` query argument, render the record's drill-down list per addendum §E, and wire backspace to return to the parent,
So that every keyword's → drill-down lands in a single shared script.

**Acceptance Criteria:**

**Given** `src/main/drilldown.ts`
**When** the user presses → on a result row (any object)
**Then** Alfred invokes `drilldown.ts` with the argument `{object}:{record_id}` and the script reads the cached record + cached attribute defs, then emits one row per item from addendum §E (linked records first, then quick-action rows).
**And** linked-record rows have title = the linked record's primary name, subtitle = the linked object label, ⏎ opens the linked record in Attio (per the FR-019 single-level constraint — no nested drill-down).
**And** quick-action rows (`Write note…`) emit a re-invocation arg that takes the user to the note creation flow from Epic 4.
**And** when the cached attribute defs are absent for the object (FR-049), only navigate-and-read rows render; no edit affordances appear; one row at top shows the FR-049 microcopy `errors.schema-unavailable`.
**And** vitest covers a person drill-down with linked company + linked notes, a deal drill-down with linked records, a task drill-down with linked records, and the schema-unavailable degradation.

### Story 5.2: Text / number / email / phone / URL encoders + edit input

As a user editing a person's primary email,
I want the drill-down to show an edit affordance on the email field, accept a new value via an inline Alfred text input, and PATCH the change to Attio,
So that I update contact details without opening the record.

**Acceptance Criteria:**

**Given** a person drill-down with the primary email field exposed
**When** the user presses ⏎ on the email row
**Then** the drill-down re-invokes with an `edit_field=primary_email_address` argument; the script renders an inline Alfred text input prefilled with the current email.
**And** on ⏎ with a parseable value, `client.patchRecord('people', id, { primary_email_address: encodeForPatch('email', value, attrDef) })` is called.
**And** on a parse failure (e.g., obviously malformed email), the row shows the FR-042 `parse-error.email` microcopy and ⏎ re-opens the input without firing PATCH.
**And** the same pattern applies for text (single + multi-line via macOS NSAlert from Epic 4), number (NaN check), URL (scheme check), and phone (free-text input with the workspace's default country code applied).
**And** encoders live one per file under `src/common/attio/encoders/`; each exports `encode(value, attrDef): unknown` and has a vitest covering the documented `addendum §H` shape + the divergence shapes flagged in §H (single-select, single record-reference, text).

### Story 5.3: Date / datetime encoder with system-TZ conversion

As a user updating a deal's close date from CEST,
I want the date input to be interpreted in my macOS system timezone and stored in UTC, with display converted back to system TZ,
So that I don't silently push a deadline two hours off.

**Acceptance Criteria:**

**Given** a deal drill-down with `close_date` (date) and a datetime field (e.g. `last_contacted_at`)
**When** the user types `2026-07-15` for date or `2026-07-15T14:30` for datetime in CEST
**Then** for date: the value `2026-07-15` is sent verbatim to Attio (no TZ for date type).
**And** for datetime: `parseLocalToUtcIso('2026-07-15T14:30')` in `src/common/tz.ts` returns `2026-07-15T12:30:00Z` (CEST = UTC+2), and that ISO string is sent to Attio.
**And** when the same record is later rendered in drill-down or Quick Look, `formatUtcToLocal('2026-07-15T12:30:00Z')` displays `2026-07-15 14:30` (back to CEST).
**And** invalid input (e.g. `2026-13-99` or `not a date`) shows the FR-042 `parse-error.date` / `parse-error.datetime` microcopy without firing PATCH.
**And** vitest covers the CEST → UTC → CEST round-trip, an EST round-trip, and the invalid input case using fake system locales.

### Story 5.4: Single-select picker + option list cache

As a user changing a deal's stage from Discovery to Negotiation,
I want ⏎ on the stage row to open a sub-script-filter listing the workspace's deal-stage options with the current option marked, then PATCH on selection,
So that I update the stage with two keystrokes total.

**Acceptance Criteria:**

**Given** a deal drill-down with `stage` (single-select)
**When** the user presses ⏎ on the stage row
**Then** the drill-down re-invokes with `edit_field=stage&picker=true`; the script renders one row per option from the cached attribute defs (`/v2/objects/deals/attributes` → `options`); the current option's row carries a `success` icon.
**And** typing inside the picker filters options by substring (case-insensitive) on the option title.
**And** ⏎ on an option fires `client.patchRecord('deals', id, { stage: encodeForPatch('select', { id: optionId }, attrDef) })` using the encoder from Story 5.2.
**And** on success, the drill-down re-renders with the new stage visible per FR-043; macOS notification `success.field-updated` with `{ field: 'Stage', value: '<option label>' }` interpolated.
**And** the same pattern works for `status`, `lifecycle`, and other single-selects across all objects.
**And** vitest covers picker filtering, the current-option marker, the encoder dispatch, and the FR-043 success notification.

### Story 5.5: Single record-reference picker (sub-search overlay)

As a user changing a deal's linked company,
I want ⏎ on the linked-company row to open a sub-search reusing the `company` keyword semantics, then PATCH the new company on selection,
So that I re-link records without opening Attio.

**Acceptance Criteria:**

**Given** a deal drill-down with a linked-company record-reference attribute
**When** the user presses ⏎ on the linked-company row
**Then** the drill-down re-invokes with `edit_field=linked_company&picker=true`; the script renders a sub-script-filter that takes a free-text query and runs `client.queryRecords('companies', { filter: substring match on name })`, returning up to 9 results.
**And** ⏎ on a result fires `client.patchRecord('deals', id, { linked_company: encodeForPatch('record-ref', { target_object: 'companies', target_record_id: targetId }, attrDef) })`.
**And** empty results show one row using the `search.empty.companies` microcopy; ⏎ on the empty row is a no-op.
**And** if the record-reference attribute's `target_object` is not in `{people, companies, deals, tasks}` (FR-048), the original drill-down row is rendered read-only with the FR-044 `→ edit in Attio` suffix; ⏎ opens the parent record in Attio's web UI rather than firing a sub-search.
**And** vitest covers the happy-path PATCH, the empty-results path, and the off-target FR-048 fallback.

### Story 5.6: PATCH-in-flight spinner + status file convention

As a user submitting an edit,
I want the affected row to show a spinner while the PATCH is in flight, then re-render with the new value once the server confirms,
So that I have feedback without an optimistic UI lie.

**Acceptance Criteria:**

**Given** an in-flight PATCH from any Epic 5 edit story
**When** the script writes a status file under `alfredInfo.cache()/_status/{requestId}.json` with shape `{ requestId, status: "pending", startedAt, fieldSlug }` and emits a drill-down with `rerun: 0.3` and `pending=<field_slug>` on the affected row
**Then** Alfred polls the script every 300ms; each invocation reads the status file; while `status === "pending"`, the row continues to show the `sync` icon spinner and the script re-emits with `rerun: 0.3`.
**And** when the worker writes `{ status: "done", result }`, the next poll reads `done`, the script invalidates the cache per FR-047, re-fetches the record, and emits the drill-down without the spinner and without `rerun`.
**And** when the worker writes `{ status: "error", error: WorkflowError }`, the script reads the error, fires the FR-051 error notification, and re-emits the drill-down without the spinner.
**And** status files are scrubbed by `attio:refresh` (Story 1.9).
**And** the `src/common/status.ts` module owns the JSON shape, the requestId generation (`crypto.randomUUID`), and the file lifecycle; vitest covers the pending → done transition, the pending → error transition, and the cleanup on success.

### Story 5.7: 403 read-only marker + non-editable type fallbacks + build-time shape verification

As a user whose PAT lacks write scope on a specific attribute,
I want the affected field to show as read-only with an explanation hint, and other non-editable types to render as `→ edit in Attio`,
So that I don't repeatedly retry an edit that will never succeed.

**Acceptance Criteria:**

**Given** a session where a PATCH on a specific attribute returned 403
**When** the user navigates back to the same record's drill-down within the same Alfred session
**Then** the affected row renders with title = `<field>: <current value>` and subtitle = the FR-050 `errors.read-only-scope` microcopy; ⏎ does not re-open the edit input; the in-memory `Set<string>` of read-only field keys is scoped to the script process lifetime (a fresh Alfred invocation re-tries).
**And** attributes whose type is not in FR-040 (multi-select, structured name, structured location) render with the FR-044 `→ edit in Attio` suffix.
**And** record-reference attributes whose target object is not in `{people, companies, deals, tasks}` render with the same FR-048 suffix.
**And** archived attributes (per the attribute definition) are hidden entirely from drill-down per FR-045.
**And** `scripts/verify-attio-shapes.mjs` exists, accepts a fixture-workspace PAT via env var, curl-probes each encoder type's PATCH shape against the live API, compares against the expected shapes in `encoders/*.ts`, and exits non-zero on a divergence; CI runs this script as part of the release pre-check.

---

## Epic 6: French localization and public OSS shipping

French users get a native workflow; new users find and install reliably from GitHub Releases.

### Story 6.1: French microcopy catalog (FR parity)

As a French user,
I want every workflow-rendered string in French,
So that the workflow feels native, not a translated afterthought.

**Acceptance Criteria:**

**Given** `src/strings/fr.json` is empty at Epic 5 close
**When** I author the FR catalog
**Then** every key present in `en.json` has a French equivalent in `fr.json` (verified by a vitest that diff'es the key sets).
**And** the FR microcopy mirrors the EXPERIENCE.md §Voice and Tone catalog for the 30+ entries documented there (setup, success, errors, hints, parse errors, lifecycle, etc.) with French typography (NBSP before `:`, `?`, `!`; `«` `»` for quotes).
**And** `LANGUAGE_OVERRIDE=fr` forces FR even on an EN macOS; setting it to `en` forces EN even on an FR macOS; unset falls back to `Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr')` per FR-038.
**And** vitest covers `fr.json` ↔ `en.json` key parity, the `LANGUAGE_OVERRIDE` priority, and one rendering of every microcopy key in both languages to catch placeholder mismatches.

### Story 6.2: README rewrite + license + non-affiliation

As a new user landing on the GitHub repo,
I want a README that explains what the workflow does, how to install + configure + use it, and the project's license + non-affiliation stance,
So that I can decide to install and complete setup successfully.

**Acceptance Criteria:**

**Given** the existing `README.md` is a `TODO` placeholder
**When** the rewrite is shipped
**Then** the README contains, in order: a one-paragraph product summary, a non-affiliation disclaimer ("Unofficial workflow for Attio — not affiliated with Attio Inc."), installation instructions (macOS 13+, Alfred 5+, download from Releases, double-click), PAT generation walkthrough with screenshots of Attio Settings → Developer → API tokens + the required scopes (read on records/tasks, write on tasks/notes, write on record attributes for F-G), Alfred preferences config walkthrough (Workflows → Attio → Configure → paste), the keyword reference for all 7 user-facing keywords + 2 maintenance keywords, a Known Limitations section enumerating the 8 items from EXPERIENCE.md §Known Limitations, a troubleshooting section keyed to FR-051 error notifications, and a License section declaring MIT.
**And** the README is reviewable in both light and dark GitHub modes (no fixed-color inline styles).
**And** a top-level `LICENSE` file declares MIT with the maintainer's name + year.
**And** the `info.plist` workflow description is rewritten to a one-paragraph user-facing summary in EN (Alfred Gallery's display language) per NFR-015.

### Story 6.3: GitHub Issue Templates + PR template + labels

As a maintainer triaging community support,
I want issue templates that channel users into the right labels for NFR-016 friction tracking,
So that quarterly triage produces the M-3 / M-4 / M-5 / M-6 signals from the PRD.

**Acceptance Criteria:**

**Given** `.github/ISSUE_TEMPLATE/` does not exist
**When** the templates are authored
**Then** four templates exist: `bug.md`, `feature.md`, `setup-failure.md`, `api-change.md`, each with the matching label declared in YAML frontmatter (matching NFR-016).
**And** a `PULL_REQUEST_TEMPLATE.md` exists requiring a description, FR/UX-DR/NFR linkage, and a checklist (lint passes, tests pass, build produces artifact).
**And** the labels themselves are created in the GitHub repo with the colors used by the templates.

### Story 6.4: Performance baseline script and pre-release CI integration

As a maintainer asserting NFR-001/002 without telemetry,
I want a `npm run perf` script that times N keyword invocations against a fixture workspace and outputs a summary,
So that performance regressions are caught pre-release.

**Acceptance Criteria:**

**Given** `scripts/perf.mjs` is authored
**When** I run `npm run perf` with a fixture PAT in env
**Then** the script invokes `todo`, `person <q>`, `company <q>`, `deal <q>`, `task <q>` N times each (configurable, default 20), measures wall-clock duration from spawn to JSON output, and prints `<keyword> warm: median <ms> p95 <ms>` and `<keyword> cold: median <ms> p95 <ms>`.
**And** "cold" invocations clear the cache directory between each call; "warm" invocations share the cache.
**And** the script writes the output to `perf-results.md` in the repo root and is invoked by the `release.yml` GitHub Action; the release notes include the perf table for the version.
**And** the CI job is non-blocking (perf regression is informational, not a release gate in V1).

### Story 6.5: Semantic-release artifact verification and Alfred Gallery submission readiness

As a maintainer shipping a release,
I want CI to verify the `.alfredworkflow` artifact is correctly attached to each GitHub Release and that the `fast-alfred pack` output is reproducible,
So that users can download a known-good artifact without manual checks.

**Acceptance Criteria:**

**Given** the existing `semantic-release` config invokes `fast-alfred pack` via `@semantic-release/exec`
**When** a release tag lands on `main`
**Then** the GitHub Release for that tag carries exactly one `.alfredworkflow` asset with filename `alfred-attio-workflow-<version>.alfredworkflow`, unzippable, containing the bundled JS, `info.plist`, `assets/fonts/`, `assets/icons/`, and the version field in `info.plist` matches the release tag.
**And** the `bundle-check` CI job verifies the artifact bundle size has not regressed by more than 50% from the previous release (block) and warns at 20%.
**And** an `Alfred Gallery readiness` checklist is added to `CONTRIBUTING.md` or `docs/release-checklist.md`: README screenshots, demo GIF, info.plist description, semver-tagged release, license, non-affiliation statement, perf table.
**And** the first V1.0.0 release closes this checklist; submission to Alfred Gallery is the post-release action (manual).
