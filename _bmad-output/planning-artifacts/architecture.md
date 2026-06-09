---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-06-08'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/prd.md
  - _bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/.decision-log.md
  - _bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-alfred-attio-workflow-2026-06-05/.decision-log.md
workflowType: 'architecture'
project_name: 'alfred-attio-workflow'
user_name: 'Florian'
date: '2026-06-05'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (51 FRs, 7 feature groups)**

- **F-A Morning to-do (FR-001 to FR-009)** — `todo` keyword, "due today or undated + assignee=me" scoping, overdue grouping, mark-complete in-place, Quick Look, drill-down. One script entry; one GET + one PATCH; cache invalidation cross-cutting.
- **F-B Universal search (FR-010 to FR-021)** — four keywords (`person`, `company`, `deal`, `task`), substring filter via Attio query DSL, 9 results max, mods ⏎/⌘⏎/⌥⏎/⇧⌥⏎/⇧/→. Multiple entries sharing a client + ScriptFilter rendering layer.
- **F-C Onboarding & auth (FR-022 to FR-029)** — PAT in Alfred's native config sheet, identity probe `/v2/self` cached until token-hash change, FR-029 reserved for V2 OAuth.
- **F-D Workspace customization (FR-030 to FR-033)** — `/v2/objects` + `/v2/objects/{slug}/attributes` schema discovery 24h TTL, lifecycle attribute slug per object via config sheet.
- **F-E Quick Look + drill-down rendering (FR-034 to FR-036)** — HTML fiche to `alfredInfo.cache()`, ScriptFilter sub-list pattern, graceful degradation on missing attribute.
- **F-F Localization (FR-037 to FR-039)** — strings centralized to `{en,fr}.json`, macOS system locale detection, `{name}` placeholder substitution.
- **F-G Field updates (FR-040 to FR-051)** — scalar edit with per-type input UX (text/number/email/phone/date/datetime/select/record-ref/URL), PATCH-in-flight state machine, cross-cutting FR-047 cache invalidation and FR-051 error copy policy.

**Non-Functional Requirements (16 NFRs)**

- **Performance** — single-frame render warm cache, < 2s cold, loading state shown after 300ms; `npm run perf` script run pre-release for measurable baseline.
- **Caching & rate limits** — explicit per-object TTLs (tasks 60s, people 10min, companies 24h, deals 5min, schemas 24h); HTTP 429 backoff with one retry; no background polling; last-writer-wins concurrency.
- **Offline / degraded** — socket failure or 5xx after retry = offline state; mutations gated pre-flight; 401 prompts re-paste in Alfred preferences.
- **Privacy / security** — no telemetry, PAT in Alfred's encrypted env only (never log/cache/diag); Quick Look HTML files scrubbed on refresh and uninstall.
- **i18n** — EN + FR ship in V1; locale auto-detected from macOS; explicit config override available.
- **Distribution** — `semantic-release` pipeline produces `.alfredworkflow` attached to GitHub Releases; no auto-update in V1 (deferred to V2-8); README and `info.plist` description (currently TODO) must be authored before V1.0.0; GitHub Issue labels and templates required.

**Scale & complexity**

- Single user, single Attio workspace per install (multi-workspace is V2, gated on OAuth relay).
- ~10 entry scripts (7 keywords + `attio:diag` + `attio:refresh` + drilldown dispatcher), 1 HTML fiche generator, 4 shared helpers (`notify.ts`, `tz.ts`, `cache.ts`, `strings.ts`), 1 `AttioClient` expanded from read-only to read+write (~10 new methods).
- Public OSS, community distribution, semantic-release CI already wired.
- **Complexity: medium-high.** Constrained surface but deep contracts — F-G's PATCH-in-flight state machine, FR-047 cross-cutting invalidation, the §H type-shape matrix (10 types × payload), and the FR-051 error-copy policy are the local peaks of complexity.
- **Primary domain:** desktop launcher extension (Alfred 5 / macOS) + REST API client + HTML rendering + native macOS notification orchestration.

### Technical Constraints & Dependencies

- **Platform** — Alfred 5 + macOS 13+, JS bundled via esbuild (through `fast-alfred`). No third-party runtime.
- **Framework** — `fast-alfred` v2.1.2: `alfredClient.cache`, `env.getEnv`, `config` (`sindresorhus/conf`), `icons`, `output(ScriptFilter)` including `ScriptFilter.rerun`, `alfredInfo.cache()` / `data()`. **Missing**: no notification primitive — requires `osascript` shell-out wrapped in `src/common/notify.ts`.
- **Attio API** — Bearer token; `/v2/objects/{slug}/records/query` for search; `PATCH /v2/objects/{slug}/records/{id}` or `PATCH /v2/tasks/{id}` depending on object; `POST /v2/notes` requires 5 fields; `GET /v2/self` for identity; rate-limit 429 with `Retry-After`. **PATCH payload shapes need build-time curl-probe verification** (single-select, single record-reference, and text especially).
- **Auth** — PAT-paste only in V1. OAuth V2 requires hosted relay to hold `client_secret`. No secret embedded in the bundle.
- **Distribution** — `semantic-release` + GitHub Actions already in place; `.alfredworkflow` zip format; no auto-update mechanism.
- **Bundled assets** — Inter WOFF2 (SIL OFL), JetBrains Mono (OFL), Lucide icons (ISC) — all OSS-compatible.
- **Brownfield** — `src/main/people.ts` and `src/common/attio/client.ts` exist read-only. Cache constants declared but never consulted. Quick Look currently faked via `web_url`. ~10 client methods to add. Dormant unbound hotkey UID in `info.plist` to remove or bind.

### Cross-Cutting Concerns Identified

- **Cache layer + invalidation contract (FR-047)** — every mutation invalidates `(slug, id)` plus list pages that contained the record. Affects FR-005, FR-016/017, FR-043. Must be co-designed with the API client.
- **Error copy policy (FR-051)** — HTTP status → workflow-rendered string EN/FR, 422 verbatim. Touches every endpoint call site.
- **Schema discovery + caching (FR-030 / FR-031)** — fetched at first run, 24h TTL, gates F-G affordances (FR-049 if fetch failed), drives Quick Look + drill-down field maps, layered by lifecycle config FR-033.
- **Identity resolution + token rotation (FR-025 / FR-026)** — hash on token; invalidate identity + caches on hash change.
- **Localization (FR-037–039 + NFR-012)** — string lookup with `{name}` substitution at every script render; fallback to EN when locale key is missing.
- **Accessibility (DESIGN tokens + EXPERIENCE accessibility floor)** — contrast-verified tokens both modes, semantic HTML in Quick Look, color-independent state signals, `prefers-reduced-motion` + `prefers-color-scheme`.
- **Non-affiliation legal floor** — disclaimer microcopy required in first-run notification, `attio:diag` row 0, README. Not optional.
- **Notification orchestration** — no fast-alfred primitive; `osascript` shell-out through a central helper. Covers FR-051 errors and FR-005/016/017/025/043 successes.
- **Drill-down state machine + PATCH-in-flight (FR-046)** — `ScriptFilter.rerun` polling pattern with a status file under `alfredInfo.cache()`; drill-down argument `pending=<field_slug>` paints spinner.

## Starter Template Evaluation

### Primary Technology Domain

**Desktop launcher extension (Alfred 5 / macOS)** — TypeScript runtime via Node bundled by esbuild, produces ScriptFilter JSON + HTML preview, distributed as `.alfredworkflow` zip via GitHub Releases.

