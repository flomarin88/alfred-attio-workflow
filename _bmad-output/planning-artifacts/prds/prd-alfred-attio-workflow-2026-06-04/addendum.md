---
title: PRD Addendum — Alfred Workflow for Attio CRM
status: final
created: 2026-06-04
updated: 2026-06-05
---

# Addendum

User-contributed depth that belongs downstream (architecture, solution design, UX spec) but doesn't fit the PRD body. Captured here at PRD time so it isn't lost.

## A. Attio API surface used by V1

| Capability                       | Endpoint                                                                                                                      | Notes                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search people                    | `POST /v2/objects/people/records/query`                                                                                       | Filter DSL with `$or` / `$contains`. Substring match, case-insensitive.                                                                                                                                                                  |
| Search companies                 | `POST /v2/objects/companies/records/query`                                                                                    | Same shape as people.                                                                                                                                                                                                                    |
| Search deals                     | `POST /v2/objects/{deals-slug}/records/query`                                                                                 | Slug discovered via `GET /v2/objects` because `deals` is workspace-customizable.                                                                                                                                                         |
| Search tasks                     | `GET /v2/tasks`                                                                                                               | Documented server-side filters: `assignee` and `is_completed`. **Deadline range and "due today or undated" (FR-001) are client-side filters** — fetch with `is_completed=false` + `assignee=<me>`, then filter and sort in the workflow. |
| Get record by ID                 | `GET /v2/objects/{slug}/records/{id}`                                                                                         | Used in drill-down for fetching linked record details.                                                                                                                                                                                   |
| Mark task complete / update task | `PATCH /v2/tasks/{id}` with `{ "is_completed": true }` (or other writable fields among the four listed in §H tasks paragraph) | See §H + FR-040 for the writable-field set.                                                                                                                                                                                              |
| Create Note                      | `POST /v2/notes` with `parent_object`, `parent_record_id`, `title`, `content`, `format`                                       | All five fields required. Title derivation per FR-016 / FR-017.                                                                                                                                                                          |
| Object schema discovery          | `GET /v2/objects` then `GET /v2/objects/{slug}/attributes`                                                                    | For FR-030, FR-031.                                                                                                                                                                                                                      |
| Identity / "me"                  | `GET /v2/self`                                                                                                                | Returns `workspace_id`, `workspace_slug`, `workspace_name`, `authorized_by_workspace_member_id`. For FR-025.                                                                                                                             |

All requests use `Authorization: Bearer <token>` against `https://api.attio.com`. Default `limit=9` for search queries to match the Alfred 9-result cap.

## B. fast-alfred primitives leveraged

- **`alfredClient.cache.setWithTTL(key, value, { maxAge })`** — replaces the current ad-hoc TTL constants in `people.ts` (FR-031, NFR-004).
- **`alfredClient.env.getEnv(key)`** — reads Alfred's user-configured env vars; used for the PAT and the optional lifecycle-attribute slug fields (FR-024, FR-033).
- **`alfredClient.config`** — `Conf`-backed persistent store for the cached workspace ID, workspace slug, "me" workspace member ID, the `cmd_enter_hint_dismissed` flag (FR-015), and the PAT-value hash for change detection (FR-026). The PAT itself stays in `env.getEnv` — Alfred's encrypted config holds the source of truth.
- **`alfredClient.icons.getIcon('sync')`** for loading state, `'error'` for failures, `'info'` for setup prompt (FR-008, FR-009, FR-022).
- **`alfredClient.output(ScriptFilter)`** — standard ScriptFilter rendering for every keyword script. The `ScriptFilter.rerun` field (Alfred-supported, range 0.1s – 5.0s) is the mechanism backing FR-046's polling loading state: the drill-down script emits a spinner row, sets `rerun=0.3`, and re-evaluates until the PATCH worker writes its result-file to `alfredInfo.cache()` and the script reads it back.
- **`alfredClient.alfredInfo.cache()` / `alfredInfo.data()`** — the canonical workflow-specific cache directory and persistent data directory. FR-034 (Quick Look HTML) and the PATCH-worker result files (FR-046) write to `cache()`; long-lived state (cached identity, `cmd_enter_hint_dismissed`) writes via `alfredClient.config` which internally lands under `data()`. Ad-hoc `os.tmpdir()` paths are out of scope.
- **`alfredClient.log(text)`** — emits to Alfred's debug log only (NFR-009). PAT never appears in args passed to `log()`.
- **`fast-alfred pack`** — invoked by the existing `semantic-release` exec step to produce the `.alfredworkflow` artifact (NFR-013). Verify the artifact filename glob in the release config matches what `pack` actually emits before V1.0.0.

