# Input reconciliation: existing repo code

Scope of inputs reconciled:

- `src/main/people.ts` — sole keyword script entry
- `src/common/attio/client.ts` — Attio API client
- `src/common/variables.enum.ts` — env var keys
- `info.plist` — Alfred workflow manifest
- `.fast-alfred.config.cjs` — bundler config
- `src/assets/icons/{logo.svg,people.svg}` — workflow icons

## Currently shipped (per people.ts and info.plist)

- A single Alfred ScriptFilter keyword `people` (info.plist L64), bundled from `esbuild/people.js` (L76), wired through one OpenURL action (UID `7E1A9B0C-…`).
- A dormant hotkey trigger object (UID `028ACD78-…`) that fans out into the `people` ScriptFilter — `hotkey=0`, `hotmod=0`, so no actual key is bound (L108–L111).
- One secure user-config textfield: `API_KEY` (info.plist L177–L200), required, no placeholder/description filled.
- People search via `POST /v2/objects/people/records/query` with `$or` over `name.full_name | first_name | last_name`, sort by `last_setting_action_at desc`, `limit: 9`.
- Empty-query falls through to "most recently updated" via the same sort (no filter), consistent with FR-020 person semantics.
- Each result renders `title = full_name`, `subtitle = "{job_title} | {company_name}"`, both with `'(no …)'` fallbacks.
- Company name resolution: per-result `target_record_id` → `GET /v2/objects/companies/records/{id}`, run in parallel via `Promise.all` over a deduped `Set`.
- `⏎` action: `arg = person.web_url` → OpenURL (FR-014 satisfied).
- `⌘⏎` mod: opens `linkedin` attribute URL when present, otherwise disabled with subtitle "No LinkedIn profile" (partial FR-015 — person branch only).
- Quick Look: `quicklookurl = person.web_url` (Attio page itself), not a workflow-generated HTML fiche.
- `text.copy = web_url`, `text.largetype = "{title}\n{subtitle}\n{web_url}"`.
- Empty-results state: single `valid:false` item titled "No people found" with the `info` icon.
- Two **local consts** for TTLs declared but **never used**: `COMPANY_TTL = 24h`, `PEOPLE_TTL = 10min` (people.ts L26–L27). No caching is actually performed — every invocation hits the API for people and N companies.
- Error surface: `alfredClient.error(error)` raw-passes Attio errors (no copy mapping).
- `AttioClient` only exposes `queryPeople`, `getCompany`, `queryAllPeople` (offset paginator unused by people.ts). No tasks, notes, schema, PATCH, or identity methods.
- Two icons present in `src/assets/icons/`: `logo.svg`, `people.svg`. The script icon path is `./esbuild/assets/people.svg` (build-time copied).
- `.fast-alfred.config.cjs` has empty `bundlerOptions: {}` — relies on fast-alfred's default convention of one entry per `src/main/*.ts`.

## PRD requirements that match current code

- **FR-011** "up to 9 results" — `limit: 9` exact match.
- **FR-012** substring, case-insensitive on primary name attribute — implemented with `$contains` on `full_name | first_name | last_name`.
- **FR-013 person context line** ("job title + company name") — exact subtitle shape, with fallbacks.
- **FR-014** `⏎` opens via `web_url` — exact match.
- **FR-015 person branch** of `⌘⏎` (open LinkedIn) — implemented and gated on attribute presence.
- **FR-020 person empty-query semantics** ("most recently updated") — implemented via no-filter + `last_setting_action_at desc`.
- **FR-021 empty results state** — implemented (renders a single named item).
- **NFR-004 cache TTL targets** for people (10min) and companies (24h) — numerically present as constants (`PEOPLE_TTL`, `COMPANY_TTL`), but only as declarations; see conflicts.
- Onboarding affordance partially exists: `API_KEY` is declared as a secure textfield in `userconfigurationconfig` (supports FR-024).

## PRD requirements that conflict with or extend current code