### Starter Options Considered

| Option                                 | Status                             | Verdict                                                                                                                       |
| -------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `fast-alfred` (v2.1.2, npm)            | **Already installed in this repo** | **Selected — incumbent.**                                                                                                     |
| Raw `alfy` / `alfred-launcher`         | Alternative                        | Rejected — older, lower-velocity, no built-in `Conf` integration.                                                             |
| Hand-rolled Node script + manual zip   | Alternative                        | Rejected — `fast-alfred pack` already wires esbuild bundling, info.plist version bump, `.alfredworkflow` artifact production. |
| Swift native (`AlfredWorkflowHandler`) | Alternative                        | Rejected — language switch from existing TypeScript codebase, no benefit for this scope.                                      |

### Selected Starter: `fast-alfred` (incumbent)

**Rationale for Selection:**

- **Already in place.** `package.json` declares `fast-alfred`, `.fast-alfred.config.cjs` exists, `src/main/people.ts` already follows the framework's one-script-per-keyword pattern.
- **Provides the primitives the PRD requires:** TTL cache (`alfredClient.cache.setWithTTL`), Alfred env vars (`env.getEnv`), persistent config (`alfredClient.config` via `sindresorhus/conf`), system icons (`icons.getIcon`), ScriptFilter rendering (`output(ScriptFilter)` with `rerun` field for FR-046), workflow metadata (`alfredInfo.cache()` / `data()` / `workflowVersion()`).
- **Build pipeline already wired:** `fast-alfred pack` builds via esbuild and outputs `.alfredworkflow`. `semantic-release` config in repo invokes pack via exec step and attaches the artifact to GitHub Releases (NFR-013).
- **TypeScript + esbuild scaffold** matches the team's stated stack and the PRD's brownfield reality.

**Initialization Command:**

```bash
# Not applicable — project is already initialized.
# Existing scripts in package.json: build, format, lint already configured.
# For new contributors: git clone + npm install is enough.
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript bundled by esbuild to a single file per Alfred keyword script. No external Node deps at runtime — everything is bundled. Node is invoked via fast-alfred's `run-node.sh` shim shipped inside the workflow.

**Styling Solution:**
N/A for Alfred ScriptFilter (Alfred owns the theme). For Quick Look HTML: hand-authored CSS in inline `<style>` blocks, no framework. **Inter WOFF2 + JetBrains Mono WOFF2 bundled with the workflow** (per DESIGN.md), `@font-face`-loaded in fiche HTML. No CSS preprocessor.

**Build Tooling:**
`fast-alfred pack` (esbuild under the hood) — fast cold builds, no webpack/rollup overhead. Bundle entries declared in `.fast-alfred.config.cjs`'s `bundlerOptions.productionScripts` (default `['src/main/*.ts']`).

**Testing Framework:**
**Not yet configured.** Architecture decision in step-04: pick **vitest** (fast, TS-native, Node-friendly) for unit tests on helpers (`tz.ts`, `cache.ts`, `strings.ts`, the `AttioClient` value-shape encoders). E2E tests on Alfred itself are impractical; pre-release manual QA + the `npm run perf` script (NFR-001/002) take that slot.

**Code Organization:**

- `src/main/*.ts` — one entry per Alfred keyword (`todo`, `person`, `company`, `deal`, `task`, `diag`, `refresh`, `drilldown`).
- `src/common/attio/` — `AttioClient` (read+write), payload encoders per attribute type (`encode-text.ts`, `encode-select.ts`, …).
- `src/common/` — shared helpers: `cache.ts` (invalidation contract), `notify.ts` (`osascript` shell-out), `tz.ts` (system-TZ ↔ UTC), `strings.ts` (locale lookup + `{name}` substitution), `quicklook.ts` (HTML fiche generator).
- `src/strings/{en,fr}.json` — centralized microcopy catalog (per EXPERIENCE.md Voice and Tone section).
- `src/icons/` — Lucide PNG exports per object × state × theme.
- `assets/fonts/` — Inter WOFF2, JetBrains Mono WOFF2.

**Development Experience:**

- `npm run build` → tsc + tsc-alias.
- `npm run lint` → ESLint on `{src,test}/**/*.ts`.
- `npm run format` → Prettier.
- Already configured: commitlint (conventional commits), semantic-release on release branch.
- **To add:** `npm run perf` script (NFR-001/002 timed-invocation baseline pre-release), `npm run test` (vitest).

**Note:** Project is already initialized. The first implementation story is "set up vitest + perf script + add Inter/JetBrains-Mono WOFF2 assets" — not a fresh scaffold.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**

- HTTP client library choice
- PATCH payload encoder pattern (per-type encoders ↔ a single dispatcher)
- Cache invalidation API surface (FR-047 contract)
- Quick Look HTML templating approach
- Validation library (Attio response shape guards)

**Important (shape architecture):**

- Token hash strategy (FR-026 detection — adversarial flagged the diag leak, lock no-display)
- Per-keyword script vs single multiplex dispatcher (`drilldown.ts` already debated in addendum §F)
- Strings module loading strategy (lazy per-call vs preloaded at script entry)
- Error handling pipeline (FR-051 thread-through across client)
- macOS notification queue / dedup (osascript shell-out)

**Deferred (post-V1.0.0):**

- OAuth + hosted relay (V2-3)
- Auto-update channel (V2-8)
- Telemetry opt-in (V2-7)
- Multi-workspace (V2-4)
- Multi-level drill-down (V2-5)

### Data Architecture

**Persistence layers (no DB).**

| Layer                             | Backed by                                         | Lifetime                                        | Contents                                                                                                    |
| --------------------------------- | ------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Alfred env var                    | Alfred encrypted preferences                      | until user re-pastes                            | PAT, lifecycle attribute slugs, language override                                                           |
| `alfredClient.config` (Conf JSON) | `~/Library/Preferences/<bundle>.json` (plaintext) | until `attio:refresh` or workflow update        | Cached workspace ID/slug/name, "me" workspace member ID, PAT-value SHA-256 (in-memory only — never written) |
| `alfredClient.cache` (TTL JSON)   | `~/Library/Caches/<bundle>/`                      | per-key TTL (NFR-004)                           | Record lists, individual records, attribute schemas                                                         |
| `alfredInfo.cache()` files        | same cache dir                                    | scrubbed on `attio:refresh` and workflow update | Quick Look HTML fiches, PATCH worker status files                                                           |

**Cache invalidation contract (FR-047) — concrete shape:**

```ts
// src/common/cache.ts
class Cache {
  setRecord(slug, id, value): void // canonical record cache write
  invalidateRecord(slug, id): void // wipes record + any list pages containing it
  invalidateListsContaining(slug, id): void // helper called by invalidateRecord
  getRecord(slug, id): T | undefined
  // list cache keyed by (slug, query_hash) → list of (record_id, snapshot_at)
}
```

Every mutation (FR-005, FR-016/017, FR-043) calls `invalidateRecord` before the post-mutation re-fetch.

**Validation / Attio response shapes — Decision: zod.** Centralized in `src/common/attio/schemas.ts`. Bundle cost (~12kb minified) acceptable for OSS workflow; payoff is catching Attio API drift early. Validate on every response, throw to the FR-051 error layer on mismatch. Alternatives considered: typebox (lighter, JSON-Schema-compatible), hand-rolled type guards (zero deps, bug-prone on Attio changes).

### Authentication & Security

**Token rotation detection (FR-026):** SHA-256 of PAT value, computed in-memory only at every script invocation. The hash is compared to a previously-cached hash; on mismatch, the cached identity is invalidated. **No hash bytes ever written to disk, logged, or displayed** (per adversarial review on `attio:diag` row 3).

**HTTP authorization:** `Authorization: Bearer ${PAT}` header set inside `AttioClient.fetch` — never threaded through other layers, never logged in error paths (FR-051 errors say "Token invalid" not the actual value).

**Permission scope enforcement (FR-050):** PATCH returning 403 marks the field-key in an in-memory `Set<string>` for the script process lifetime. Drill-down rendering reads this set; matching fields render with the "read-only — token lacks write scope" hint instead of an edit affordance. The set is process-scoped (each Alfred invocation spawns a fresh process), so a token-scope upgrade is reflected on the next invocation.

### API & Communication Patterns

**HTTP client — Decision: native `fetch` (Node 22+).** No axios, no got. Node 22 is current LTS baseline by 2026; `fetch` is stable, zero deps, bundle size win. Wrapped in `AttioClient` with retry + backoff (NFR-005), error policy threading (FR-051).

**`AttioClient` shape:**

- `getSelf()` — identity
- `listObjects()`, `getObjectAttributes(slug)` — schema
- `queryRecords(slug, body)`, `getRecord(slug, id)` — search / get
- `patchRecord(slug, id, payload)`, `patchTask(id, payload)` — write
- `createNote(parent_object, parent_record_id, title, content)` — note
- `listWorkspaceMembers()`, `listTasks(filter)` — auxiliaries
- Internal `fetch(method, path, body?)` with 429 + 5xx retry logic and FR-051 error mapping.

**Per-type PATCH payload encoder pattern:**

```ts
// src/common/attio/encoders/
interface Encoder<T> {
  type: 'text' | 'number' | 'currency' | ...;
  encode(value: T, attrDef: AttributeDefinition): Record<string, unknown>;
}
const encoders: Encoder<unknown>[] = [TextEncoder, NumberEncoder, CurrencyEncoder, ...];
function encodeForPatch(attrSlug, value, attrDef) {
  return encoders.find(e => e.type === attrDef.type).encode(value, attrDef);
}
```

Each encoder lives in its own file (`encode-text.ts`, `encode-select.ts`, `encode-record-ref.ts`, …). Build-time curl-probe (addendum §F item 15) verifies each shape against the live API before V1 freeze; if a shape diverges, fix the encoder only — no caller-side changes.

**Error pipeline:** every `AttioClient` method returns either `{ ok: true, data }` or `{ ok: false, error: WorkflowError }`. `WorkflowError` carries `kind` (`'auth-invalid'` / `'auth-scope-missing'` / `'record-not-found'` / `'validation'` / `'rate-limit'` / `'unreachable'` / `'unknown'`), `httpStatus`, `attioMessage?` (verbatim for 422). Callers map `kind` to the FR-051 microcopy keys.

**Rate limit / 429 (NFR-005):** in `AttioClient.fetch` — on 429, read `Retry-After`, sleep, retry once. Second 429 → return `{ ok: false, error: { kind: 'rate-limit', retryAfter } }`. Caller renders the "rate-limit reached — try again in {N}s" microcopy.

### Frontend (Quick Look HTML + Alfred ScriptFilter rendering)

**ScriptFilter rendering:** plain object literal → `alfredClient.output(filter)`. No abstraction layer; the JSON is the contract.

**Quick Look HTML templating — Decision: tagged template literals.** A small `html` helper in `src/common/quicklook.ts` that XSS-escapes interpolations by default:

```ts
const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((acc, s, i) => acc + s + (i < values.length ? escapeHtml(String(values[i])) : ''), '')
```

No React, no lit-html, no mustache — overkill for ~6 fiche layouts that don't share interactivity. Quick Look is static HTML rendered to `alfredInfo.cache()`.

**CSS strategy:** inline `<style>` in the generated HTML, using DESIGN.md tokens directly. Single `getStyles(mode: 'auto' | 'light' | 'dark')` function in `quicklook.ts`. `@media (prefers-color-scheme: dark)` covers the auto case.

**Font asset loading:** WOFF2 files in `assets/fonts/`, packaged in `.alfredworkflow`. The fiche `@font-face` rules use **`file://`** absolute paths to `alfredInfo.bundleDir() + '/fonts/Inter.woff2'`. Base64 inline rejected (~150kb × 2 per fiche × N records previewed = cache bloat).