**Primitive NOT provided by fast-alfred — must be added:**

- **macOS notifications.** FR-005, FR-016, FR-017, FR-025, FR-043 all assume a native notification confirms an action. fast-alfred exposes no notification primitive. Implementation: shell out to `osascript -e 'display notification "..." with title "..."'` from a small helper in `src/common/notify.ts`. Chosen over `terminal-notifier` (the obvious alternative) for zero install footprint and Alfred 5 compatibility.

Bundling assumption: one TypeScript entry per Alfred keyword under `src/main/*.ts`. The current `src/main/people.ts` becomes `src/main/person.ts` (renamed) or stays as `people.ts` with the keyword renamed in `info.plist`.

## C. Authentication mechanics

### C.1 V1 — Personal Access Token (PAT) paste

The Attio canonical OAuth pages (`/docs/oauth/authorize`, `/docs/oauth/token`, verified during PRD discovery) document a confidential-client-only flow: `client_secret` required, no PKCE, no refresh token, no `expires_in`. Embedding `client_secret` in a publicly distributed `.alfredworkflow` is incompatible with public OSS distribution, so V1 sidesteps OAuth entirely.

**Mechanics:**

- User generates a PAT at https://app.attio.com/settings/api (verify URL at build).
- User pastes the PAT into the Alfred workflow's native `userconfigurationconfig` secure textfield, declared in `info.plist` (the existing project already wires this for the current `people` keyword).
- Workflow reads the PAT via `alfredClient.env.getEnv` at each invocation. No additional storage.
- First successful API call after token configuration triggers an identity probe — `GET /v2/self`. The response carries workspace ID, workspace slug, workspace name, and the current workspace member ID; these are cached via `alfredClient.config` until the token hash changes.

**Token rotation:** the user replaces the textfield value. Workflow hashes the value on each invocation; if the hash differs from the cached one, identity is re-probed.

### C.2 V2 — OAuth via hosted relay (planned)

Replaces V1 PAT-paste as the default onboarding UX. PAT stays as an escape hatch for users who don't want to depend on the relay.

**Sketch:**

1. A small relay service (Cloudflare Worker, Vercel function, or similar) is deployed under a stable domain owned by the project. It holds the OAuth `client_secret` as an environment variable, never exposed to clients.
2. The Alfred workflow's setup keyword opens `https://app.attio.com/authorize?client_id=…&redirect_uri=<RELAY_DOMAIN>/callback&response_type=code&state=<random>`.
3. Attio redirects to the relay's `/callback` with the code. The relay performs the token exchange (`POST https://app.attio.com/oauth/token` with `client_secret`), receives the access token, then forwards it back to the desktop client.
4. Forwarding transport (TBD at V2 design time): either (a) the relay's callback page shows the token for manual paste, (b) the workflow polls a relay endpoint keyed by `state`, or (c) the relay redirects to a registered loopback URI on the desktop with the token in the URL fragment.

**Trade-offs the V2 spec must address:** who hosts and pays for the relay, what the relay logs (ideally nothing per-user), how the `client_secret` is rotated, what happens if the relay goes down. None of this blocks V1.

### C.3 What's verified from Attio docs (PRD discovery, 2026-06-04)

