---
title: Alfred Workflow for Attio CRM — Experience
status: final
created: 2026-06-05
updated: 2026-06-05
sources:
  - ../prds/prd-alfred-attio-workflow-2026-06-04/prd.md
  - ../prds/prd-alfred-attio-workflow-2026-06-04/addendum.md
  - DESIGN.md
---

# Experience

> Behavioral, IA, and microcopy spec. Visual identity lives in `DESIGN.md` (referenced as `{colors.accent}`, `{typography.body}`, etc.). On conflict with any mock or import, this file and DESIGN.md both win.

## Design constraint — 1 to 3 deliberate keystrokes

The PRD's load-bearing thesis is: **collapse the "switch to Attio to do one small thing" pattern into 1–3 keystrokes**. The constraint counts **deliberate keystrokes** only — the user's chosen actions. It excludes:

- The Alfred summon (⌥space) — common to every invocation, not workflow-specific.
- Arrow keys for row navigation inside Alfred's list — these are Alfred-owned, not actions.
- The query typing itself — multi-character but a single intent.
- Backspace to return from a drill-down — return-to-parent, not a new action.
- Escape to close Alfred — closing, not acting.

Counted as deliberate keystrokes: keyword/result selection (⏎), mods (⌘⏎, ⌥⏎, ⇧⌥⏎), ⇧ for Quick Look, → for drill-down, ⏎ for edit-row selection, ⏎ for option pick.

- **1 deliberate keystroke** flows: `todo` + ⏎ to open in Attio. `person <q>` + ⏎. Etc.
- **2 deliberate keystrokes** flows: above + a mod (⌘⏎ task-complete, ⌥⏎ note, ⇧ Quick Look, → drill-down).
- **3 deliberate keystrokes** flows: drill-down (→) + ⏎ on edit-row + ⏎ on option (single-select / record-reference). This is the F-G edit budget.

**F-G scalar field edit is the maximum budgeted V1 flow.** Anything that exceeds it — creation, multi-select edit, editing a linked record's field from a deal's drill-down (single-level constraint, see Known Limitations) — is deferred to V2.

A change to the spec that adds a deliberate keystroke to a common path requires explicit decision-log justification.

## Foundation

### Form-factor

**Alfred 5 on macOS 13+**. The workflow lives entirely inside Alfred's chrome and macOS system surfaces:

- **Alfred bar** — keyword input and result list, themed by the user's Alfred theme. The workflow controls icon, title, subtitle, and mod-text per row; layout and color are Alfred-owned.
- **Alfred Quick Look pane** — a side panel rendered on ⇧. The workflow generates an HTML fiche written to `alfredInfo.cache()` and points `quicklookurl` at it (FR-034). Full visual control inside the pane.
- **Alfred sub-script-filter (drill-down)** — same chrome as the result list, opened via **→** (FR-019). Single-level only.
- **macOS native NSAlert text input** — opened on **⇧⌥⏎** for multi-line notes (FR-017). Workflow provides the prompt copy only; macOS owns the rest.
- **macOS notifications** — used for confirmations and errors (FR-005, FR-016, FR-017, FR-025, FR-043). Workflow provides title + body strings; system owns rendering.

No web app, no separate window, no menubar item. Everything routes through Alfred or system surfaces.

### UI system

No third-party UI library. The Alfred ScriptFilter JSON contract is the rendering primitive for in-bar rows. The Quick Look HTML is hand-authored against `{colors.*}`, `{typography.*}`, `{spacing.*}`, and `{components.*}` tokens from DESIGN.md. No React, no Tailwind, no design-system import.

[ASSUMPTION] If the addendum §F migration introduces an HTML templating library (lit-html, mustache, plain template literals), the choice is engineering-side and does not affect this spec.

## Information Architecture

Each keyword is a top-level entry point. From a keyword, the user lands on a list of records; from a record, **⇧** or **→** branch into Quick Look or drill-down respectively.