- **FR-010 keyword name** — info.plist declares `people`; PRD mandates `person` (singular, consistent across F-B). Migration step §F.1 calls this rename out. **Build work: rename keyword + likely rename `src/main/people.ts` → `src/main/person.ts`.**
- **FR-015 cross-object branch** — `⌘⏎` is only wired for person/LinkedIn. The deal/task degrade behavior with a one-time hint, and the `cmd_enter_hint_dismissed` flag persisted in `alfredClient.config`, are entirely absent. **Build work.**
- **FR-016 `⌥⏎` single-line note** — not implemented. No `mods.alt`. No `POST /v2/notes` call site.
- **FR-017 `⇧⌥⏎` multi-line note** — not implemented. No native input-window invocation; no whitespace/control-char scrubbing helper.
- **FR-018 `⇧` Quick Look as workflow-generated HTML fiche** — current code points `quicklookurl` at Attio's `web_url`. Per FR-034 this must become an HTML file written to the workflow cache dir with inline CSS. **Conflict** — current behavior masquerades as Quick Look but is not a readonly fiche; migration step §F.3 covers this.
- **FR-019 `→` drill-down sub-script-filter** — not implemented. No drill-down entry script, no Alfred connection from a drill-down trigger. **Build work.**
- **FR-031 24h schema cache** — `COMPANY_TTL = 24h` exists but is a record-level constant, not the attribute-schema TTL FR-031 mandates. The schema discovery layer (`GET /v2/objects`, `GET /v2/objects/{slug}/attributes`) is missing entirely. The 24h number matches FR-031's TTL by coincidence but applies to the wrong cache. **Conflict — needs migration to `alfredClient.cache` with explicit cache keys per `(workspace_id, object_slug)`.**
- **NFR-004 `alfredClient.cache.setWithTTL` migration** — constants exist but no cache layer is wired. Addendum §F.5 covers this. Currently, every invocation re-fetches people + every linked company.
- **FR-005 / FR-016 / FR-017 / FR-043 cache invalidation (FR-047)** — no `invalidateRecord` / `invalidateListsContaining` helpers exist (addendum §F.9 build work).
- **FR-022 / FR-025 onboarding flow** — token presence is checked (throws "Attio API Key is required"), but there's no info-result with "⏎ for setup instructions", no identity probe to `GET /v2/self` (or equivalent), no `Connected to <workspace name>` toast, no PAT-hash change detection for FR-026, no workspace ID/slug/member ID persistence via `alfredClient.config`.
- **FR-028 `attio:diag` keyword** — not present.
- **FR-030 / FR-031 schema discovery & adaptation** — not implemented.
- **FR-032 `attio:refresh` keyword** — not present.
- **FR-033 lifecycle-attribute config textfields** — `info.plist` `userconfigurationconfig` only has `API_KEY`. The three optional fields `LIFECYCLE_ATTRIBUTE_PERSON|COMPANY|DEAL` from addendum §F.10 are not declared. `Variables` enum only has `API_KEY`. **Build work — manifest + enum extension.**
- **FR-037–FR-039 localization** — all strings in people.ts are inline English: `'(no company)'`, `'(no position)'`, `'(no name)'`, `'No people found'`, `'Type a name to search'`, `'Open LinkedIn profile'`, `'No LinkedIn profile'`, `'(company fetch error)'`. No `src/strings/{en,fr}.json`, no `strings.ts` helper, no locale detection. **Conflict — every existing visible string must move out of the script.**
- **FR-040–FR-046 (F-G) field editing** — entirely absent. No drill-down, no edit affordances, no type-specific input UX, no `PATCH /v2/objects/{slug}/records/{id}`, no `src/common/tz.ts` for date/datetime conversion (addendum §F.8).
- **FR-049 / FR-050** — schema-failure gating and 403-write hint require schema cache + per-attribute state that don't exist yet.
- **FR-051 error copy policy** — current code uses `alfredClient.error(error)` raw. No mapping table from HTTP status to workflow-owned strings, no 422 verbatim passthrough.
- **NFR-005 backoff on 429** — no retry logic in `AttioClient.queryPeople` / `getCompany`. A single 429 propagates as a generic error.
- **NFR-007 offline detection** — no socket-level error classification, no "Offline — showing cached data" prefix.
- **NFR-014 / NFR-015 README & info.plist description** — both still say `TODO` (info.plist L41 description, L149 readme; `.fast-alfred.config.cjs` README is also a `TODO` template).
- **`AttioClient` surface gaps** — needs: `searchCompanies`, `searchDeals` (with slug parameter discovered from schema), `searchTasks` (`GET /v2/tasks` shape), `getRecord(slug, id)`, `patchRecord(slug, id, body)`, `patchTask(id, body)`, `createNote(parent_object, parent_record_id, content)`, `getObjects()`, `getObjectAttributes(slug)`, `getSelf()`, `getWorkspaceMembers()`. The current `queryAllPeople` paginator is unused and can stay or be generalized.

## Gaps in addendum §F migration list (missing items or imprecise steps)