| Endpoint       | Verified shape                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/authorize`   | Required: `client_id`, `response_type=code`, `redirect_uri`. Optional: `state`. `redirect_uri` must exactly match a value registered in the app's settings. No PKCE documented.     |
| `/oauth/token` | Required: `client_id`, `client_secret`, `grant_type=authorization_code`, `code`. Response: `access_token`, `token_type` ("Bearer"). No `refresh_token`, no `expires_in` documented. |
| Scopes         | Not enumerated on the canonical authorize page. Mentioned generically: "tasks, user management, object configuration and records". To enumerate at V2 design time.                  |

## D. Workspace customization mechanics

The Attio data model is workspace-customizable in two ways the workflow must handle:

1. **Object slug renames.** A workspace can rename `deals` to `opportunities` or hide it entirely. `GET /v2/objects` returns the canonical list per workspace. The workflow keyword-to-slug map is built once at onboarding and stored in config; keywords whose object is missing simply produce an empty-state message.
2. **Attribute renames / additions.** A workspace can add custom attributes or rename standard ones. The Quick Look and drill-down renderers consult `GET /v2/objects/{slug}/attributes` to learn which attributes exist and their types. Per-object field maps in the workflow are a _preferred_ list (e.g. for `person`: `name`, `job_title`, `primary_email_address`, `company`, `created_at`); when an entry isn't present, it's silently skipped.

## E. Per-object Quick Look and drill-down field maps (V1 draft)

V1 draft per-object field lists. UX spec downstream will refine.

### Person — Quick Look

- Full name
- Job title
- Primary email
- Primary phone
- Linked company
- LinkedIn URL
- Last updated date

### Person — Drill-down items

- Open in Attio (⏎)
- Open LinkedIn (⌘⏎)
- Linked company → opens company drill-down
- Write note (⌥⏎ semantics, becomes its own input step)
- Recent notes (last 3, each opens in Attio)

### Company — Quick Look

- Name
- Domain
- Industry
- Location
- Linked people count
- Last updated date

### Company — Drill-down items

- Open in Attio
- Open website
- Linked people (top N) → each opens person Quick Look
- Open deals associated with this company
- Write note

### Deal — Quick Look

- Name
- Stage
- Value
- Linked company
- Linked people (primary)
- Close date / due date
- Last updated

### Deal — Drill-down items

- Open in Attio
- Linked company
- Linked people
- Linked tasks
- Write note

### Task — Quick Look

- Content
- Deadline
- Assignee
- Linked person / deal / company

### Task — Drill-down items

- Open in Attio (or fallback to tasks list per FR-004)
- Open linked person
- Open linked company
- Open linked deal
- Mark complete
- Write note

## F. Migration from current code

The current `src/main/people.ts` already implements the V1 `person` capability for ⏎ and ⌘⏎. To align with this PRD:

1. Rename keyword `people` → `person` in `info.plist` (consistent across F-B). Default: also rename `people.ts` → `person.ts` for symmetry with F-B keywords. Update `.fast-alfred.config.cjs` bundler glob and CI accordingly.
2. Add the ⌥⏎ note-creation mod and the ⇧⌥⏎ multi-line variant.
3. Replace `quicklookurl = person.web_url` (currently rendering the Attio webapp inside the preview pane, not satisfying FR-018 / FR-034) with a generated HTML fiche written to `alfredInfo.cache()` per FR-034.
4. Add `→` drill-down sub-script-filter entry. Default: a single `drilldown.ts` with object dispatch via query arg (alternative: dedicated `drilldown-<object>.ts` files).
5. Wire the currently-dead cache constants in `people.ts` (`COMPANY_TTL`, `PEOPLE_TTL`) into `alfredClient.cache.setWithTTL` and read paths (NFR-004). At present the constants exist but are never consulted.
6. Expand `AttioClient` (`src/common/attio/client.ts`) from read-only to read+write. New methods: `getSelf`, `listObjects`, `getObjectAttributes`, `patchRecord(slug, id, payload)`, `patchTask(id, payload)`, `createNote(payload)`, `listWorkspaceMembers`, plus search variants for `companies`, `deals`, `tasks`.
7. Replace the current throw-on-missing-PAT behaviour in `people.ts` (calls `alfredClient.error`) with the friendly setup-prompt result mandated by FR-022.
8. Add new keyword scripts: `todo.ts`, `company.ts`, `deal.ts`, `task.ts`, `diag.ts`, `refresh.ts`. No `setup.ts` — V1 uses Alfred's native config sheet for the PAT, no scripted onboarding flow.
9. Centralize all UI strings into `src/strings/{en,fr}.json` (FR-037) and add a `strings.ts` helper that resolves locale at runtime (FR-038) and supports `{name}`-style placeholder substitution (NFR-012).
10. Add `src/common/tz.ts` with `parseLocalToUtcIso(input: string): string` (FR-042 datetime input) and `formatUtcToLocal(utcIso: string): string` (display). Both use `Intl.DateTimeFormat` with the system timezone — no third-party TZ library.
11. Add `src/common/cache.ts` (or extend the existing client) with explicit invalidation methods: `invalidateRecord(slug, id)` and `invalidateListsContaining(slug, id)`, wired into FR-005, FR-016, FR-017, FR-043 per FR-047.
12. Add `src/common/notify.ts` per §B notification callout (FR-005, FR-016, FR-017, FR-025, FR-043).
13. Add three optional config fields in `info.plist`: `LIFECYCLE_ATTRIBUTE_PERSON`, `LIFECYCLE_ATTRIBUTE_COMPANY`, `LIFECYCLE_ATTRIBUTE_DEAL` (FR-033). Read via `alfredClient.env.getEnv` with a default of empty string.
14. The hotkey trigger UID `028ACD78-…` in `info.plist` has no key/mod binding and is unused. V1 default: remove unless a deliberate decision is made to bind it (e.g. to `todo`).
15. Pre-V1 verification pass against a fixture Attio workspace: curl-probe `PATCH /v2/objects/{slug}/records/{id}` for each editable attribute type in §H to confirm the value shape; curl-probe `POST /v2/notes` to confirm the five required fields; verify `GET /v2/tasks` filter parameters; verify the task deep-link URL still works (per FR-004).

## G. Distribution checklist (build-time)

- **README rewrite** (NFR-014) — must include PAT generation walkthrough with required scopes (read on records/tasks, write on tasks/notes, write on record attributes for F-G), EN + FR walkthrough (FR-037–FR-039), known limitations (single-workspace, no fuzzy search, task deep-link best-effort, no auto-update), license declaration, troubleshooting section keyed to FR-051 error copy.
- **`info.plist` description rewrite** (NFR-015) — one-paragraph user-facing summary in English.
- **License decision** — once §8 decision lands, add a top-level `LICENSE` file and README declaration (default suggestion: MIT, aligned with existing `package.json` LICENSE field).
- **macOS version floor** — declare in README + `info.plist` once §8 decision lands (default suggestion: macOS 13+ Ventura).
- **Alfred version floor** — Alfred 5+ in README and `info.plist` per OQ-3 decision log.
- **Release pipeline** — verify `fast-alfred pack` artifact is correctly attached by `semantic-release` to GitHub Releases; verify the `.alfredworkflow` extension MIME setup is right for Safari downloads.
- **Issue templates** — `.github/ISSUE_TEMPLATE/` with `bug.md`, `feature.md`, `setup-failure.md`, `api-change.md` matching NFR-016 labels.
- **`npm run perf` script** — implements the NFR-001/NFR-002 timed-invocation baseline for pre-release perf checks.
- **Alfred Gallery submission** — optional, once V1.0.0 is stable.

## H. Editable scalar attribute types — input UX and API payload matrix (F-G)

For FR-040 through FR-046. Per-type input UX and the value shape sent in `PATCH /v2/objects/{slug}/records/{record_id}` body's `data.values.<attribute_slug>`.

**Verify at build** (see §F item 15). Payload shapes below are documented + observed; single-select, single record-reference, and text shapes especially need confirmation at build.

| Attio attribute type                 | Input UX                                                                               | API value shape (best-known)                                                                            | V1 notes                                                                                                                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text` (single-line)                 | Inline Alfred text input, prefilled                                                    | `"new string"` or `[{ "value": "new string" }]` (multi-value wrapper, observed in some Attio responses) | If empty, no API call (use V2 clear-value flow when shipped)                                                                                                                                                                        |
| `text` (multi-line)                  | Native macOS multi-line input window (same as FR-017 note)                             | Same as single-line                                                                                     |                                                                                                                                                                                                                                     |
| `number`                             | Inline text input; parse to number; show error on NaN                                  | `42` or `[{ "value": 42 }]`                                                                             |                                                                                                                                                                                                                                     |
| `currency`                           | Inline text input; parse to number; currency code from attribute definition            | `[{ "currency_value": 50000, "currency_code": "EUR" }]`                                                 | Currency code is determined by the attribute config, not user input                                                                                                                                                                 |
| `email-address` (single)             | Inline text input; minimal `x@y.z` shape check                                         | `[{ "email_address": "x@y.z" }]`                                                                        | Multi-value email arrays = V2                                                                                                                                                                                                       |
| `phone-number` (single)              | Inline text input                                                                      | `[{ "original_phone_number": "+33 …", "country_code": "FR" }]`                                          | Country code inferred from phone prefix if possible, else from workspace default                                                                                                                                                    |
| `date`                               | Inline text input; require `YYYY-MM-DD`                                                | `[{ "value": "2026-07-15" }]`                                                                           | Date has no timezone; sent as the user typed. Inline parse error if invalid; no API call.                                                                                                                                           |
| `datetime` (`timestamp`)             | Inline text input; require `YYYY-MM-DDTHH:MM` interpreted in macOS system timezone     | `[{ "value": "2026-07-15T12:30:00Z" }]`                                                                 | Workflow converts system-TZ ↔ UTC at PATCH and display boundaries (drill-down, Quick Look, prefill). Centralized in `src/common/tz.ts`. Example: CEST input `2026-07-15T14:30` → PATCH `…T12:30:00Z` → display `2026-07-15 14:30`. |
| `single-select` / `status` / `stage` | Sub-script-filter listing options from `GET /v2/objects/{slug}/attributes` → `options` | `[{ "option": { "id": "..." } }]` or `[{ "status": { "id": "..." } }]`                                  | Option list cached with attribute defs (24 h, FR-031)                                                                                                                                                                               |
| `record-reference` (single)          | Sub-search over target object type (re-uses F-B search)                                | `[{ "target_object": "companies", "target_record_id": "..." }]`                                         | Target object discovered from attribute definition                                                                                                                                                                                  |
| `url`                                | Inline text input; minimal scheme check                                                | `[{ "value": "https://..." }]`                                                                          |                                                                                                                                                                                                                                     |

Out of V1 (NG2): `multi-select`, `personal-name` (first/last/full-name structured), `location` (address structured), value clearing (sending empty array to delete).

**Tasks are a separate endpoint with a narrower writable surface.** Task updates use `PATCH /v2/tasks/{id}` rather than the generic records-endpoint shape. Per Attio docs, the only writable task fields are `deadline_at`, `is_completed`, the `assignees` workspace-member list, and `linked_records`. Task `content` (title/body) is not writable — it is rendered read-only in task drill-down per FR-040. The request body carries the writable subset directly (no `data.values` wrapper). Verify field names and shapes at build.

**Attribute defs as gatekeeper.** Before showing an edit affordance, the workflow consults the cached attribute definition (FR-031) to confirm: (a) type is in FR-040; (b) `is_archived` is `false`; (c) `is_writable` is `true` and `is_system` is `false`. Read-only system attributes (`created_at`, `record_id`) never receive an edit affordance.