```
Alfred bar
├── todo                    → today's tasks (UJ-1)
│   └── task row
│       ├── ⏎  open in Attio
│       ├── ⌘⏎ mark complete in-place
│       ├── ⇧  Quick Look fiche
│       └── →  drill-down (linked records, quick actions)
│           ├── linked person  → ⏎ open in Attio
│           ├── linked deal    → ⏎ open in Attio
│           ├── linked company → ⏎ open in Attio
│           ├── Write note…    → ⏎ note input
│           └── Mark complete  → ⏎ PATCH + refresh
├── person <query>          → person search (UJ-2)
│   └── person row → ⏎ open / ⌘⏎ LinkedIn / ⌥⏎ note / ⇧⌥⏎ multi-line note / ⇧ Quick Look / → drill-down
├── company <query>         → company search
│   └── company row → ⏎ open / ⌘⏎ website / ⌥⏎ note / ⇧⌥⏎ multi-line note / ⇧ Quick Look / → drill-down
├── deal <query>            → deal search (UJ-4 origin)
│   └── deal row → ⏎ open / ⌘⏎ open with hint / ⌥⏎ note / ⇧⌥⏎ multi-line note / ⇧ Quick Look / → drill-down (field edits)
├── task <query>            → task search
│   └── task row → ⏎ open / ⌘⏎ open with hint / ⌥⏎ note / ⇧⌥⏎ multi-line note / ⇧ Quick Look / → drill-down
├── attio:diag              → diagnostic snapshot (workspace, "me", cache age, last error)
├── attio:refresh           → flush all caches, re-fetch identity + schemas
└── (no setup keyword)      → token-missing state surfaces via any keyword's setup-prompt row
```

The drill-down is **single-level only** (FR-019). Opening a linked record from a drill-down opens it in Attio's web app (not as a nested drill-down). The single exception is record-reference editing (FR-042), which opens a sub-search overlay for picking the target — visually nested, but conceptually still a single level.

## Voice and Tone

The workflow speaks **calm, declarative, brief**. Microcopy follows three rules:

1. **Direct address, no hedging.** "Token invalid", not "Looks like your token may be invalid".
2. **System verbs, not user pleas.** "Re-paste in config theyet", not "Please re-paste your token".
3. **No emoji, no exclamation marks.** Period at end of sentence-microcopy; no punctuation at all in single-noun labels.

Both EN and FR ship in V1 (FR-037–FR-039). Strings centralize in `src/strings/{en,fr}.json` with `{name}`-style placeholders.

### Microcopy catalog (anchors NFR-016, FR-051, FR-022, etc.)