**Dark / light mode:**

- **Quick Look:** `@media (prefers-color-scheme: dark)` swaps token values. Single HTML file works for both.
- **Alfred bar:** icon directory swap via Alfred's `@dark` filename convention. Lock convention at build (addendum §F item 1 already flagged this).

### Infrastructure & Deployment

**Hosting:** none. The workflow runs entirely on the user's Mac. V2 OAuth relay would introduce hosting (Cloudflare Worker recommended for zero per-request cost) but is out of V1 scope.

**CI / CD:** existing `semantic-release` pipeline + GitHub Actions. Pre-V1.0.0 additions:

- Job `test`: `npm run test` (vitest) on push to any branch.
- Job `perf-baseline`: `npm run perf` on release branch, output recorded in release notes.
- Job `lint`: ESLint + Prettier check.
- Job `bundle-check`: verify `fast-alfred pack` produces the expected `.alfredworkflow` artifact and its size has not regressed beyond N%.

**Environment configuration:** Alfred's native `userconfigurationconfig` blocks declared in `info.plist`:

- `API_KEY` (secure textfield) — PAT.
- `LANGUAGE_OVERRIDE` (text, optional) — `en` or `fr` (otherwise auto from system locale).
- `LIFECYCLE_ATTRIBUTE_PERSON`, `LIFECYCLE_ATTRIBUTE_COMPANY`, `LIFECYCLE_ATTRIBUTE_DEAL` (text, optional).
- `DIAG_INCLUDE_IDENTITY` (checkbox, default true) — controls `attio:diag` row 2 visibility.

**Monitoring / logging:** none remote (NFR-009). Local: `alfredClient.log()` to Alfred debug log only when Alfred debug mode is enabled by the user. PAT never appears in any log call.

**Versioning:** `semantic-release` from conventional commits already wired. `info.plist`'s workflow version is updated by `fast-alfred pack --target-version` during the release exec step. SemVer applies: `feat` → minor, `fix` → patch, BREAKING CHANGE → major.

### Decision Impact Analysis

**Implementation sequence (suggested):**

1. Foundation helpers — `cache.ts` (invalidation contract), `tz.ts`, `notify.ts` (osascript), `strings.ts` (locale lookup + `{name}` substitution).
2. `AttioClient` expansion — start with `getSelf` (FR-025), `listObjects` / `getObjectAttributes` (FR-030/031), then `queryRecords` (search), `patchRecord` + per-type encoders + zod schemas, then `patchTask`, `createNote`.
3. Keyword scripts in order of dependency: `attio:diag` and `attio:refresh` first (no schema dep), then `todo` (depends on identity + task endpoints), then `person` / `company` / `deal` / `task` search, then `drilldown.ts` (depends on everything), and finally the Quick Look HTML generator (last to land because the visual polish work).
4. Strings module + EN / FR catalogs in parallel with each keyword script.
5. Inter / JetBrains Mono WOFF2 assets + Lucide icon PNGs at the start (block visual work otherwise).
6. `npm run perf` script + vitest setup at the start (block CI changes otherwise).

