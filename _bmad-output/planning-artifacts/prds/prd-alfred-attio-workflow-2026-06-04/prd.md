---
title: Alfred Workflow for Attio CRM
status: final
created: 2026-06-04
updated: 2026-06-05
---

# Alfred Workflow for Attio CRM — PRD

## 1. Context & problem

Attio is a modern CRM whose users — sales reps, customer success reps, founders, recruiters — spend most of their day outside the CRM, in inboxes, calendars, chat apps, prospect websites, doc tools. Even when the CRM is the system of record, switching to it costs a context flip: tab-find, app-launch, page-load, search, click. Repeated dozens of times a day, this friction degrades productivity and CRM hygiene — users skip logging when the cost is too high.

Alfred is the macOS productivity launcher that already mediates app-switching, file search, and ad-hoc actions for power users. An Alfred workflow collapses the "switch to Attio to do one small thing" pattern into 1–3 keystrokes, while keeping the full Attio app for deep work.

This PRD scopes V1 of an open-source Alfred workflow that exposes Attio from the Alfred omnibar. V1 has two co-headline surfaces: a **read-first** surface (list / search / preview, anchored in UJ-1 and UJ-2 and detailed in F-A through F-E) and an **in-place edit** surface that covers mark-task-complete, attach-a-note, and a scalar-attribute editor (anchored in UJ-4 and detailed in F-G).

## 2. Goals & non-goals

### V1 goals

- **G1.** Let an Attio user list, search, and inspect their own daily work and the workspace's records (people, companies, deals, tasks) without leaving the Alfred bar.
- **G2.** Allow high-value in-place actions on existing records — mark a task complete, attach a quick note, update scalar fields (stage, value, deadline, email, phone, single-select, record-reference, etc.) — so the workflow is not purely a navigator and saves the most painful CRM-hygiene round-trips.
- **G3.** Ship as a public open-source workflow downloadable from GitHub Releases, installable in under one minute, including first-run authentication.
- **G4.** Adapt at runtime to Attio workspace customization (custom attribute slugs, missing objects) rather than assuming a default schema.

### V1 non-goals (explicit)

- **NG1.** Creating records from scratch (new task, new company, new person/client). Deferred to V2 because creation requires multi-step input UX, per-workspace attribute discovery for required-vs-optional fields, and conflict handling — all of which exceed V1's design budget. Updating fields on records that already exist is in scope (see F-G).
- **NG2.** Editing non-scalar attribute types in V1 — multi-select / list-of-X, structured personal-name (first/last/full as separate sub-fields), structured location, value clearing/deletion. Deferred to V2 because each requires a distinct multi-step UX (additive vs replace, sub-field selection, confirmation for destructive change). Scalar field updates ARE in scope (F-G).
- **NG3.** Acting as a sync engine. The workflow is API-only; no local database, no background sync, no webhooks.
- **NG4.** Bulk operations. Each Alfred invocation operates on a single record.
- **NG5.** A standalone `client` keyword. The brain dump's "créer des nouveaux clients" resolves in V1 to "find an existing person and update their lifecycle attribute slug" — NG1 defers creation; "client" maps to a person carrying a workspace-configured lifecycle attribute (FR-033), not a distinct object. See [[client-semantics]] in the decision log.
- **NG6.** Destructive operations — deleting records, removing linked records, archiving. Reserved for V2+ after the read-and-update surface has stabilized.

## 3. Users

The workflow is designed for daily Attio users — sales reps, account executives, customer success, founders — who keep Alfred bound to `⌥space` and reach for it dozens of times a day. The journeys below use role-neutral phrasing because the V1 capabilities do not vary by role: the same keystroke flows serve a sales rep updating a deal stage and a CS rep logging a note on a customer. When a V1 capability does start to vary by role (e.g. role-aware default filters in V2), the PRD will reintroduce named protagonists.

## 4. User journeys

### UJ-1 — Morning to-do

The user is at their laptop, opening Alfred to check what's on for the day.

1. They hit `⌥space`, type `todo`, and press **⏎**.
2. They see up to 9 task lines, each rendered as **action / linked person / linked deal / linked company** on a single readable row. Overdue tasks are grouped at the top under a "RETARD" label; today's tasks follow.
3. On a given task they can:
   - **⏎** — open the task in Attio for full context.
   - **⌘⏎** — mark the task complete in-place. A macOS notification confirms, the list refreshes; they stay in Alfred.
   - **⇧** — Quick Look: a readonly side panel shows the task's deadline, assignee, linked person/deal/company, and any due-date detail without leaving Alfred.
   - **→** — drill down: a sub-script-filter loads the task's linked records (open person, open company, open deal) and quick actions (write note, mark complete) as navigable items. Backspace returns to the to-do list.