| Context                                                            | EN                                                                 | FR                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Non-affiliation disclaimer (first-run notif, after FR-025 success) | `Unofficial workflow for Attio — not affiliated with Attio Inc.`   | `Workflow non officiel pour Attio — sans affiliation à Attio Inc.`    |
| Non-affiliation row in `attio:diag`                                | `Unofficial workflow · github.com/<repo>`                          | `Workflow non officiel · github.com/<repo>`                           |
| Setup prompt title                                                 | `Attio API token not configured`                                   | `Token API non configuré`                                             |
| Setup prompt subtitle                                              | `⏎ for setup instructions`                                         | `⏎ pour les instructions`                                             |
| First-success notif                                                | `Connected to {workspace_name}`                                    | `Connecté à {workspace_name}`                                         |
| Empty `todo`                                                       | `No tasks due today for {workspace_member_name}`                   | `Aucune tâche échue aujourd'hui pour {workspace_member_name}`         |
| Empty search (people)                                              | `No people match "{query}"`                                        | `Aucune personne ne correspond à « {query} »`                         |
| Empty search (companies)                                           | `No companies match "{query}"`                                     | `Aucune société ne correspond à « {query} »`                          |
| Empty search (deals)                                               | `No deals match "{query}"`                                         | `Aucun deal ne correspond à « {query} »`                              |
| Empty search (tasks)                                               | `No tasks match "{query}"`                                         | `Aucune tâche ne correspond à « {query} »`                            |
| Loading                                                            | `Loading…`                                                         | `Chargement…`                                                         |
| Offline prefix                                                     | `Offline — showing cached data`                                    | `Hors ligne — données en cache`                                       |
| Mark task complete success                                         | `Task completed: {content_truncated}`                              | `Tâche complétée : {content_truncated}`                               |
| Field update success                                               | `Updated {field}: {new_value}`                                     | `{field} mis à jour : {new_value}`                                    |
| Note created success                                               | `Note added to {record_name}`                                      | `Note ajoutée à {record_name}`                                        |
| 401 error                                                          | `Token invalid — update token in Alfred preferences`               | `Token invalide — mettre à jour dans les préférences Alfred`          |
| 403 error                                                          | `Token lacks the required scope`                                   | `Le token n'a pas la permission requise`                              |
| 404 error                                                          | `Record no longer exists in Attio`                                 | `L'enregistrement n'existe plus dans Attio`                           |
| 422 error                                                          | _(Attio's field-level message, verbatim, untranslated per FR-051)_ | _(message Attio verbatim, non traduit)_                               |
| 5xx after retry                                                    | `Attio is unreachable — try again later`                           | `Attio est injoignable — réessayer plus tard`                         |
| 429 sustained                                                      | `Attio rate-limit reached — try again in {N}s`                     | `Limite Attio atteinte — réessayer dans {N}s`                         |
| Cmd-Enter hint (deal/task)                                         | `LinkedIn / website not applicable — opening in Attio`             | `LinkedIn / site web non applicable — ouverture dans Attio`           |
| Read-only field hint                                               | `Read-only — token lacks write scope`                              | `Lecture seule — le token n'a pas la permission d'écriture`           |
| Object hidden (FR-030, people)                                     | `people not available in this workspace`                           | `Personnes non disponibles dans cet espace de travail`                |
| Object hidden (FR-030, companies)                                  | `companies not available in this workspace`                        | `Sociétés non disponibles dans cet espace de travail`                 |
| Object hidden (FR-030, deals)                                      | `deals not available in this workspace`                            | `Deals non disponibles dans cet espace de travail`                    |
| Object renamed (FR-030)                                            | `{object} mapped to custom slug "{slug}"`                          | `{object} associé à l'identifiant personnalisé « {slug} »`            |
| Pre-flight offline block (NFR-007)                                 | `Cannot reach Attio — try again later`                             | `Attio injoignable — réessayer plus tard`                             |
| Edit-in-Attio suffix (FR-044, FR-048)                              | `→ edit in Attio`                                                  | `→ éditer dans Attio`                                                 |
| Refresh success (FR-032)                                           | `Cache cleared — {N} objects, {M} attribute sets`                  | `Cache vidé — {N} objets, {M} schémas d'attributs`                    |
| Token rotation detected (FR-026)                                   | `Token updated — refreshing identity`                              | `Token mis à jour — actualisation de l'identité`                      |
| Schema-discovery failure (FR-049)                                  | `Cannot edit — schema unavailable, run attio:refresh`              | `Édition impossible — schéma indisponible, lancez attio:refresh`      |
| Linked record edit hint                                            | `Open linked record in Attio to edit`                              | `Ouvrir l'enregistrement lié dans Attio pour le modifier`             |
| Multi-workspace disclosure (FR-027)                                | `Bound to {workspace_name} — one workspace per install`            | `Lié à {workspace_name} — un seul espace de travail par installation` |
| Number parse error (FR-042)                                        | `Expected a number`                                                | `Valeur numérique attendue`                                           |
| Date parse error (FR-042)                                          | `Expected YYYY-MM-DD`                                              | `Format attendu : AAAA-MM-JJ`                                         |
| Datetime parse error (FR-042)                                      | `Expected YYYY-MM-DDTHH:MM`                                        | `Format attendu : AAAA-MM-JJTHH:MM`                                   |
| URL parse error (FR-042)                                           | `Expected a URL (https://...)`                                     | `URL attendue (https://...)`                                          |
| Empty query, last-touched (FR-020)                                 | `Recently updated {object}`                                        | `{object} mis à jour récemment`                                       |
| Empty query, no records (FR-020)                                   | `No {object} in this workspace yet`                                | `Aucun·e {object} encore dans cet espace de travail`                  |

The error labels in EN use **em-datheys** to separate cause and remediation. FR uses **tirets cadratins** (`—`) for the same purpose; never hyphens.

Headings inside Quick Look fiches use **sentence-case in EN** (`Linked records`, `Recent activity`) and **first-letter capitalized in FR** (`Enregistrements liés`, `Activité récente`).

[ASSUMPTION] Field labels inside Quick Look (`COMPANY`, `DEADLINE`, `OWNER`) are **uppercase in EN** per `{typography.label}`; in FR they keep the same uppercase treatment (`SOCIÉTÉ`, `ÉCHÉANCE`, `RESPONSABLE`). Verify the typographic feel in dark mode at finalize key-screen render.

## Component Patterns

Visual specs live in DESIGN.md.Components. This section specifies **behavior**.

### Result-list item

- **Selection cue.** Alfred renders selection; the workflow does not draw it. The icon and microcopy must read clearly against any Alfred theme.
- **Action priority.** The default action (**⏎**) is always the _least destructive, most-likely-expected_: open in Attio. Mutating actions are gated behind mods (⌘⏎ task-complete, ⌥⏎ note).
- **Mod discovery.** Each row advertises available mods via Alfred's mod-text. The workflow does not maintain a separate "help" row; mod-text is the affordance.
- **Lifecycle override in subtitle (FR-033).** When the workspace has configured a lifecycle attribute slug for `person`, `company`, or `deal`, the result-list subtitle appends that value to the FR-013 default with a `·` separator. Example for a person with `LIFECYCLE_ATTRIBUTE_PERSON=lifecycle_stage`: `CTO · Acme Corp · Customer`. The override is configuration-driven; no spec change to the row component beyond the additional segment.

### Quick Look fiche

- **Non-mutating.** ⇧ Quick Look displays fields but fires no API mutations. Reading and copying with the mouse is supported (system clipboard); mutating actions (mark complete, write note, edit field) require closing Quick Look and using **⏎** / **→** / a mod from the parent list. Alfred's Quick Look does not natively pass mods through to the underlying row — the close-then-act flow is the V1 path.
- **Refresh.** On open, the fiche is generated from the cached record (subject to NFR-004 TTLs). The fiche does **not** poll Attio; if the user wants fresh data, `attio:refresh` flutheys caches.
- **Empty fields.** Per `{components.fiche-row}` and FR-036, rows whose value is missing are silently omitted — never rendered as `—` or `null` or "empty".

### Drill-down list

- **Open vs. drill behavior.** **⏎** on a linked-record row opens that record in Attio. The single-level constraint (FR-019) means drill-down never nests; opening "deal Acme Series A" → "linked person Florian Marin" → ⏎ leaves Alfred and lands in Attio.
- **Edit-affordance vs. read-only row.** A row with a small **`→ edit`** accent-blue suffix in its subtitle is editable. A row without that suffix is read-only. Non-editable types (multi-select, structured name, structured location, archived per FR-045) and off-target record-references (FR-048) gain a different suffix: `→ edit in Attio` — same accent, different verb. ⏎ on those rows opens the record in Attio's web UI.
- **Linked-records grouping (addendum §E).** A drill-down row labeled "Linked people", "Linked tasks", or "Recent notes (last 3)" expands inline into N child rows when selected — pressing ⏎ on the group header does not nest; it expands the rows directly below the header at the same drill-down level. The header re-collapses on ⏎ a second time. This is the single concession to "list-of-records-as-a-single-row" in V1 — done because Alfred drill-down is single-level and a flat scroll is the only path.
- **Backspace.** Returns to the parent list (the search result list or `todo` list).
- **Archived attributes (FR-045).** Hidden entirely; never rendered, never get an edit affordance.

### Setup prompt

- **Single row, single action.** No "what is a PAT", no expanded help inline. ⏎ opens the README. The README is the help surface.
- **Persists until token is pasted.** Re-typing the keyword after generating the PAT but **before** saving in the config theyet still shows the setup prompt — the workflow detects the absence of the env var, not the user's intent. Resolved when the config theyet is saved and any keyword is invoked again.

### Status pill (in fiche)

- **Workspace-defined values.** A "Discovery" or "Customer" pill renders the workspace's actual option label. The workflow does not normalize / translate / shorten.
- **No interactivity.** Pills are not clickable from Quick Look (Quick Look is read-only). To change a stage, the user uses drill-down.

## State Patterns

Every keyword script must surface five distinct states. The pattern is uniform across F-A, F-B, F-G surfaces:

| State                       | Trigger                                                    | Render                                                                                      |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Loading**                 | Query unresolved after 300ms (NFR-003)                     | One row, `Loading…` title, `sync` icon                                                      |
| **Empty**                   | Query resolved, zero results                               | One row, query-aware copy ("No tasks due today for…", "No people match 'xyz'"), `info` icon |
| **Populated**               | Query resolved, ≥1 result                                  | Up to 9 rows per the result-list pattern                                                    |
| **Offline**                 | Network at socket layer fails OR 5xx after retry (NFR-007) | Cached results, prefixed by one row `Offline — showing cached data` with `warning` icon     |
| **Token-missing / invalid** | Env var absent (FR-022) or 401 on first call (NFR-008)     | Single row, setup prompt copy; ⏎ opens README; no API call attempted                        |

Edit-specific states (F-G):

| State                                       | Trigger                                                                                                | Render                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Edit input loaded** (FR-042)              | ⏎ on edit-affordance row (text / number / URL / date / datetime / email / phone / currency)            | Inline Alfred text input prefilled with the current value; ⏎ submits, parse failures keep the input open                         |
| **Parse error** (FR-042)                    | Invalid input on submit (NaN, malformed date, etc.)                                                    | Drill-down row replaced by a single error row with the parse-error microcopy ("Expected YYYY-MM-DD", etc.); ⏎ re-opens the input |
| **Single-select picker** (FR-042)           | ⏎ on edit-affordance row (single-select / status / stage / lifecycle)                                  | Sub-script-filter overlay listing workspace options; current option marked with `success` icon                                   |
| **Record-reference sub-search** (FR-042)    | ⏎ on edit-affordance row (single record-reference, target object in {people, companies, deals, tasks}) | Sub-script-filter overlay reusing F-B search semantics for the target object type                                                |
| **PATCH in flight** (FR-046)                | After ⏎ on edit input or picker                                                                        | Drill-down re-runs with `pending=<field_slug>`; the affected row shows the `sync` icon as a spinner                              |
| **PATCH success** (FR-043, FR-047)          | Server confirms                                                                                        | `success` icon notification with FR-043 success copy; drill-down re-renders with the new value                                   |
| **PATCH failure** (FR-051)                  | HTTP error                                                                                             | `error` icon notification with FR-051 copy; drill-down does not re-render                                                        |
| **403 read-only** (FR-050)                  | PATCH returns 403                                                                                      | Row gains the `Read-only — token lacks write scope` hint and stops accepting ⏎ for the session                                   |
| **Schema unavailable** (FR-049)             | Attribute-defs never succeeded for this object                                                         | F-G affordances suppressed for the object; drill-down rows are open-and-navigate only; `attio:diag` surfaces the gap             |
| **Mutating action while offline** (NFR-007) | ⌘⏎ / ⌥⏎ / ⏎ on edit affordance while in `Offline` state                                                | Notification with the pre-flight-block copy; the API call is not attempted; drill-down does not change                           |

There is no "saving" state inside Quick Look — Quick Look is read-only, so it never sees mid-mutation states. Edit flows live in drill-down only.

## Interaction Primitives

The Alfred workflow's primitive vocabulary is **keystrokes + mods**. Mouse is not used (Alfred is a launcher). The complete mod table:

| Keystroke             | Where                                                   | Action                                           |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| **⏎**                 | Any result                                              | Open in Attio (default action)                   |
| **⌘⏎**                | `todo` task row                                         | Mark task complete in-place (FR-005)             |
| **⌘⏎**                | person / company row                                    | Open LinkedIn / website (FR-015)                 |
| **⌘⏎**                | deal / task row                                         | Open in Attio + one-time hint (FR-015)           |
| **⌥⏎**                | Any record row                                          | Capture query as note body, single-line (FR-016) |
| **⇧⌥⏎**               | Any record row                                          | Open macOS NSAlert for multi-line note (FR-017)  |
| **⇧**                 | Any result                                              | Quick Look fiche (FR-018, FR-006, FR-034)        |
| **→**                 | Any record / task row                                   | Drill-down (FR-019, FR-007)                      |
| **←** / **backspace** | Drill-down                                              | Return to parent list                            |
| **⏎**                 | Edit-affordance row in drill-down (text / number / URL) | Open inline edit input (FR-042)                  |
| **⏎**                 | Edit-affordance row (single-select / record-reference)  | Open sub-script-filter overlay (FR-042)          |

Mods are **discoverable** through Alfred's own mod-display: holding a mod swaps the subtitle to the mod-text. The workflow's mod-text is concise and verb-led: `Open LinkedIn`, `Write note`, `Mark complete`, `Open in Attio`.

There is no double-tap, no long-press, no chord beyond two-mod combinations (⇧⌥⏎). Alfred surface keeps the vocabulary small on purpose.

## Accessibility Floor

The workflow inherits Alfred's accessibility baseline and adds the following commitments inside Quick Look HTML:

- **Contrast.** Both light and dark Quick Look tokens meet WCAG AA at minimum for `ink-primary` and `ink-secondary` on their respective backgrounds. `ink-tertiary` is used only at `{typography.label}` size (11px) and only for non-essential labels; never for running body.
- **Type sizing.** Body text is 14px (`{typography.body}`). Minimum readable size in Quick Look is 11px (`label`). The user's macOS "Larger Text" setting is respected in Quick Look HTML via `rem`-based units [ASSUMPTION: verify Alfred's Quick Look pane respects `rem` scaling at finalize].
- **Color independence.** State signals (success / warning / error) carry **icon + text**, never color alone. The "RETARD" task group is labeled by its heading, not by red.
- **Focus order.** Quick Look HTML uses semantic HTML (`<section>`, `<dl>`, `<dt>`, `<dd>`) so screen readers traverse fiche rows in document order — heading → label/value pairs → linked records → metadata.
- **Localization.** All workflow-rendered strings come from `strings/{en,fr}.json` (FR-037). VoiceOver announces these in the system locale; field values from Attio are not translated (FR-039).
- **Reduced motion.** Quick Look CSS respects `prefers-reduced-motion: reduce`; the workflow has no animations in V1 anyway, but the future field-edit spinner animation should be disabled when this preference is set.