**Cross-component dependencies:**

- Every keyword script depends on `strings` + `AttioClient`.
- `AttioClient` depends on `cache` for read / write paths.
- F-G edit-row scripts depend on `tz` (datetime), encoders (per-type), and `notify` (success / failure).
- Quick Look HTML generator depends on `strings` (i18n labels), DESIGN.md tokens (inline CSS), and the cached record (no live fetch).
- Status file convention (FR-046) couples `drilldown.ts` and `AttioClient.patchRecord` — must be agreed early.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points identified:** 8 areas where multiple AI-agent implementations could diverge — naming (files / symbols / strings keys), error-handling shape, async-result wrapping, cache-key derivation, ScriptFilter row composition, microcopy interpolation, encoder dispatch, log call sites.

### Naming Patterns

**File naming.** Single-word lowercase for existing files (`client.ts`, `people.ts`). Multi-word files use **kebab-case** (`encode-text.ts`, `attio-error.ts`, `tz.ts`). One purpose per file; no `utils.ts` catch-alls.

**Code naming.**

- **Variables / functions**: `camelCase` (`patchRecord`, `workspaceMemberId`, `cmdEnterHintDismissed`).
- **Types / interfaces / classes**: `PascalCase` (`AttioClient`, `WorkflowError`, `AttributeDefinition`). Prefix `T` only for generics (`<TValue>`), never on regular types.
- **Constants**: `UPPER_SNAKE_CASE` (`API_BASE_URL`, `DEFAULT_RESULT_LIMIT`). Per-file local constants OK; cross-file constants live in `src/common/constants.ts`.
- **String catalog keys**: dot-notation, lowercase nouns (`setup.title`, `setup.subtitle`, `errors.token-invalid`, `success.task-completed`). Never camelCase keys in JSON. Allows file-grep auditing.

**Attio object slugs and attribute slugs**: kept verbatim from Attio (snake_case as Attio uses). Never re-cased.

**Branch / commit conventions**: existing `commitlint.config.cjs` enforces Conventional Commits (`feat:`, `fix:`, `chore:`, etc.). Scope optional. Branch names: `feat/<topic>`, `fix/<topic>`.

### Structure Patterns

**Project organization.**

```
src/
  main/                  one entry per Alfred keyword script
    todo.ts
    person.ts
    company.ts
    deal.ts
    task.ts
    drilldown.ts
    diag.ts
    refresh.ts
  common/
    attio/
      client.ts          AttioClient (read + write)
      schemas.ts         zod schemas for response validation
      encoders/          one file per attribute type
        encode-text.ts
        encode-select.ts
        encode-record-ref.ts
        …
        index.ts         dispatch via encoders array
    cache.ts             FR-047 invalidation contract
    notify.ts            osascript shell-out
    tz.ts                system-TZ ↔ UTC
    strings.ts           locale resolver + {name} interpolation
    quicklook.ts         tagged-template html + getStyles + render
    error.ts             WorkflowError discriminated union + helpers
    constants.ts         shared constants
  strings/
    en.json
    fr.json
  models/                .gitkeep — empty until V2 introduces persistence types
  services/              .gitkeep — empty (no service-layer split in V1)
assets/
  fonts/
    Inter.woff2
    Inter-Display.woff2
    JetBrainsMono.woff2
  icons/                 Lucide PNG exports, structured per the DESIGN.md mapping
    person.png
    person@dark.png
    person@2x.png
    person@2x@dark.png
    …
test/                    mirrors src/ tree; one .test.ts per source file
```

**Tests:** co-located by **mirror directory** (not co-located by file). `src/common/tz.ts` → `test/common/tz.test.ts`. Why: keeps `src/` clean for the bundler (no `.test.ts` glob exclusion needed).

**Helpers vs services:** V1 has no service layer. If a piece of code needs > 1 helper to do its work, it lives next to the script that owns it, not in a "services" directory.

### Format Patterns

**Result wrapping.** Every async operation that can fail returns a discriminated union:

```ts
type Result<T, E = WorkflowError> = { ok: true; data: T } | { ok: false; error: E }
```

Used everywhere from `AttioClient` to `cache` to `notify`. **No throwing for control flow.** Throwing is reserved for programmer errors (zod validation failure, type contract breach). Callers `if (!result.ok)` and route through FR-051 microcopy.

**WorkflowError shape:**

```ts
type WorkflowError =
  | { kind: 'auth-invalid'; httpStatus: 401 }
  | { kind: 'auth-scope-missing'; httpStatus: 403; fieldSlug?: string }
  | { kind: 'record-not-found'; httpStatus: 404; slug: string; id: string }
  | { kind: 'validation'; httpStatus: 422; attioMessage: string; fieldSlug?: string }
  | { kind: 'rate-limit'; httpStatus: 429; retryAfter: number }
  | { kind: 'unreachable'; cause?: 'socket' | 'http-5xx' }
  | { kind: 'unknown'; httpStatus?: number; raw?: string }
```

`kind` → FR-051 string key directly: `errors.auth-invalid`, `errors.auth-scope-missing`, `errors.record-not-found`, `errors.validation` (with `{attioMessage}` interpolation), etc.

**Date / time formats.**

- **Storage / API**: UTC ISO 8601 (`2026-07-15T12:30:00Z`).
- **Display**: system-TZ via `Intl.DateTimeFormat` with `'short'` for date, `'short'` for time, joined with a space (`2026-07-15 14:30`). Centralized in `tz.ts`.
- **Input parse**: `YYYY-MM-DD` for date, `YYYY-MM-DDTHH:MM` for datetime; strict parsing.

**JSON shape.**

- **Internal types**: `camelCase` properties (`workspaceMemberId`, not `workspace_member_id`).
- **Wire types** (DTOs from Attio): keep Attio's `snake_case`. Conversion happens in the zod-schema `.transform()` step on parse.

**Boolean naming**: positive phrasing (`isCompleted`, `hasWriteScope`, `cmdEnterHintDismissed`). Never `isNotX` or `disabledX`.

### Communication Patterns

**ScriptFilter row composition.** Every row goes through a single builder helper so icon / title / subtitle / mod-text shape is uniform:

```ts
// src/common/script-filter.ts
function row(opts: {
  title: string
  subtitle?: string
  icon: IconKey
  arg: string
  quicklookurl?: string
  mods?: Partial<Record<'cmd' | 'alt' | 'shift', { title?: string; subtitle?: string; arg?: string }>>
}): AlfredItem
```

No keyword script constructs `AlfredItem` literals directly. Forces consistency on icon lookups, title truncation, mod-text register.

**Logging.**

- `alfredClient.log(message)` only. No `console.log`, no third-party logger.
- Format: `[<keyword>] <ISO-timestamp> <message>` so debug logs are greppable per keyword.
- **Never** include PAT, full record content, or full URLs with record IDs. Endpoint patterns with `<redacted>` IDs are OK.

**Microcopy interpolation.** Always through `strings.t(key, params?)`:

```ts
strings.t('errors.token-invalid') // → string
strings.t('success.field-updated', { field: 'Stage', value: 'Negotiation' })
```

`t()` resolves locale (system or override), looks up key, substitutes `{name}` placeholders, falls back to EN on miss with `alfredClient.log` warning. No inline string concatenation.

### Process Patterns

**Error handling.** Every keyword script entry is wrapped:

```ts
;(async () => {
  try {
    const result = await main(alfredClient)
    if (!result.ok) {
      alfredClient.output(errorRow(result.error)) // single-row error
      await notify.error(strings.t(`errors.${result.error.kind}`, result.error))
    }
  } catch (e) {
    alfredClient.log(`[unhandled] ${e?.stack ?? e}`)
    alfredClient.output(errorRow({ kind: 'unknown' }))
  }
})()
```

No uncaught promise rejections reach Alfred.

**Loading state (FR-046 / NFR-003).** Pattern is consistent across keywords:

1. Script starts a `setTimeout(300ms)` race with the main work.
2. If 300ms elapses first, the script emits a one-row loading state with `rerun: 0.3`.
3. The script's "main work" writes a status file under `alfredInfo.cache()/_status/<request_id>.json`.
4. On rerun, the script reads the status file; if `done`, it renders results; if `pending`, it re-emits the loading row.

The status-file convention is centralized in `src/common/status.ts` so every keyword uses the same shape.

**Cache key derivation.** Always through `cache.key(...)`:

```ts
cache.key('record', slug, id) // record cache
cache.key('list', slug, queryHashOfFilter) // list page cache
cache.key('schema', 'objects') // workspace objects
cache.key('schema', 'attributes', slug) // attributes for one object
cache.key('identity') // workspace + me
```

No inline string-concatenated keys. Test invariant: `cache.key` output is stable across calls with the same args.

**Token-rotation detection.** Every keyword script calls `auth.assertCurrent(alfredClient)` as its first await. The function: reads PAT, hashes it (in-memory), compares to the cached hash from `alfredClient.config`. On mismatch: invalidates identity cache + record cache, re-probes `/v2/self`, updates the cached hash. Process-scoped — no cross-invocation state.

**Notification dedup.** `notify.ts` does not dedup; rapid-fire mutations may emit multiple notifications. This matches NFR-006a "last-writer-wins" stance. If dedup becomes needed (V2), it's added at `notify.ts` not at call sites.

### Enforcement Guidelines

**All AI agents MUST:**

- Use `Result<T, WorkflowError>` for async paths that can fail. Throwing is reserved for programmer errors.
- Use `strings.t(key, params?)` for every user-visible string. Never inline literals.
- Use `cache.key(...)` for every cache read / write. Never inline keys.
- Use `row(...)` from `script-filter.ts` for every Alfred row. Never literal `AlfredItem`.
- Run every Attio response through a zod schema. Never trust the wire shape.
- Centralize new constants in `src/common/constants.ts` if reused across files.
- Add `<file>.test.ts` to `test/<mirror>/` for every helper introduced.
- Conventional commits (existing `commitlint`). Imperative-mood subjects.

**Pattern enforcement:**