4. They clear two tasks, open one to read context, then close Alfred and move on.

### UJ-2 — Searching for something specific from anywhere

The user is composing a reply in Gmail (or Slack, or a doc — anything but Attio). They have a name or a deal in mind and want it now.

1. They hit `⌥space`, type `person <name>` (or `company`, `deal`, `task`), and see up to 9 results.
2. Each result shows the record's primary name and a context line (role + company for a person; domain for a company; stage + amount for a deal; deadline + status for a task).
3. On a given result:
   - **⏎** — open in Attio (uses the API-returned `web_url`).
   - **⌘⏎** — open LinkedIn (person) or company website (company). For deal/task, degrades to opening the record in Attio with a one-time hint shown until dismissed.
   - **⌥⏎** — write a quick note: the query field becomes the note body; Enter creates an Attio Note linked to this record. Notification confirms.
   - **⇧⌥⏎** — opens a native macOS multi-line input window for longer notes.
   - **⇧** — Quick Look, same model as UJ-1 but with per-object fields.
   - **→** — drill-down (single-level): a sub-script-filter shows linked records and per-object actions; backspace returns to the search results.
4. They copy the email from the Quick Look pane and paste it into Gmail without ever opening Attio.

### UJ-3 — First-time install

The user has just downloaded the `.alfredworkflow` from the GitHub release and double-clicked to install.

1. They hit `⌥space` and type `todo`.
2. Instead of a task list they see a single result: **"Attio API token not configured — ⏎ for setup instructions"**, with an info icon.
3. They press **⏎**. The default browser opens the workflow's README anchor that walks through PAT setup.
4. Following the guide, they open Attio → Settings → Developer → API tokens, generate a new token granting the scopes V1 needs — read on records and tasks, write on tasks and notes, write on record attributes (for F-G updates) — and copy it.
5. They open Alfred preferences → Workflows → Attio → Configure, paste the token into the **Attio API Token** secure textfield, and save.
6. They type `todo` again. On this first successful API call, the workflow probes the identity endpoint to resolve workspace ID + slug + workspace member ID, caches these as "me", and shows a one-time macOS notification: "Connected to <workspace name>". Then the task list appears.
7. If they ever rotate the token, they re-open the configuration sheet and paste the new value; no separate setup keyword required.

This V1 flow is honest about its constraints: a PAT is workspace-scoped, so one Alfred install binds to one Attio workspace. Users who work across multiple Attio workspaces need to either pick one for V1 or wait for V2's OAuth flow. The README must make this clear up-front so the constraint doesn't surface as a frustration.

### UJ-4 — Updating a deal stage from Alfred

The user just signed a Term Sheet with Acme. The deal is currently marked **Discovery** in Attio. They're in another window and don't want to context-switch.

1. They hit `⌥space`, type `deal acme series a`, and the deal appears in the result list.
2. They press **→** to drill down. The sub-list shows the deal's editable fields: Stage, Value, Close date, Linked person, Linked company, and a "Write note…" action.
3. They select **Stage: Discovery** and press **⏎** — a sub-list of the workspace's stage options appears, with the current value marked.
4. They select **Negotiation** and press **⏎**. The workflow fires a `PATCH` to Attio; on success it invalidates the deal's cached entry, re-fetches it, and re-renders the drill-down with the new value; a macOS notification confirms "Deal updated: Acme Series A → Negotiation".
5. Backspace returns to the deal list (which is also re-fetched if it was served from cache). They close Alfred. Elapsed: ~5 seconds. They have not seen Attio's UI.

The same flow applies to any scalar field — number (`Value: 50000 €`), date (`Close date`), datetime (parsed as macOS system timezone, sent as UTC, displayed back in system TZ), text (`Title`), email or phone on a person, record-reference fields (linking via sub-search across the four supported objects). Field types V1 does not handle (multi-select, structured name, location) are shown in drill-down as read-only with a small "edit in Attio" hint.

## 5. Functional requirements

Requirements are grouped by feature and numbered globally with stable IDs. Each FR is a capability statement; technical specifics (endpoints, transport, framework primitives) live in `addendum.md`.