The workflow does not introduce custom keyboard shortcuts beyond the Alfred mods listed in Interaction Primitives. macOS system shortcuts (⌘C / ⌘V inside the NSAlert input, ⌘Q to quit Alfred) remain Alfred / macOS owned.

## Key Flows

Four user journeys are anchored from the PRD. Persona is intentionally role-neutral ("the user") — per the PRD's §3 decision, V1 capabilities do not vary by role. Each KF is enriched with the visual / behavioral specifics needed to implement.

### KF-1 — Morning to-do (anchors UJ-1)

**Trigger.** First Alfred reach of the day, before opening the Attio tab.

**Steps.**

1. ⌥space → types `todo` → ⏎ on the keyword (or auto-runs if the keyword is bare).
2. Alfred renders the populated state: 5 task rows. The first three are grouped under an `OVERDUE` / `EN RETARD` heading; today's two follow. Title is the task content (FR-002 mapping); subtitle is `{person} · {deal} · {company}` in `{typography.body-sm}` `{colors.ink-secondary}`. Missing links are silently omitted per FR-002.
3. **Climax beat.** A task "Follow up on proposal" is linked to "Florian Marin · Acme Series A · Acme Corp". The user presses **⇧**. The Quick Look fiche opens with deadline (yesterday), assignee, linked records. The context is in hand without a tab switch.
4. ⇧ again to close. **⌘⏎** marks the task complete in-place. macOS notification: `Task completed: Follow up on proposal`. The list refreshes; the task is gone.
5. The user repeats for two more tasks, then closes Alfred.