- §F.1 says "rename keyword `people` → `person` in `info.plist`" but does not mention the **file rename** (`src/main/people.ts` → `src/main/person.ts`) that fast-alfred's by-convention bundler will care about, nor the bundle output rename (`esbuild/people.js` → `esbuild/person.js`) inside `info.plist`'s `script` value (L76). §B parenthetically acknowledges "renamed or stays as `people.ts`" but punts the decision — should be made explicit before code work.
- §F.1 does not call out updating the icon filename path `./esbuild/assets/people.svg` (people.ts L85) to match the renamed object — or, if kept as a per-object asset name, the broader convention (one icon per object: `person.svg`, `company.svg`, `deal.svg`, `task.svg`). The repo only ships `logo.svg` + `people.svg` today.
- §F does not mention extending the `Variables` enum (`src/common/variables.enum.ts`) for the three new lifecycle-config keys (FR-033) — currently only `API_KEY` is defined. Sensible to keep all env var keys typed.
- §F.6 lists new scripts but does not call out a **drill-down entry script** distinct from the primary-object scripts. FR-019 + addendum §B's "one TypeScript entry per Alfred keyword" model implies separate entries (e.g. `src/main/person-drilldown.ts`) wired into a child ScriptFilter object in `info.plist`. The connection-graph implications (one drill-down object per primary keyword, or one shared parameterized drill-down) aren't articulated.
- §F.6 omits a **setup-prompt entry** for FR-022's "Attio API token not configured" info result. Each keyword script needs to check token presence early and render the setup item; either a shared utility in `src/common/` or a documented contract. Worth surfacing.
- §F.10 names the three lifecycle textfields but doesn't specify whether they're per-object `placeholder` strings (e.g. "e.g. `lifecycle_stage`") or whether the config field's `description` should mention the slug discovery flow (FR-030 / FR-031). Likely UX-spec work, but flagging here so it isn't lost.
- §F.7 says centralize strings into `src/strings/{en,fr}.json` but doesn't mention migrating the eight existing inline strings in `people.ts` listed above. Trivial but worth itemizing in the migration checklist so they aren't left behind during the rename.
- §F doesn't mention the **dormant hotkey trigger** (`028ACD78-…`) in `info.plist`. It's currently wired to fan into the `people` ScriptFilter with `hotkey=0` (unbound). Either retire it, leave it as a placeholder for V2, or document its intended role. Adversarial review flagged this in §validation; addendum should make an explicit call.
- §F doesn't enumerate the `info.plist` connection-graph changes (new ScriptFilter objects for `todo`, `company`, `deal`, `task`, `diag`, `refresh`, plus their OpenURL / drill-down children). This is downstream architecture work but listing the new UIDs/objects in addendum would help the build phase.
- The 24h FR-031 / `COMPANY_TTL` overlap could be confusing: §F.5 says "replace the hardcoded 10-min people / 24-h company TTLs with `alfredClient.cache`" — but FR-031's 24h is for attribute schemas, not company records; NFR-004's company TTL (24h) is for company records. Both happen to be 24h but are different caches with different invalidation rules. Worth a one-line clarification.

## Gaps worth surfacing

- **Token presence handling is inconsistent with FR-022.** people.ts throws ("Attio API Key is required") on missing token, which surfaces via `alfredClient.error` — not the friendly "⏎ for setup instructions" info result FR-022 mandates. This is the most user-visible single regression risk during migration: it changes the first-run experience for every existing user. **Severity: medium.**
- **All cache reads/writes are no-ops today.** The `COMPANY_TTL` / `PEOPLE_TTL` constants are declared but `alfredClient.cache` is never invoked — every keystroke triggers a query + N company fetches. NFR-001's "results appear in a single render frame" claim is currently false for any non-trivial workspace. Migration to `alfredClient.cache` is the highest-leverage NFR fix. **Severity: high.**
- **Quick Look points at `web_url`, not a generated HTML fiche.** FR-018 + FR-034 require an inline-CSS HTML file written to the cache dir. The current implementation is misleading: it looks like Quick Look works (Alfred preview pane opens), but it's actually opening the Attio webapp in the preview pane — which both defeats the "stay in Alfred" thesis and won't render correctly without auth. **Severity: medium-high.**
- **`AttioClient` is missing every write-path method.** Marking task complete (FR-005), creating notes (FR-016/FR-017), and PATCHing records (FR-043) are all unscaffolded. F-G alone implies ~5 new client methods plus the per-type body-shape table from addendum §H. **Severity: high (largest single block of build work).**
- **`info.plist` is far from the V1 surface.** Today: 1 keyword, 1 OpenURL action, 1 dormant hotkey. V1 needs 7 keywords (`person`, `company`, `deal`, `task`, `todo`, `attio:diag`, `attio:refresh`), per-keyword drill-down children, multi-line note input objects, notification objects for write-confirm receipts, and 3 new optional userconfig textfields. The manifest grows substantially and the connection graph will need a deliberate naming scheme to stay maintainable. **Severity: medium — pure build work, but the surface area is the largest in the PRD.**
- **The unbound hotkey trigger lacks a documented purpose.** It pre-wires `⌥space → hotkey → people` but `hotkey=0`. Either it's intended for a future "open person search" global shortcut (in which case it deserves a comment / PRD note) or it's leftover scaffolding. PRD §F should make an explicit keep-or-retire call so the build phase doesn't reverse-engineer the intent. **Severity: low.**