### F-A — Morning to-do (anchors UJ-1)

- **FR-001.** Keyword `todo` lists the current user's open tasks, scoped to "due today or undated and assigned to me", with overdue tasks segmented and labeled at the top of the list.
- **FR-002.** Each task list item renders, on one line: task content, linked person name, linked deal name, linked company name. Missing links are silently omitted (no `null` artefacts).
- **FR-003.** Tasks are sorted within each segment by `deadline_at` ascending, then `created_at` descending as tiebreaker.
- **FR-004.** **⏎** on a task opens the task in Attio. Tasks have no API-returned `web_url`; the workflow constructs `https://app.attio.com/{workspace_slug}/tasks?command-menu-page=task&id={task_id}` from the cached workspace slug and the task ID. On contract break the workflow silently degrades to opening the tasks list view; it does not detect the break itself. See §8 for the assumption and PM note, and addendum §A.
- **FR-005.** **⌘⏎** on a task marks it complete via the API and invalidates the task cache (FR-047). A native macOS notification confirms ("Task completed: <truncated content>") and the to-do list re-fetches. On failure, the notification surfaces a workflow-rendered error string per FR-051. The list is not modified.
- **FR-006.** **⇧** on a task opens an Alfred Quick Look panel showing: full task content, deadline, assignee, linked person / deal / company. Read-only.
- **FR-007.** **→** on a task opens a drill-down script filter listing: linked records as openable items, "Write note…", "Mark complete". Backspace returns to the to-do list.
- **FR-008.** Empty state ("no tasks today") shows a single result with copy that names what was searched (e.g. "No tasks due today for <workspace member name>"). The `{name}` placeholder substitution mechanism is shared with the localization layer (FR-037).
- **FR-009.** Loading state shows a single "Loading…" item with the framework's `sync` icon when the in-flight query has not yet resolved.

### F-B — Universal search (anchors UJ-2)

- **FR-010.** Four keywords — `person`, `company`, `deal`, `task` — each accept a free-text query string after the keyword.
- **FR-011.** Each keyword returns up to 9 results, consistent with the existing `people` implementation.
- **FR-012.** Search semantics: substring match (case-insensitive) on the object's primary name attribute via Attio's structured query filter. No fuzzy matching, no typo tolerance — surface this explicitly in docs.
- **FR-013.** Each result line shows the primary name and a per-object context line:
  - **person**: job title + company name
  - **company**: domain or location
  - **deal**: stage + value
  - **task**: deadline + completion status
- **FR-014.** **⏎** on a result opens the record in Attio using the API-returned `web_url`.
- **FR-015.** **⌘⏎** on a result opens LinkedIn URL (person) or website URL (company). For deal/task, ⌘⏎ degrades to opening the record in Attio; a hint is shown the first time ⌘⏎ is invoked on a deal or task. A boolean `cmd_enter_hint_dismissed` is persisted globally (not per-record) in `alfredClient.config`; subsequent ⌘⏎ invocations skip the hint.
  Note creation, shared rules (FR-016 and FR-017): UTF-8 content, `format=plaintext` (no markdown), `title` auto-derived from content and truncated to 80 chars, no separate title prompt. Trailing whitespace is trimmed and control characters (NUL etc.) are stripped before send. No client-side length cap beyond the input mechanism's natural limit. Notification confirms on success; FR-051 error policy applies on failure.

- **FR-016.** **⌥⏎** captures the rest of the Alfred query as a single-line note and creates an Attio Note linked to the selected record. Embedded newlines are stripped to a space. `title` = the content truncated to 80 chars.
- **FR-017.** **⇧⌥⏎** opens a native macOS input window for multi-line note content; same Note-creation behavior on submit. Embedded newlines are preserved. `title` = the first non-empty line of content, truncated to 80 chars.
- **FR-018.** **⇧** opens Quick Look — readonly fiche of the record's key fields, with per-object field set documented in addendum.
- **FR-019.** **→** opens drill-down — per-object navigable sub-list of linked records and quick actions, with per-object item set documented in addendum. **Drill-down is single-level in V1**: opening a linked record (person, company, deal, task) from a drill-down opens it in Attio, not as a nested drill-down. The only sub-level allowed is the record-reference editing sub-search overlay (FR-042). Multi-level drill-down navigation is a V2 candidate (§9).
- **FR-020.** Empty query on `person` or `company` shows the most recently updated records (mirrors current `people` behavior). Empty query on `deal` shows open deals sorted by recency. Empty query on `task` falls through to `todo` semantics.
- **FR-021.** Empty results state shows a single item naming the query ("No people match 'xyz'").