**Total elapsed:** ~25 seconds. No browser tab opened. No Attio web UI seen. Three CRM hygiene actions logged. Keystroke budget: 1 (⏎ on keyword) + 1 (⇧ Quick Look) + 1 (⌘⏎ complete) = 3 deliberate keystrokes per task.

### KF-2 — Finding a record from outside Attio (anchors UJ-2)

**Trigger.** The user is composing a reply in Gmail / Slack / a doc; they need a record's email, phone, or other reference field.

**Steps.**

1. ⌥space → types `person florian` → result list shows up to 9 matches.
2. The top result is `Florian Marin` with subtitle `CTO · Acme Corp` (FR-013 mapping for search).
3. **Climax beat.** **⇧** opens Quick Look. Name in `{typography.display}`, job title, primary email, primary phone, linked company, last-updated date. The user selects the email value with the mouse and **⌘C** copies it (macOS native selection).
4. ⇧ closes Quick Look, ⎋ closes Alfred, ⌘V pastes into the host app.

**Total elapsed:** ~7 seconds. Quick Look-to-clipboard is a mouse operation (Alfred's WebView does not consistently support keyboard text-select); this is documented in Known Limitations. Keystroke budget: 1 (⏎ on result) + 1 (⇧ Quick Look) = 2 deliberate keystrokes, plus the macOS ⌘C/⌘V system clipboard pair which is not workflow-controlled.

### KF-3 — First-time install (anchors UJ-3)

**Trigger.** The user has just installed the `.alfredworkflow` and opens Alfred for the first time after install.

**Steps.**

1. ⌥space → types `todo`.
2. No PAT is configured. Alfred renders the setup prompt: one row, `info` icon, title `Attio API token not configured`, subtitle `⏎ for setup instructions`.
3. ⏎. The default browser opens the README's PAT-setup anchor. The README walks Attio → Settings → Developer → API tokens with screenshots.
4. **Climax beat.** The user generates the PAT with the required scopes (read on records/tasks, write on tasks/notes, write on record attributes for F-G), copies it. Opens Alfred preferences → Workflows → Attio → Configure. Pastes. Saves.
5. ⌥space → types `todo` again. The first call probes `GET /v2/self`; identity is resolved and cached. Two one-time macOS notifications fire: `Connected to {workspace_name}` (FR-025) and immediately after, the non-affiliation disclaimer `Unofficial workflow for Attio — not affiliated with Attio Inc.` The task list renders.

**Total elapsed:** 60–120 seconds, depending on how fast the user finds Attio's settings page. The README is the help surface; no in-product tour. The browser-to-Alfred-preferences context flip is a documented onboarding cliff (Known Limitations).

### KF-4 — Updating a deal stage from another window (anchors UJ-4)

**Trigger.** The user has new information about a deal (a verbal confirmation, a sales-call note) and wants to update Attio without losing focus.

**Steps.**

1. ⌥space → types `deal acme series a`. Result list shows the deal at top.
2. **→** drill-down. The sub-list shows editable fields: `Stage: Discovery → edit`, `Value: 50000 € → edit`, `Close date: 2026-07-15 → edit`, plus linked person, linked company, and `Write note…`. (Arrow-key navigation between rows is Alfred-owned and uncounted.)
3. **⏎** on `Stage: Discovery → edit`. A sub-script-filter overlay opens listing the workspace's deal-stage options: Discovery (current, with a small check icon), Negotiation, Closed Won, Closed Lost.
4. **Climax beat.** The user types `nego` to filter, presses **⏎** on `Negotiation`.
5. The drill-down row shows the `sync` spinner via Alfred's `rerun` while the PATCH is in flight. On server confirm: macOS notification `Updated stage: Negotiation`. The drill-down re-renders with the new value.
6. Backspace returns to the deal list. ⎋ closes Alfred.

**Total elapsed:** ~6 seconds. Keystroke budget: 1 (⏎ to drill-down trigger via →) + 1 (⏎ on field row) + 1 (⏎ on picked option) = 3 deliberate keystrokes. This is the F-G ceiling.

---

## Known limitations

V1 documents the following limitations explicitly so users encountering them in support threads see the design intent, not a bug.

- **Single-level drill-down.** Opening a linked record from a drill-down opens it in Attio's web UI, not as a nested drill-down. Editing a linked record's fields from a parent's drill-down (e.g. deal → linked person → person's email) is not supported in V1; the user invokes the appropriate keyword directly (`person`, `company`, `deal`, `task`) to reach editable surfaces. Multi-level drill-down is V2-5.
- **Quick Look field copy is a mouse operation.** Alfred's WebView does not consistently support keyboard text selection inside Quick Look HTML. Copying a value from the fiche (email, phone, URL) requires the system pointer.
- **Onboarding cliff between PAT generation and Alfred config sheet.** Alfred provides no script API to open its own preferences. After generating the PAT and copying it, the user must navigate Alfred preferences → Workflows → Attio → Configure manually. The README states this explicitly.
- **Subtitle truncation on long lifecycle values.** Alfred owns subtitle row width per theme. With FR-033 lifecycle override appended, three-segment subtitles may truncate on narrow themes or long stage labels. Truncation priority: rightmost segment (lifecycle) drops first.
- **No undo on `Mark task complete`.** ⌘⏎ on a task fires PATCH immediately. The workflow has no `Mark task incomplete` action in V1; the user re-opens the task in Attio to revert. Design intent: trust the user.
- **`task <query>` and `todo` render tasks differently.** `todo` uses FR-002 (content + linked person + deal + company). `task <query>` uses FR-013 (deadline + completion status). The two keywords serve different intents (what's due today vs find a specific task) so they use different mappings.
- **`Cancel changes` is not a state.** Inside drill-down editing, there is no Cancel action. ⎋ closes Alfred without persisting; backspace returns to the parent drill-down list. Once ⏎ is pressed on an edit input or picker, the PATCH is fired and cache invalidation kicks off — there's no client-side rollback.
- **Result cap at 9.** Per FR-011. A search with more than 9 matches shows the top 9; the user narrows the query or opens Attio for a full list. No pagination, no "View all in Attio" affordance in V1.

---

## Maintenance & diagnostics surfaces

These keywords don't have user-facing flows but still need spec.

### `attio:diag`

A single-keyword shortcut that returns a fixed result list (no query). Each row is read-only; the rows are a snapshot, not a live view. **Designed to be safely posted to public GitHub Issues** — no token bytes, no record IDs, no full endpoint paths.

| Row | Title                                               | Subtitle                                                                                                                                   |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | `Unofficial workflow for Attio — share for support` | `does not contain token or record content`                                                                                                 |
| 1   | `Workspace: {workspace_name}`                       | `slug: {workspace_slug}`                                                                                                                   |
| 2   | `Me: {workspace_member_name}`                       | `id: {workspace_member_id}` (config flag `DIAG_INCLUDE_IDENTITY=false` elides this row for users sharing public screenshots)               |
| 3   | `Token: configured` (or `missing`)                  | (no hash, no prefix, no length — token bytes are never derived for display)                                                                |
| 4   | `Cache age`                                         | `tasks {age} · people {age} · companies {age} · deals {age} · schemas {age}`                                                               |
| 5   | `Last error`                                        | `{ISO timestamp} · {HTTP status} · {endpoint pattern}` — endpoint pattern strips record IDs: `PATCH /v2/objects/people/records/<redacted>` |
| 6   | `Workflow version`                                  | `{semver}` (from `alfredInfo.workflowVersion()`)                                                                                           |

⏎ on any diagnostic row is a no-op (or copies the row's text to the clipboard at most — TBD at build).

### `attio:refresh`

A single-keyword command that flutheys all caches and re-fetches identity + schemas. On invocation: shows a one-row loading state, then a notification on success (`Cache cleared — {N} objects, {M} attribute sets` per microcopy). On failure: notification with FR-051 error copy. Returns no list; the user re-invokes the desired keyword.

## Open questions

- **Icon mapping.** Which Lucide glyph (or other open-license set) maps cleanest to Attio's `person`, `company`, `deal`, `task` icons? Worth a visual side-by-side at finalize key-screen render.
- **`{components.fiche}` corner radius in Quick Look.** Whether to round to 6px (`rounded.md`) or 8px (`rounded.lg`) depends on whether Alfred's Quick Look pane already clips at a known radius. To verify by visual inspection.
- **Dark-mode subtitle contrast in Alfred bar.** The workflow's subtitle text is rendered by Alfred against the user's theme. Need to confirm `body-sm` at the chosen ink-secondary value remains readable on the most common dark Alfred themes (Alfred default dark, Catppuccin Mocha, Tokyo Night). [Defer to V1.0.0 visual QA pass.]
- **Status-pill localization.** When a workspace's stage option labels are themselves in French (e.g. `Découverte` instead of `Discovery`), do we render them verbatim (yes per FR-039) or normalize? FR-039 says verbatim; flagged here only for downstream review.