- ESLint configured to flag `console.log`, inline date constructors outside `tz.ts`, direct `fetch` outside `client.ts`.
- ESLint custom rule `no-inline-strings-in-output` (lint-only, doesn't block builds in V1) flags candidates for `strings.t(...)` migration.
- Vitest coverage minimum on helpers (`tz`, `cache`, `strings`, `encoders/*`) — start at 70% lines, raise to 85% pre-V1.0.0.
- Pre-commit hook (Husky + lint-staged): Prettier + ESLint on staged files.
- CI: `npm run lint && npm run test && npm run build` blocking.

### Pattern Examples

**Good — error path:**

```ts
const result = await client.patchRecord('deals', dealId, { stage: 'Negotiation' });
if (!result.ok) {
  await notify.error(strings.t(`errors.${result.error.kind}`, result.error));
  return errorRow(result.error);
}
cache.invalidateRecord('deals', dealId);
await notify.success(strings.t('success.field-updated', { field: strings.t('fields.stage'), value: 'Negotiation' }));
```

**Anti-pattern — throwing for control flow:**

```ts
// DON'T
try {
  await client.patchRecord('deals', dealId, payload)
} catch (e) {
  if (e.status === 403) showHint() // wrong: status leaking from internals
  throw e // wrong: propagates to Alfred as opaque error
}
```

**Good — microcopy:**

```ts
strings.t('errors.rate-limit', { N: retryAfter })
```

**Anti-pattern — inline:**

```ts
// DON'T
output({ title: `Rate-limit reached — try again in ${seconds}s` })
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
alfred-attio-workflow/
├── README.md                          NFR-014 — install, scopes, troubleshooting, license, non-affiliation
├── LICENSE                            MIT (default per addendum §G)
├── CONTRIBUTING.md                    existing — Conventional Commits, PR template, code-of-conduct ref
├── package.json                       npm scripts, fast-alfred dep, vitest, zod
├── package-lock.json
├── tsconfig.json                      TS config (existing)
├── reset.d.ts                         existing — strict null/index check overrides
├── commitlint.config.cjs              existing
├── eslint.config.mjs                  ESLint flat config (to add — rules from §Enforcement Guidelines)
├── .prettierrc                        existing
├── .gitignore                         existing
├── .fast-alfred.config.cjs            existing — bundler entries, info.plist meta
├── .releaserc                         existing — semantic-release config
├── .husky/                            pre-commit hooks (to add via setup-pre-commit)
│   └── pre-commit
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     lint + test + build on push
│   │   └── release.yml                semantic-release on main
│   ├── ISSUE_TEMPLATE/                NFR-016
│   │   ├── bug.md
│   │   ├── feature.md
│   │   ├── setup-failure.md
│   │   └── api-change.md
│   └── PULL_REQUEST_TEMPLATE.md
├── info.plist                         Alfred workflow manifest (existing, to update)
├── src/
│   ├── main/                          one entry per Alfred keyword script (FR-001..046)
│   │   ├── todo.ts                    F-A — UJ-1 anchor
│   │   ├── person.ts                  F-B — search persons (also handles ⌥⏎ note creation)
│   │   ├── company.ts                 F-B — search companies
│   │   ├── deal.ts                    F-B — search deals
│   │   ├── task.ts                    F-B — search tasks
│   │   ├── drilldown.ts               F-E + F-G — single dispatcher (drill-down + field edit + sub-search)
│   │   ├── diag.ts                    `attio:diag` (FR-028)
│   │   └── refresh.ts                 `attio:refresh` (FR-032)
│   ├── common/
│   │   ├── attio/
│   │   │   ├── client.ts              AttioClient — read + write, NFR-005 retry, FR-051 error mapping
│   │   │   ├── schemas.ts             zod schemas — workspace, member, object, attribute, record, task, note
│   │   │   ├── identity.ts            FR-025 — /v2/self probe + identity caching
│   │   │   └── encoders/              FR-040..046 — per-type PATCH payload encoders
│   │   │       ├── encode-text.ts
│   │   │       ├── encode-number.ts
│   │   │       ├── encode-currency.ts
│   │   │       ├── encode-email.ts
│   │   │       ├── encode-phone.ts
│   │   │       ├── encode-date.ts
│   │   │       ├── encode-datetime.ts     uses tz.ts
│   │   │       ├── encode-select.ts
│   │   │       ├── encode-record-ref.ts
│   │   │       ├── encode-url.ts
│   │   │       └── index.ts               dispatch table + `encodeForPatch`
│   │   ├── cache.ts                   FR-047 — invalidation contract, key derivation
│   │   ├── auth.ts                    PAT-hash detection + token-rotation invalidation (FR-026)
│   │   ├── notify.ts                  macOS notification via `osascript` shell-out
│   │   ├── tz.ts                      system-TZ ↔ UTC for FR-042 datetime
│   │   ├── strings.ts                 locale resolution + `{name}` interpolation (FR-037..039)
│   │   ├── quicklook.ts               HTML `html` tagged template + `getStyles` + per-object fiche renderers
│   │   ├── script-filter.ts           `row()` builder for AlfredItem composition
│   │   ├── status.ts                  FR-046 status file convention (PATCH-in-flight worker)
│   │   ├── error.ts                   WorkflowError type + `errorRow` helper
│   │   └── constants.ts               API_BASE_URL, DEFAULT_RESULT_LIMIT, TTLs, icon keys
│   ├── strings/
│   │   ├── en.json                    EN catalog (anchors EXPERIENCE.md microcopy)
│   │   └── fr.json                    FR catalog (same key shape)
│   ├── models/                        empty (.gitkeep) — V2 persistence types land here
│   └── services/                      empty (.gitkeep) — V1 has no service layer
├── assets/
│   ├── fonts/
│   │   ├── Inter.woff2                bundled (SIL OFL)
│   │   ├── Inter-Display.woff2        bundled (SIL OFL)
│   │   └── JetBrainsMono.woff2        bundled (SIL OFL)
│   └── icons/                         Lucide PNG exports per DESIGN.md mapping
│       ├── person.png        person@2x.png        person@dark.png        person@2x@dark.png
│       ├── company.png       company@2x.png       company@dark.png       company@2x@dark.png
│       ├── deal.png          deal@2x.png          deal@dark.png          deal@2x@dark.png
│       ├── task.png          task@2x.png          task@dark.png          task@2x@dark.png
│       ├── task-completed.png task-completed@2x.png task-completed@dark.png task-completed@2x@dark.png
│       ├── task-error.png    …                    (same family)
│       ├── info.png          (setup prompt)
│       ├── sync.png          (loading state)
│       ├── error.png         (FR-051 error rows)
│       ├── success.png       (notification icon hint, not a row icon)
│       └── warning.png       (offline state)
├── test/                              mirrors src/ tree; one .test.ts per source file
│   ├── common/
│   │   ├── attio/
│   │   │   ├── client.test.ts
│   │   │   ├── schemas.test.ts
│   │   │   ├── identity.test.ts
│   │   │   └── encoders/
│   │   │       ├── encode-text.test.ts
│   │   │       ├── encode-datetime.test.ts    (covers tz round-trip)
│   │   │       └── …                          (one per encoder)
│   │   ├── cache.test.ts
│   │   ├── auth.test.ts
│   │   ├── tz.test.ts
│   │   ├── strings.test.ts                    (placeholder substitution, fallback)
│   │   ├── quicklook.test.ts                  (XSS escape, dark mode CSS)
│   │   ├── script-filter.test.ts
│   │   ├── status.test.ts
│   │   ├── error.test.ts
│   │   └── notify.test.ts                     (mock osascript spawn)
│   └── fixtures/
│       ├── attio-self.json                    sample /v2/self response
│       ├── attio-records-people.json
│       ├── attio-records-deals.json
│       ├── attio-attributes-deals.json        attribute defs for shape-encoder tests
│       └── attio-error-422.json
├── scripts/
│   ├── perf.mjs                       NFR-001/002 — N invocations timed, output to release notes
│   └── verify-attio-shapes.mjs        addendum §F item 15 — curl-probe each encoder type against a fixture workspace
├── esbuild/                           output dir (existing, gitignored)
├── dist/                              tsc output (existing, gitignored)
└── *.alfredworkflow                   `fast-alfred pack` output (gitignored, attached to GitHub Releases)
```

### Architectural Boundaries

**External boundaries (workflow ↔ outside world):**

| Boundary                       | Direction     | Protocol                                                 | Where in code                                                                 |
| ------------------------------ | ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ↔ Attio REST API              | bidirectional | HTTPS + Bearer token                                     | `src/common/attio/client.ts` — the only file that calls `fetch` against Attio |
| ↔ macOS Notification Center   | outbound      | `osascript` spawn                                        | `src/common/notify.ts` — the only file that spawns child processes            |
| ↔ macOS system clock / locale | inbound       | `Intl.*` APIs                                            | `src/common/tz.ts` (clock + TZ), `src/common/strings.ts` (locale detection)   |
| ↔ Alfred (env vars + config)  | inbound       | `alfredClient.env.getEnv` + `alfredClient.config`        | every keyword script (read-only); `auth.ts` writes hash                       |
| ↔ Alfred (Quick Look pane)    | outbound      | HTML file in `alfredInfo.cache()` + `quicklookurl` field | `src/common/quicklook.ts` writes files; `script-filter.ts` references them    |
| ↔ filesystem (cache dir)      | bidirectional | Node `fs`                                                | only `cache.ts` and `status.ts` and `quicklook.ts`; nowhere else              |

**Internal boundaries (within `src/`):**

| From                         | To                                                                                                                                                   | Allowed | Forbidden                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `main/*.ts`                  | `common/attio/client.ts`, `common/cache.ts`, `common/strings.ts`, `common/notify.ts`, `common/script-filter.ts`, `common/error.ts`, `common/auth.ts` | yes     | direct `fetch`, inline strings, inline cache keys, raw `AlfredItem` literals |
| `common/attio/client.ts`     | `common/attio/schemas.ts`, `common/attio/encoders/`, `common/cache.ts`, `common/error.ts`, `common/constants.ts`                                     | yes     | direct file IO, direct notification calls                                    |
| `common/attio/encoders/*.ts` | `common/tz.ts` (datetime only), `common/error.ts`                                                                                                    | yes     | `fetch`, cache access, strings                                               |
| `common/quicklook.ts`        | `common/strings.ts` (labels), `common/tz.ts` (display dates), DESIGN.md tokens (inlined via `getStyles`)                                             | yes     | `fetch`, cache writes (other than its own HTML files), encoders              |
| `common/cache.ts`            | `alfredClient.cache`, filesystem under `alfredInfo.cache()`                                                                                          | yes     | `fetch`, network access                                                      |

The above is enforced lint-side via ESLint `no-restricted-imports`. Violations are blocking.

### Requirements to Structure Mapping

| Feature group                                           | Primary files                                                                                                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-A Morning to-do** (FR-001..009)                     | `src/main/todo.ts`, `src/common/attio/client.ts::listTasks/patchTask`, `src/common/strings.ts` keys `todo.*` and `success.task-completed`                                                             |
| **F-B Universal search** (FR-010..021)                  | `src/main/{person,company,deal,task}.ts`, `client.ts::queryRecords/createNote`, `strings.ts` keys `search.*`                                                                                          |
| **F-C Onboarding & auth** (FR-022..029)                 | `src/main/diag.ts` (FR-028), `src/common/auth.ts` (FR-026), `src/common/attio/identity.ts` (FR-025), `info.plist` (`API_KEY` + `userconfigurationconfig`), `README.md` (FR-022/023 setup walkthrough) |
| **F-D Workspace customization** (FR-030..033)           | `src/common/attio/client.ts::listObjects/getObjectAttributes`, `cache.ts` schema cache keys, `info.plist` (`LIFECYCLE_ATTRIBUTE_*`)                                                                   |
| **F-E Quick Look + drill-down rendering** (FR-034..036) | `src/common/quicklook.ts` (Quick Look HTML), `src/main/drilldown.ts` (drill-down ScriptFilter)                                                                                                        |
| **F-F Localization** (FR-037..039)                      | `src/common/strings.ts`, `src/strings/{en,fr}.json`                                                                                                                                                   |
| **F-G Field updates** (FR-040..051)                     | `src/main/drilldown.ts` (dispatcher), `src/common/attio/encoders/*.ts` (per-type), `src/common/attio/client.ts::patchRecord`, `src/common/status.ts` (FR-046), `src/common/error.ts` (FR-051)         |

### Integration Points

**Internal communication.** None — V1 is a collection of short-lived script invocations. Each Alfred summon spawns a fresh Node process; no shared memory, no IPC. The "shared state" lives in `alfredClient.cache` (file-backed JSON), `alfredClient.config` (Conf JSON), and HTML files under `alfredInfo.cache()`. Concurrency model is filesystem last-writer-wins (NFR-006a).

**External integrations.**

| System                    | Purpose                                                                                     | Touch point                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Attio REST API            | All record, schema, identity, task, and note operations                                     | `src/common/attio/client.ts`                                                            |
| macOS Notification Center | All FR-005 / FR-016 / FR-017 / FR-025 / FR-043 / FR-051 user-facing notifications           | `src/common/notify.ts`                                                                  |
| macOS default browser     | FR-023 (open README setup anchor), FR-014 (open record in Attio), FR-015 (LinkedIn/website) | inline `child_process.spawn('open', [url])` calls in `script-filter.ts::openUrl` helper |
| Alfred Quick Look pane    | FR-018/034 fiche preview                                                                    | `quicklookurl` field on Alfred rows pointing at HTML files                              |
| GitHub Releases           | Distribution (NFR-013)                                                                      | `semantic-release` pipeline — no runtime dependency                                     |

**Data flow (high level).**

```
Alfred summon
  → script entry (e.g. todo.ts)
  → auth.assertCurrent (PAT hash check, identity probe if cold)
  → cache.getRecord/getList (HIT? render. MISS? fetch.)
  → client.fetch (with retry, error mapping)
  → schemas.parse (zod)
  → cache.setRecord/setList
  → script-filter.row(...) × N → alfredClient.output
  ↓
  (user picks a row)
  ↓
  Alfred re-invokes a different script (drilldown.ts) with arg
  ↓ (same flow — fresh process)
```

For a mutation (FR-005 / 016 / 017 / 043) the leg is:

```
… → client.patchRecord (with encoder dispatch)
  → schemas.parse on response
  → cache.invalidateRecord
  → notify.success(strings.t('success.field-updated', { … }))
  → re-output the refreshed drill-down
```

### File Organization Patterns

- **Configuration files** live at the repo root (`tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `commitlint.config.cjs`, `.fast-alfred.config.cjs`, `.releaserc`, `package.json`). No nested `config/` directory.
- **Source organization**: feature → file mapping above; no "feature folders" — V1 is too small to justify nesting under `src/main/`.
- **Test organization**: mirror tree under `test/`; fixtures under `test/fixtures/`; no `__tests__` directories.
- **Asset organization**: `assets/fonts/` and `assets/icons/` referenced from build output via `file://` paths to `alfredInfo.bundleDir()`.
- **Documentation**: `README.md` is the user-facing surface (per NFR-014); engineering notes stay in `_bmad-output/planning-artifacts/` per BMad convention.

### Development Workflow Integration

**Development server structure.** None — Alfred workflows have no dev server. Iteration loop: `npm run build` → manual Alfred summon → observe output. `fast-alfred` does not provide a hot-reload watcher; rebuild on save is the manual loop.

**Build process structure.** `npm run build` invokes `tsc` + `tsc-alias`. `fast-alfred pack` bundles via esbuild (one bundle per `src/main/*.ts`) and produces `<version>.alfredworkflow`. The pack step updates `info.plist`'s version field via `--target-version`.

**Deployment structure.** `semantic-release` on `main` branch tags + builds + attaches the `.alfredworkflow` artifact to a GitHub Release. Release notes pull from conventional commit messages plus the `npm run perf` output (NFR-001/002). Users download and double-click; Alfred installs.

## Architecture Validation Results

### Coherence Validation

**Decision compatibility.** Tech stack is coherent and conflict-free: TypeScript (existing) + esbuild via fast-alfred 2.1.2 (existing) + Node 22 LTS runtime + zod for response validation + native `fetch` + vitest for tests. No version conflicts (zod and vitest unconstrained, latest stable applies). Patterns (`Result<T, E>`, tagged template HTML, Conf-backed config) are idiomatic for this stack. The PAT-V1 / OAuth-V2 split, the single-level drill-down decision, and the single-accent visual register all hold together; nothing in §Core Architectural Decisions contradicts §Implementation Patterns or §Project Structure.

**Pattern consistency.** Naming conventions (camelCase code / UPPER_SNAKE constants / kebab-case multi-word files / dot.notation string keys) are applied uniformly in the file tree. The `Result<T, E>` wrapping carries through every async boundary (client, cache, notify). The `row(...)` builder centralizes ScriptFilter composition; `strings.t(...)` centralizes microcopy; `cache.key(...)` centralizes cache keys. No pattern is asserted without an enforcement mechanism (ESLint rules or vitest invariants).

**Structure alignment.** The complete directory tree supports the architectural decisions: `src/common/attio/` isolates the API client + zod schemas + encoders; `src/strings/` isolates i18n; `assets/fonts/` + `assets/icons/` carry the bundled visual assets. `test/` mirrors `src/` 1:1 so vitest can discover symmetrically. Internal-boundary table in §Architectural Boundaries names what each file may import and what is forbidden, enforced via ESLint `no-restricted-imports`.

### Requirements Coverage Validation

**Functional requirements (51 FRs) coverage.** Every FR has a primary file in §Requirements to Structure Mapping. Spot-check:

- FR-005 (mark task complete) → `todo.ts` + `client.patchTask` + `cache.invalidateRecord` + `notify.success` ✓
- FR-022 / 023 (setup prompt + README) → `info.plist` `userconfigurationconfig` + `README.md` PAT section ✓
- FR-025 (`/v2/self`) → `src/common/attio/identity.ts` ✓
- FR-031 (24h schema cache) → `cache.ts` schema key + TTL constant ✓
- FR-042 (per-type input UX) → `drilldown.ts` dispatcher + `encoders/*` per-type ✓
- FR-046 (PATCH-in-flight spinner) → `status.ts` status-file convention + `drilldown.ts` `rerun` ✓
- FR-047 (cross-cutting cache invalidation) → `cache.ts::invalidateRecord` + call-site discipline ✓
- FR-051 (error copy policy) → `error.ts::WorkflowError` + `strings.t('errors.*')` ✓

**Non-functional requirements (16 NFRs + NFR-006a) coverage.**

- NFR-001/002 (perf budgets) → `scripts/perf.mjs` measurement, no inline thresholds ✓
- NFR-004 (TTLs) → `constants.ts` per-object TTL values + `cache.ts` ✓
- NFR-005 (429 backoff) → `client.ts::fetch` retry logic ✓
- NFR-006 (no background polling) → architectural — no scheduler in code ✓
- NFR-006a (concurrency) → documented in §Process Patterns, no IPC ✓
- NFR-007 (offline detection) → `client.ts::fetch` socket-error path → `{ kind: 'unreachable' }` ✓
- NFR-008 (token-invalid prompt) → `error.ts::errorRow` for `auth-invalid` kind ✓
- NFR-009 (no telemetry) → no `fetch` calls outside `client.ts`, lint-enforced ✓
- NFR-010 (PAT storage) → Alfred `userconfigurationconfig` only; never `alfredClient.config` ✓
- NFR-011 (Quick Look scrub on refresh) → `refresh.ts` flushes `alfredInfo.cache()` dir ✓
- NFR-012 (i18n) → `strings.ts` + `{en,fr}.json` + locale detection + override config ✓
- NFR-013 (semantic-release) → existing `.releaserc` + `fast-alfred pack` exec step ✓
- NFR-014/015 (README + info.plist) → `.github/ISSUE_TEMPLATE/` + README expansion in implementation sequence ✓
- NFR-016 (labels + triage) → `.github/ISSUE_TEMPLATE/` + maintainer cadence ✓

**Addendum coverage.**

- §A endpoints → all 8 endpoints map to `AttioClient` methods ✓
- §B primitives → all `alfredClient.*` usages have a named call site ✓
- §C auth mechanics → V1 PAT in `info.plist` + `auth.ts`; V2 OAuth-relay deferred but not blocked ✓
- §F migration items 1–15 → covered by §Implementation Sequence (item 14 dormant hotkey explicitly addressed) ✓
- §H type matrix → each row maps to an encoder file in `encoders/` ✓

### Implementation Readiness Validation

**Decision completeness.** All Critical decisions from §Decision Priority Analysis are resolved (HTTP client, encoder pattern, cache contract, HTML templating, validation library). All Important decisions are resolved (token hash, drilldown dispatch, strings loading, error pipeline, notification dedup stance).

**Structure completeness.** Complete directory tree with file paths. FR → file mapping has 7 feature groups all mapped. Internal-boundary table has 5 import-direction rules. External-boundary table has 6 system boundaries with code locations.

**Pattern completeness.** 8 cross-cutting concerns covered: naming (3 sub-categories), structure (3), format (3), communication (3), process (4). Concrete code examples for `Result<T, E>` ✓ vs anti-pattern ✓, and for `strings.t(...)` ✓ vs inline ✓.

### Gap Analysis Results

**Critical gaps:** none. The architecture is implementable as written.

**Important gaps (specify before V1 sprint kickoff, not blocking PRD freeze):**

- **Status file JSON shape (FR-046).** §Process Patterns names the convention but the actual JSON keys (`requestId`, `status`, `result`, `error`, `startedAt`) aren't pinned. Action: lock in `src/common/status.ts` design comment before the F-G epic starts.
- **`scripts/verify-attio-shapes.mjs` shape.** Described in §Project Structure as the build-time shape-probe (addendum §F item 15) but the script's actual behavior (CLI args, fixture-workspace assumptions, output format for CI) is not specified. Action: design at the start of the `AttioClient` implementation, since the curl-probe output feeds the encoder authoring.
- **AttioClient retry parameters.** "Exponential backoff + one retry" stated; specific values (initial delay, max delay, jitter) not pinned. Default: 1s initial, 8s cap, no jitter. Action: pin in `constants.ts` at implementation start.
- **EN/FR strings file format.** Dot-notation keys committed but the JSON shape (flat object vs nested) not pinned. Default: flat object with dot-notation keys (simpler tooling). Action: state in `strings.ts` design comment.
- **Bundle size threshold for `bundle-check` CI job.** Mentioned but not numerically pinned. Default: warn at +20% from previous release, block at +50%. Action: pin in `.github/workflows/ci.yml` when added.

**Nice-to-have gaps (deferred, not blocking V1):**

- Dev iteration loop is manual (no watcher). Acceptable — Alfred workflows are small enough.
- The ESLint custom rule `no-inline-strings-in-output` is described but not coded. Lint-only, not blocking. Can land post-V1.0.0.
- Visual QA pass on three dark Alfred themes (per UX EXPERIENCE.md open question). Defer to V1.0.0 manual checklist.
- Tests for `quicklook.ts` HTML rendering — snapshot tests on the generated HTML would catch regressions. Not blocking.

### Validation Issues Addressed

The Important Gaps above are documented for the implementation team to lock at the start of each affected work item. The defaults provided make them resolvable without further architectural debate. No critical or scope-affecting issues remain.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high — the 5 Important Gaps are all small concrete deferred-by-default items (status-file shape, retry tunables, strings JSON shape, bundle threshold, perf-script CLI) that have stated defaults and will land naturally at the start of the affected work item. None require architectural debate to resolve.

**Key Strengths:**

- Coherent end-to-end: PRD → UX → architecture all reference each other and use the same vocabulary (FR IDs, design tokens, microcopy keys).
- Every FR and NFR has a named code home.
- Internal-boundary table is lint-enforced, so AI agents cannot accidentally violate the layering.
- The brownfield reality is acknowledged everywhere (existing `people.ts`, dead cache constants, `info.plist` hotkey to remove) — no fiction.
- The `Result<T, E>` + `WorkflowError` discipline makes the error pipeline mechanical, not interpretive.

**Areas for Future Enhancement:**

- V2 OAuth relay design (hosting choice, multi-workspace UX, relay-side error mapping).
- Multi-level drill-down (V2-5) requires a re-think of the status-file convention and `drilldown.ts` dispatcher.
- An optional opt-in telemetry path (V2-7) for thesis-validation metrics.
- Bundle-size optimization once the encoders + zod schemas + Lucide icons land — first build will reveal actual numbers.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow §Naming Patterns, §Structure Patterns, §Format Patterns exactly. Never invent new patterns mid-implementation; surface the case in a decision-log update first.
- Use `strings.t(key, params?)`, `cache.key(...)`, `row(...)`, `Result<T, E>` everywhere. The enforcement rules (§Enforcement Guidelines) are CI-blocking by design.
- Respect the internal-boundary table (§Architectural Boundaries). If a file needs to import something on the forbidden list, raise the question — don't bypass.
- Each FR is mapped to a primary file in §Requirements to Structure Mapping. When implementing, start from that file.
- The PRD (`_bmad-output/planning-artifacts/prds/prd-alfred-attio-workflow-2026-06-04/`), DESIGN.md, EXPERIENCE.md, and this document together are the source of truth. On conflict, PRD wins for _what_, UX spines win for _how it looks and behaves_, this document wins for _how the code is shaped_.

**First Implementation Priority:**

Foundation epic — set up the scaffolding before any keyword work:

1. Add vitest + zod + perf script to `package.json`. Configure flat-config ESLint with the `no-restricted-imports` boundary rules.
2. Bundle Inter + Inter Display + JetBrains Mono WOFF2 into `assets/fonts/`. Export Lucide PNGs (person, company, deal, task, plus state variants) into `assets/icons/` per DESIGN.md mapping.
3. Author `src/common/constants.ts`, `error.ts`, `cache.ts`, `auth.ts`, `tz.ts`, `notify.ts`, `strings.ts`, `script-filter.ts`, `status.ts` with tests for each.
4. Author `src/strings/{en,fr}.json` against the EXPERIENCE.md microcopy catalog (every row).
5. Expand `src/common/attio/client.ts` to read + write, author `schemas.ts`, then encoders one by one in addendum §H order.
6. Author keyword scripts in dependency order: `diag.ts` → `refresh.ts` → `todo.ts` → `person.ts` / `company.ts` / `deal.ts` / `task.ts` → `drilldown.ts`. Author the Quick Look HTML generator (`quicklook.ts`) once enough records flow.
7. Pre-V1.0.0: rewrite `README.md` per NFR-014, populate `.github/ISSUE_TEMPLATE/` per NFR-016, verify `semantic-release` artifact attachment, run a full `npm run perf` baseline.