### F-C — Onboarding and authentication (anchors UJ-3)

V1 uses Personal Access Tokens (PAT). OAuth is deferred to V2 — see decision log entry for OQ-1 reversal and §9 V2 list.

- **FR-022.** On first invocation of any workflow keyword when no token is present in the workflow configuration, the workflow shows a single info result: "Attio API token not configured — ⏎ for setup instructions". No API call is attempted. The result framing is deliberately not "setup guide", which would imply a wizard. The actual flow requires the user to paste a value into Alfred's native config sheet, and Alfred provides no API to open it from a script.
- **FR-023.** **⏎** on the setup-prompt opens the workflow README's PAT-setup anchor in the default browser. The README walks through: generating the PAT in Attio with the required scopes (read on records/tasks, write on tasks/notes, write on record attributes for F-G), then opening Alfred preferences → Workflows → Attio → Configure to paste the token. The README explicitly names the macOS context switch so the user knows where to land next.
- **FR-024.** The PAT is stored in the Alfred workflow's native configuration as a secure textfield (declared in `info.plist` under `userconfigurationconfig`). The workflow reads it at runtime via `alfredClient.env.getEnv`. No additional storage layer.
- **FR-025.** On the first successful API call after a token is configured, the workflow calls `GET /v2/self` to resolve `workspace_id`, `workspace_slug`, `workspace_name`, and `authorized_by_workspace_member_id`. These values are persisted via `alfredClient.config` and cached until the token changes. On this first probe's success, a one-time macOS notification confirms "Connected to <workspace_name>" so the user has a closing receipt for the onboarding loop. If the probe fails: the keyword shows a single error result naming the failure (network unreachable, 401 invalid token, 403 missing scope) with a remediation hint; no identity is cached.
- **FR-026.** Token rotation is performed by editing the same config textfield. The workflow detects a token change by hashing the configured value and invalidates the cached identity if the hash changes.
- **FR-027.** Multi-workspace is not supported in V1; PATs are workspace-scoped, so one Alfred install binds to one Attio workspace. Multi-workspace lands with V2 OAuth (§9 V2-3, V2-4). README documents the limitation.
- **FR-028.** A keyword `attio:diag` displays workspace slug, member identity, cache age, last error, and current PAT presence (without revealing the token) — used for community support.
- **FR-029.** _(Reserved for V2: OAuth flow keyword.)_

### F-D — Adaptation to workspace customization

- **FR-030.** On the first successful API call after token configuration, the workflow fetches `GET /v2/objects` to discover which standard objects exist and their slugs. If a workspace renames or hides an object (e.g. no `deals`), the corresponding keyword either degrades (search empty) or is hidden, with a one-time toast.
- **FR-031.** Object attribute definitions are fetched via `GET /v2/objects/{slug}/attributes` at first run and cached for 24h. The cache key is workspace ID + object slug. The fetch is used to render Quick Look and drill-down fields against the workspace's actual schema, not a hardcoded one. When an admin adds new options, the user manually refreshes the cache via `attio:refresh` (FR-032).
- **FR-032.** A manual cache-flush keyword `attio:refresh` clears all caches and re-fetches schema and identity.
- **FR-033.** The workflow configuration exposes one optional textfield per primary object (`person`, `company`, `deal`) for a "lifecycle / status attribute slug" that the user sets to the slug of their workspace's lifecycle attribute. When set, that attribute's value is rendered in the result-list context line for that object (e.g. `person`: "VP Sales · Acme Corp · Client"). When unset, the context line falls back to the default field set in FR-013. Tasks are intentionally excluded from this config because their relevant lifecycle (`is_completed`) is already rendered in FR-013's task context line as a boolean. See addendum §F point 8 for the config field names.

### F-E — Quick Look and drill-down rendering

- **FR-034.** Quick Look is rendered as an HTML file written to the workflow's cache directory and referenced via Alfred's `quicklookurl` field. Inline CSS, no external dependencies.
- **FR-035.** Drill-down items use the same FastAlfred ScriptFilter pattern as primary lists; each drill-down item is independently actionable (⏎ opens / executes; ⌘⏎ same modifier semantics where they apply).
- **FR-036.** Both Quick Look and drill-down gracefully degrade when an expected attribute is missing — empty fields are omitted, not rendered as `—` or `null`.

### F-F — Localization

- **FR-037.** V1 ships both English and French UI strings. All workflow-rendered text (empty states, errors, labels, notifications, Quick Look field labels) is centralized in a single `strings/{en,fr}.json` module; no inline strings in keyword scripts.
- **FR-038.** Default language is selected from macOS system locale at runtime: `fr*` → French, else English. A workflow config field overrides the auto-detection with an explicit `en` or `fr` choice.
- **FR-039.** Data from Attio (record names, field values, note contents) is never translated — only the workflow's own chrome.

### F-G — Record field updates (anchors UJ-4)

V1 supports updating existing scalar field values on records of any primary object (person, company, deal, task). Creation is out of scope (NG1); non-scalar types are out of scope (NG2).

- **FR-040.** Editable scalar attribute types on **records** (people, companies, deals): text (single and multi-line), number, currency, email-address (single value), phone-number (single value), date and datetime, single-select / status / stage / lifecycle, single record-reference (link to another record), URL. **Tasks have a narrower writable surface per Attio's API**: only `deadline_at`, `is_completed`, single `assignee` (workspace member), and `linked_records` are editable; task `content` cannot be patched. The workflow renders task `content` as read-only in drill-down, never as an edit affordance. Per-type input UX and API payload shape are documented in addendum §H.
- **FR-041.** In a record's drill-down, every attribute of a type in FR-040 is rendered as an "edit" action item. The item shows the current value inline ("Stage: Discovery — edit").
- **FR-042.** Selecting an edit item opens a type-specific input:
  - **Text / number / email / phone / URL** → an inline Alfred text input prefilled with the current value (or the multi-line input window from FR-017 for multi-line text).
  - **Date** → an inline text input expecting `YYYY-MM-DD`; invalid input shows an inline parse error item, no API call.
  - **Datetime** → an inline text input expecting `YYYY-MM-DDTHH:MM` interpreted in the user's macOS system timezone. The workflow converts to UTC before PATCH; values displayed in drill-down, Quick Look, and the input prefill are converted from UTC back to system TZ. Timezone conversion lives in a small shared helper to keep behavior consistent across display and edit paths.
  - **Single-select / status** → a sub-script-filter listing the workspace's option set for that attribute, with the current option marked. Selecting an option saves.
  - **Single record-reference** → a sub-search across the target object type, restricted to the four supported objects (people, companies, deals, tasks). If the target object is not one of those, see FR-048. The sub-search reuses F-B's search semantics (FR-012); if the search returns zero results, the sub-list shows "No <object> match <query>" and **⏎** is a no-op.
- **FR-043.** Saving fires `PATCH /v2/objects/{slug}/records/{record_id}` with the new value (or the task equivalent for task-object updates). On success: cache invalidation per FR-047 fires, the record is re-fetched by ID, the drill-down re-renders, and a macOS notification confirms "Updated <field>: <new value>". On failure: notification with the workflow-owned error string per FR-051; the drill-down is not modified.
- **FR-044.** Attributes whose type is not in FR-040 (multi-select, structured name, location, etc.) are rendered in drill-down as read-only items with a small "edit in Attio →" affordance that opens the record in Attio.
- **FR-045.** Archived or read-only attributes (per the workspace's attribute definition) are hidden from drill-down entirely.
- **FR-046.** No optimistic UI. The drill-down reflects the new value only after the server confirms. While the PATCH is in flight, the drill-down shows a loading indicator on the affected line. Implementation pattern documented in addendum §B (`ScriptFilter.rerun` + status-file convention).
- **FR-047 (cross-cutting).** Cache invalidation on mutation. Every mutating action — mark task complete (FR-005), create note (FR-016, FR-017), update scalar field (FR-043) — invalidates the cached record entry for `(object_slug, record_id)` and any cached list-result pages that include that record. The next read repopulates from the API. The attribute-definition cache (FR-031, 24h TTL) is not invalidated by mutations because schemas are unaffected by record writes; admin-side option-list changes still require `attio:refresh`.
- **FR-048.** Record-reference attributes whose target object is not one of {people, companies, deals, tasks} are rendered as read-only with the "edit in Attio →" affordance from FR-044, even though their type appears in FR-040. The workflow does not generalize the F-B search keyword set in V1.
- **FR-049.** Attribute-definition discovery failure. If `GET /v2/objects/{slug}/attributes` (FR-031) has never succeeded for an object since the last `attio:refresh`, F-G edit affordances are not rendered for that object — drill-down for that object shows only read-and-navigate items. `attio:diag` (FR-028) surfaces the missing schema in its output so users can self-diagnose.
- **FR-050.** Write-permission failure. If a `PATCH` returns 403 (token lacks write scope on that attribute or object), the drill-down marks the affected field with a "read-only — token lacks write scope" hint instead of repeating a generic error toast on each attempt. The hint persists for the session; a token rotation (FR-026) clears it.
- **FR-051 (cross-cutting).** Error copy policy. All workflow-rendered error notifications use the workflow's English/French strings (FR-037). The exception is HTTP 422 validation errors on `PATCH /v2/objects/...`: Attio's field-level message is surfaced verbatim, because translating would lose precision. HTTP status → user-visible context: 401 → "Token invalid — re-paste in config sheet"; 403 → "Token lacks the required scope"; 404 → "Record no longer exists in Attio"; 422 → "<Attio's field message>"; 5xx after retry → "Attio is unreachable — try again later".

## 6. Non-functional requirements

### NFR-A — Performance

- **NFR-001.** Cached lists (`todo`, empty-query search) render results in the Alfred bar in a single frame after Enter, with no spinner shown. The implementation provides a `npm run perf` script that times N invocations from a warm cache on the maintainer's machine; the script is run before each tagged release and its output is recorded in the release notes. Quantitative thresholds are not asserted because the workflow ships no runtime telemetry (NFR-009).
- **NFR-002.** Cold API-bound queries (search with a query, drill-down on an uncached record) show a loading state within 300ms (per NFR-003) and complete in under two seconds on a typical broadband connection. The same `npm run perf` script measures cold-path budgets and is run pre-release.
- **NFR-003.** A loading state is shown after 300ms of unresolved query; never a frozen-empty Alfred bar.

### NFR-B — Caching and rate limiting

- **NFR-004.** Cache TTLs: tasks 60s, people 10 minutes, companies 24 hours, deals 5 minutes, workspace member identity until manually flushed. All use `alfredClient.cache` (replacing the project's current ad-hoc TTL constants). Why these values: tasks change most often per user (60s balances freshness vs request count for the `todo` keyword); deals get hand-edited during sales motion (5min); people are mostly stable but profile edits happen (10min); companies are the most stable in normal CRM use, dominated by re-reads of the same firm during prospecting (24h). All TTLs are review candidates against real usage in V2.
- **NFR-005.** Attio rate-limit responses (HTTP 429 with `Retry-After`) are honored with exponential backoff and a single retry; on second failure, an error item is shown using the FR-051 copy policy.
- **NFR-006.** No background polling. All API calls are demand-driven by an Alfred invocation.
- **NFR-006a.** Concurrency. Each Alfred invocation is a fresh script process; the workflow does no inter-process locking. If two invocations race on the same cache entry (e.g. the user invokes `todo` while a previous `todo` mutation is still in flight), the later writer wins on disk. Last-writer-wins is acceptable because the only persisted state mutated outside identity setup is the cache (eventually consistent against Attio by design) and the `cmd_enter_hint_dismissed` flag (an idempotent boolean). PATCH API calls (FR-043, FR-005) are not deduplicated client-side; users who rapid-fire the same mutation may emit duplicate writes, and handling that is Attio's idempotency contract.

### NFR-C — Offline and degraded states

- **NFR-007.** "Offline" is detected when an API request fails at the socket layer (DNS failure, connection refused, timeout exceeding 5s) or when Attio returns 5xx after the single retry of NFR-005. In that state, cached results are shown with a one-result "Offline — showing cached data" prefix item; mutating actions are disabled (the affordances render but ⏎/⌘⏎ surface "Cannot reach Attio — try again later" without sending the request).
- **NFR-008.** When the access token is invalid (HTTP 401), the user sees a single result prompting them to re-paste the PAT in the workflow configuration sheet (Alfred preferences → Workflows → Attio → Configure). The result's ⏎ action opens the README's troubleshooting anchor; Alfred provides no API to open its own config sheet from a script.

### NFR-D — Privacy and security

- **NFR-009.** No telemetry, analytics, or remote logging. Logs stay local in Alfred's debug log. The PAT is never written to the debug log; request URLs containing record IDs may appear in the debug log only when Alfred debug mode is enabled by the user. An opt-in anonymous telemetry path is a V2 candidate (§9) to unblock quantitative success metrics.
- **NFR-010.** The PAT is stored in Alfred's native `userconfigurationconfig` secure textfield, declared in `info.plist`, and read at runtime via `alfredClient.env.getEnv`. Alfred encrypts secure textfields at rest. The PAT is never logged, never written to the Quick Look HTML cache, and never echoed back to the user through `attio:diag` (FR-028 deliberately surfaces only PAT presence, not its value). Note: `alfredClient.config` (the `sindresorhus/conf` store used for cached identity / workspace slug / `cmd_enter_hint_dismissed` / token-hash) writes plaintext JSON to `~/Library/Preferences/`; nothing sensitive lands there.
- **NFR-011.** Quick Look HTML files written to the cache directory are scrubbed on `attio:refresh` and on workflow update. On uninstall, removing the workflow's data directory via Alfred prefs is the user-visible mechanism; the workflow does not register a separate uninstall hook.

### NFR-E — Internationalization

- **NFR-012.** Two languages supported in V1: English and French. Language selection logic and string centralization are specified as functional requirements (FR-037 through FR-039). String templating mechanism: `{name}`-style placeholder substitution. ICU pluralization rules and grammatical-gender handling are out of scope for V1. At the NFR level: adding a third language must require only a new strings file, with no code change to keyword scripts.

### NFR-F — Distribution and support

- **NFR-013.** Each Conventional-Commits release produces a `.alfredworkflow` artifact attached to the GitHub Release via the existing `semantic-release` pipeline. `.alfredworkflow` files do not auto-update on the user's machine; users re-download and re-install. The README declares this explicitly so users do not expect a silent update path.
- **NFR-014.** The README, currently a `TODO` placeholder, must be authored before V1.0.0: install steps (Alfred 5+, macOS version floor TBD at build), screenshots, keyword reference for every keyword in F-A through F-G, PAT-generation walkthrough with required scopes, troubleshooting, known limitations (single-workspace, no fuzzy search, task deep-link best-effort), and license declaration (TBD at build, see §9).
- **NFR-015.** The `info.plist` workflow description (also `TODO`) must be a one-paragraph user-facing summary in English (the only language Alfred's gallery surfaces).
- **NFR-016.** Issues and feature requests are tracked on GitHub with labels: `bug`, `feature`, `setup-friction`, `perf`, `api-change` (for Attio-side breakage). The maintainer triages monthly; no SLA is implied. Issue templates (bug, feature, setup-failure) are required before V1.0.0 to make the M-1 to M-3 qualitative signal interpretable.

## 7. Success metrics

V1 forbids telemetry (NFR-009), so success metrics are GitHub-issue-derived community signals — not direct thesis validation. The single-instrument dependency (one channel for all signals) is accepted as a known limitation; V2-7 names the path to closing the gap with opt-in telemetry.

### Adoption signals (positive, observation-only)

- **M-1.** GitHub Release download count by version. Direction-only.
- **M-2.** Repo stars trajectory. Awareness proxy, not use.
- **M-3.** Volume of issues under `feature` and questions — engaged-user proxy.

### Friction signals (counter, observation-only)

- **M-4.** Issues under `setup-friction`. Rising trend signals onboarding regression.
- **M-5.** Issues under `api-change` or mentioning "rate limit", "429". Spike signals caching misconfiguration or Attio API change.
- **M-6.** Issues mentioning "fast", "slow", "lag" — NFR-A drift indicator.

### Review cadence

The maintainer reviews opened issues quarterly, categorizes by the labels above, and notes trend direction in release notes. Concerning trends are the PRD-level signal to investigate.

### Qualitative validation candidates (optional, V2 prep)

A one-time round of 5–10 user interviews drawn from GitHub-issue authors before V2 — asking which Attio actions they now do in Alfred vs which they still open the app for — would be a more deliberate thesis check. Not V1-committed; named here so it surfaces during V2 scoping.

## 8. Open questions

All PRD-level open questions raised during Discovery have been resolved (see decision log). One inferred V1 dependency remains:

- **`[ASSUMPTION + NOTE FOR PM]` on FR-004 — task deep-link.** The `?command-menu-page=task&id=…` URL pattern is undocumented and user-tested only. V1 uses it best-effort with silent fallback to the tasks list view on contract break. Revisit if Attio publishes a stable URL contract or breaks the current one; a release-time CI check against a fixture workspace is a V2 hardening candidate.

Build-time decisions that the PRD intentionally does not bind, deferred to the engineering plan: macOS version floor, the project's open-source license (MIT / Apache 2.0 / GPL — to be chosen before V1.0.0), the Alfred Gallery submission timing. All three are flagged in addendum §G.

## 9. Out of scope for V1, planned for V2

- **V2-1.** Creation flows for task, company, person — including per-workspace attribute discovery and the multi-step input UX that requires.
- **V2-2.** Remaining attribute-edit types not covered by F-G — multi-select / list-of-X (additive vs replace UX), structured personal-name (first/last/full), structured location, value clearing/deletion. Destructive operations (record delete, link removal, archive) are tracked separately under NG6 → V2.
- **V2-3.** OAuth authentication via a hosted relay service that holds the `client_secret`. Replaces PAT-paste as the default onboarding UX; PAT stays available as an escape hatch. Requires standing up + maintaining the relay (Cloudflare Worker or equivalent), accepting the trust + hosting cost trade-off.
- **V2-4.** Multi-workspace support — relevant only once OAuth (V2-3) lands, since PAT is workspace-scoped by Attio's design.
- **V2-5.** Multi-level drill-down navigation — V1 caps drill-down at single-level (FR-019); arbitrary-depth navigation with per-level refresh contracts is a V2 candidate.
- **V2-6.** Additional languages beyond English and French (V1 ships both per FR-037–FR-039).
- **V2-7.** Opt-in anonymous telemetry that would close the thesis-validation gap named in §7. Strictly opt-in at install; never default-on. Would unlock quantitative success metrics (round-trip count, action-completion rate, p95 latencies).
- **V2-8.** Update-notification UX — a once-per-day GitHub API check that surfaces a `New version available` result in any keyword's empty state. V1 has no in-workflow update channel (NFR-013).
- **V2-9.** Policy for handling new Attio attribute types as Attio adds them. V2 should articulate a release cadence for adding new types as they ship; V1 falls back to FR-044 read-only rendering.
- **V2-10.** Possibly: bulk actions on a search result list (mark N tasks complete, add tag to N people).

## 10. Glossary

Terms used throughout the PRD and addendum. Intended to lower the onboarding cost for contributors who are not Attio-native.

- **Object** — Attio's term for an entity type (`people`, `companies`, `deals`, `tasks`). Each object has a slug and a set of attributes.
- **Slug** — The URL-safe identifier for an object (e.g. `people`) or an attribute (e.g. `job_title`). Workspaces can rename slugs; the workflow discovers them at runtime per F-D.
- **Attribute** — A field on a record (name, email, stage, deadline, etc.). Each attribute has a type that determines its value shape.
- **Scalar vs non-scalar attribute** — Scalars are single-value, primitive-ish types (text, number, email, phone, date, single-select, single record-reference, URL). Non-scalars are multi-value collections or structured composites (multi-select, structured personal-name with first/last/full, structured location). V1's F-G edits scalars; V2 plans non-scalars.
- **Record** — An instance of an object: one person, one company, one deal, one task.
- **Record-reference** — A pointer attribute whose value is another record (e.g. a deal's linked company). V1 edits single record-references via a sub-search; multi-reference fields are V2.
- **Workspace** — A tenant in Attio. A PAT is workspace-scoped; one Alfred install binds to one workspace in V1.
- **Workspace member** — A user of an Attio workspace, identified by a workspace member ID. The workflow resolves the current user's workspace member ID once and uses it as "me" (FR-025).
- **Lifecycle attribute** — A workspace-defined single-select attribute that captures a record's stage in a lifecycle (e.g. `lead → qualified → customer → churned`). Names vary per workspace; FR-033 lets users configure which attribute slug surfaces in result-list context lines.
- **PAT** (Personal Access Token) — An Attio-issued bearer token granted at user discretion through Attio settings. The V1 auth mechanism. See decision log for why OAuth was rejected for V1.
- **Quick Look** — Alfred's native readonly side-panel preview, triggered by ⇧ on a result. The workflow generates an HTML file per record on demand and points `quicklookurl` at it.
- **Drill-down** — A sub-script-filter the workflow opens on **→**, listing a record's editable fields, linked records, and quick actions. Single-level in V1 (FR-019).
- **`web_url`** — A canonical Attio-hosted URL for opening a record in the Attio web app. Returned on people, companies, and deals records. Tasks have no API-returned `web_url`; the workflow constructs one per FR-004.
