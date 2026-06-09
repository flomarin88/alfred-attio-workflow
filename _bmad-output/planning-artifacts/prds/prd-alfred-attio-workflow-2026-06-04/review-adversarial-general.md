# Adversarial Review — Alfred Workflow for Attio CRM PRD

## Headline verdict

This PRD reads well but it is not build-ready. The late-added F-G field-edit feature group has not been pressure-tested against the rest of the spec — it assumes infrastructure (attribute-def discovery, drill-down state, cache invalidation, sub-search reuse) that other FRs gesture at but do not actually deliver in a coherent order, and the FR-040–FR-046 chain has at least three silent failure modes (stale-cache-after-PATCH, timezone misalignment on datetime input, record-reference search returning no targetable rows) that will bite at build time. Secondary issue: residual OAuth fingerprints survived the PAT pivot (NFR-010 still names "refresh token", FR-028 references `attio:setup` that no longer exists, FR-022 refers users to a "setup guide" not a config sheet), the persona is decorative, and the success metrics are unmeasurable without instrumentation the PRD explicitly forbids.

## Findings

### Critical — F-G has no cache-invalidation contract after PATCH (§ FR-043, FR-031, NFR-004)

FR-043 says "On success: macOS notification… drill-down refreshes." Refreshes from where? NFR-004 caches people for 10 minutes, companies for 24 hours, deals for 5 minutes. FR-031 caches attribute definitions for 24h. If Paul updates the Acme deal stage and the drill-down "refreshes" by reading from the deal cache, he sees stale "Discovery" for up to 5 minutes. If the parent F-B search list is still open (it is — backspace returns him to it per UJ-4), it also serves stale data. There is no FR that says "PATCH invalidates the cache row for this record" or "PATCH writes the new value into the cache optimistically." FR-046 explicitly rules out optimistic UI ("the drill-down only reflects the new value after the server confirms"), which makes a read-after-write race the default behaviour, not an edge case.

_Fix:_ Add an FR to F-G: "On successful PATCH, the workflow invalidates the cached record entry for `(object_slug, record_id)` and, if the record appears in any cached list-result page, invalidates those pages too. The drill-down then re-fetches the record by ID before re-rendering." Also clarify whether attribute-def cache (24h) is touched when option lists change — it is not, today, which means a newly added stage option won't appear for 24h after an admin adds it.

### Critical — datetime timezone is hand-waved (§ FR-042, addendum §H row 7)

FR-042 says datetime input expects `YYYY-MM-DDTHH:MM`. Addendum §H says "Local timezone resolved at parse, stored UTC" and example payload is `"2026-07-15T14:30:00Z"`. The Z suffix is UTC. If Paul in Paris types `2026-07-15T14:30`, the workflow must (a) decide that's local Paris time, (b) convert to UTC, (c) send `2026-07-15T12:30:00Z` (CEST = UTC+2). None of that is specified. The "Z" in the example payload is the _only_ place this is hinted at, and it contradicts the input format which lacks a timezone designator. Same problem in reverse: when rendering the current value in "Close date: 2026-07-15 — edit", which timezone is shown?

_Fix:_ State explicitly: "Datetime input is parsed in the user's macOS system timezone. The workflow converts to UTC before PATCH. Datetime values shown in drill-down and Quick Look are converted from UTC to the user's system timezone for display." Or, more conservative for V1: "Datetime editing in V1 is in UTC only; the user must type UTC. Local-time conversion is V2." Pick one and own it.

### Critical — record-reference editing has unhandled empty-target case (§ FR-042 record-reference, addendum §H)

FR-042 says single record-reference editing "opens an inline `company` search… Selecting a result saves the link." The addendum's payload row says `target_object` is discovered from the attribute definition. Problem: what if the target object has zero records (a new workspace, or a deal pointing at a `vendors` object that's empty)? What if the attribute targets an object the workflow doesn't have a search keyword for (any custom object)? UJ-4 implies all record-references are to person/company/deal — they are not, in a customized workspace. FR-044 covers types not in FR-040 but says nothing about FR-040 types that target objects the workflow can't search.

_Fix:_ Add: "If the target object of a record-reference attribute is not one of {people, companies, deals, tasks}, the attribute is rendered read-only with the `edit in Attio →` affordance from FR-044, even though its type is in FR-040." Also handle empty-search-result state: "If the search returns zero results, the input shows 'No <object> match <query>' and ⏎ is a no-op." This last is just FR-021 carried into the sub-context; saying so explicitly closes the loop.

### High — leftover OAuth/auth artefacts after the PAT pivot

The PAT pivot is documented in the decision log but the PRD body leaks the abandoned plan:

- **NFR-010** still says "Access token and refresh token are stored via `fast-alfred`'s config layer." There is no refresh token in PAT auth (addendum §C.3 confirms Attio's OAuth doesn't even document `refresh_token`). This line was written for OAuth and never updated.
- **FR-028** says the diagnostic keyword is `attio:diag` and FR-032 says `attio:refresh`, but **NFR-008** still says "the user sees a single result prompting re-auth via `attio:setup`" — there is no `attio:setup` keyword anywhere else in the PRD. Addendum §F point 6 explicitly says "No `setup.ts` — V1 uses Alfred's native config sheet for the PAT, no scripted onboarding flow." NFR-008 is a stale reference.
- **NFR-014** lists "OAuth-setup walkthrough" as a README requirement. V1 has no OAuth. This is a copy-paste leftover.
- **FR-022** says the setup prompt result reads "Attio API token not configured — ⏎ to open the setup guide." Combined with FR-023, this opens the README in a browser. The "setup guide" framing implies a wizard; the actual flow is "go paste a token into a textfield." Calling it a "setup guide" sets the wrong expectation, especially for Sarah in UJ-3 who _also_ has to find Alfred's config sheet (UJ-3 step 5) — a second, separate UI moment the prompt doesn't hint at.
- **§8 Open questions, third bullet** lists "OAuth relay design (V2)" as an open item. Fine for an addendum, but it makes the PRD-body open-questions section look like V2 leaks in. Move it to §9.
- **Addendum §B** says `alfredClient.env.getEnv` is "used for OAuth client ID and (during PAT-fallback only) any pasted token." In V1 there is no OAuth client ID; PAT is not a fallback, it is the only path.

_Fix:_ Scrub the doc for "refresh token", "attio:setup", "OAuth setup", "OAuth client ID", "PAT fallback". NFR-010 should say "Access token (PAT) is stored…". NFR-008 should reference the config sheet, not a keyword. NFR-014 should say "PAT-setup walkthrough". Addendum §B point on `getEnv` should drop the OAuth framing.

### High — F-G fields depend on attribute-def discovery that has no failure mode (§ FR-031, FR-040, FR-041)

FR-031 caches attribute definitions for 24h "at first run." FR-040 enumerates editable types; FR-041 says "every attribute of a type in FR-040 is rendered as an 'edit' action item." This assumes the attribute-def fetch succeeded. What happens on a workspace where the first attribute-defs fetch fails (network error during onboarding, 403 because the PAT lacks the scope)? FR-041 silently renders nothing editable, with no signal to the user that they're in a degraded mode. Worse: NFR-007 says "When offline… cached results are shown with a one-result 'Offline — showing cached data' prefix item" — but the attribute-def cache is for 24h. If the cache is still warm but the user is online and the live PATCH 403s because the PAT was rotated to a read-only one, drill-down shows edit affordances that all fail.

_Fix:_ Add: "If the attribute-def fetch has never succeeded for an object, F-G affordances are not rendered for that object; drill-down items show only navigate-and-read actions. A `attio:diag` row surfaces the missing schema." Also: "When a PATCH returns 403 (token lacks write scope), the drill-down should mark the field with a 'read-only — token lacks write scope' hint, not just show a generic error toast each time."

### High — Drill-down state model is undefined across the FR chain

UJ-4 says "He pops back to the deal list with **backspace**." FR-007 says "Backspace returns to the to-do list." FR-019 says drill-down is "per-object navigable sub-list." But nowhere is the _state machine_ defined: is drill-down a recursive stack (search → record → linked person → linked company → another record), or single-level? If Paul drills into a deal's linked-person, can he then edit that person's email from the deal context? If yes, after the PATCH, which drill-down level "refreshes" (FR-043)? If no, FR-042's record-reference sub-search is the only sub-level allowed, and that contradicts UJ-2's drill-down ("opens drill-down… backspace returns to the search results") which strongly implies you can navigate deeper.

_Fix:_ State the drill-down depth model explicitly. Options: (a) "Drill-down is single-level. Sub-lists never themselves expose drill-down; opening a linked record from a drill-down opens it in Attio, not in a new drill-down." (b) "Drill-down is a stack of arbitrary depth. Each level maintains its own refresh contract." V1 will be simpler if you pick (a); F-G works with either, but the FRs must say which.

### High — Cache-invalidation contracts are inconsistent across mutating actions

Three mutations exist in V1: mark task complete (FR-005), create note (FR-016, FR-017), update scalar field (FR-043). Each says "list refreshes" or "drill-down refreshes" but none says how the cache layer is affected:

- After FR-005 (mark task complete), the `todo` cache (60s TTL per NFR-004) presumably gets invalidated, but it's not specified. If not, the next `todo` invocation within 60s still shows the completed task.
- After FR-016/FR-017 (create note), the record cache is presumably untouched. But Quick Look and drill-down may display "Recent notes (last 3)" (addendum §E for Person). The new note won't appear there until cache expiry.
- After FR-043, see Critical #1.

_Fix:_ Add one cross-cutting NFR or FR: "Every mutating action (FR-005, FR-016, FR-017, FR-043) invalidates the cache rows for the affected record and any cached list-pages that referenced it. The next read repopulates from the API."

### High — Persona theater: Paul does no actual decision work

Per the rubric, persona presence should shape requirements. Strip Paul from UJ-1 and UJ-2 and the journeys read identically — they are keystroke-level walkthroughs. UJ-4 ("He's still in his email reply window") is the closest to context-shaping, but it justifies _speed_ generally, which any persona would want. The §3 statement "Persona context appears inline in the journeys below at the moments it shapes a decision" promises something the journeys don't deliver.

Examples of journey moments that don't depend on Paul-as-sales-rep:

- UJ-1: "He clears two tasks, opens one to read context" — every persona does this.
- UJ-2: "He's composing a reply in Gmail. The prospect mentions a contact name" — could be a CS rep responding to a ticket, a recruiter following up on a candidate, a founder doing intros. Nothing here is sales-rep-specific.
- UJ-4: "Paul just signed a Term Sheet with Acme" — only place where his sales-rep identity matters, but the _requirement_ it justifies (scalar stage update) would be identical for any persona.

_Fix:_ Either drop Paul to "the user" and own that this is a generic keystroke-flow doc, or add one journey moment where Paul-the-sales-rep would behave differently from, say, Sarah-the-CS-rep. (E.g.: "Paul deliberately does not want to mark the task done from Alfred because his manager checks the activity feed in Attio for who logged what — so the ⌘⏎ in-place complete creates an activity-feed gap. He uses ⏎ to open in Attio for high-visibility tasks." That would justify the existence of ⏎ alongside ⌘⏎.)

### High — Success metrics M-1 through M-6 cannot tell the author whether the workflow succeeded

M-1 (downloads) measures distribution, not use — a download isn't an install isn't a daily-active. M-2 explicitly says it's awareness, not usage. M-3 counts issues, which is a friction signal at best (engaged users open issues; happy quiet users do not). M-4–M-6 require the author to manually triage every issue into categories and trend the counts — fine for a hobby project, but the PRD frames these as actual metrics with thresholds ("Target: < 10% of total issues"). Without any instrumentation (NFR-009 forbids telemetry), there is no way to compute the denominator (total active users) or any latency percentile (NFR-001 says p95 < 200ms — measured how?). M-5's "spike means caching is misconfigured" is plausible but only catches catastrophic regressions; sub-catastrophic perf drift is undetectable.

_Fix:_ Be honest about what's measurable: "Because the workflow ships no telemetry, success is assessed qualitatively from GitHub Issues, Release downloads, and community channels (Alfred forum, Reddit). The author commits to a quarterly review of opened issues categorized by hand into setup-friction / perf / feature-request / bug. No quantitative thresholds are set; trend direction is the signal." Or, if quantitative thresholds matter, declare an opt-in telemetry path as a V1 NFR — but that contradicts NFR-009.

### Medium — NFR-001 is confidence theater

"Cached list renders in under 200ms p95 from keystroke-Enter to Alfred rendering." Who measures this? With what instrument? NFR-009 forbids telemetry. The author would need to manually invoke the workflow 100 times, time it with a stopwatch (or `time` shell wrapper) and compute the percentile. The number is also not credible against the fast-alfred + Node startup cost — Node cold start alone on macOS commonly exceeds 200ms. If fast-alfred caches the Node process via Alfred's keep-alive, that may not apply; the PRD doesn't say. NFR-002 ("cold API-bound queries render in under 1.5s p95") has the same problem at a different threshold.

_Fix:_ Either drop the percentile numbers and replace with directional commitments ("cached lists feel instant; uncached lists show a loading indicator within 300ms — NFR-003 already covers this"), or specify the measurement methodology (a `npm run perf` script that times N invocations, run pre-release).

### Medium — FR-004 task deep-link is a known landmine treated as a footnote

FR-004 says the URL pattern is "undocumented and may change" and falls back to the list URL. §8 lists this as an open question. The "fallback" is degradation from "open this specific task" to "open the task list" — for a productivity workflow where the whole point is one-click context, this is a _significant_ UX regression that the user would notice on every task open. There's no FR saying how the workflow _detects_ that Attio changed the URL contract, only that it falls back. A 404 from Attio after the redirect isn't detectable from the desktop side.

_Fix:_ Either accept the fallback as silent degradation (then say so: "If Attio changes the deep-link shape, users will silently land on the task list instead of the specific task. The workflow will not detect this; the user will report it via GitHub Issues."), or commit to a release-time check (a CI job that exercises a known task URL against a fixture workspace).

### Medium — Decisions softened into "considerations" or "balanced trade-offs"

- §1 last paragraph: "read-first ergonomics and a small number of in-place actions." — "small number" is squishy. The PRD actually picks 3 mutation surfaces (mark task complete, create note, update scalar field). Say so.
- §2 NG2: "Deferred to V2 because each requires a distinct multi-step UX." — Fine. But NG1 says creation is deferred because "the brain dump named these, the deferral is intentional." That's not a reason, it's a tautology. The real reason is presumably "creation requires multi-step input UX that V1 does not have time to design" — say that.
- FR-013: per-object context lines are listed but not justified. Why "job title + company" for person and not "company + email"? FR-033 layers a lifecycle attribute override on top of this, which makes FR-013 partly obsolete on configured workspaces. The decision was made; the PRD doesn't say _why_ these defaults.
- FR-031: "cached for 24h" — why 24h not 1h not 7d? Attribute schemas change rarely; 24h is reasonable, but the number is unmotivated. NFR-004 has the same problem: tasks 60s, people 10 minutes, companies 24h, deals 5 minutes. Why are deals more volatile than people? Why are companies the most stable thing in the CRM? (Plausible answers exist; PRD doesn't give them.)
- FR-027: "Multi-workspace is not supported in V1." Good — but the reason given is "A PAT is workspace-scoped by Attio's design." That's the _constraint_, not the _decision_. The decision is "we accept this constraint rather than asking users to swap PATs by hand to switch workspaces, which would technically work." Name the choice.

_Fix:_ For each fuzzed-over decision, add a one-sentence "why this number / why this default" line. The PRD should sound decisive; right now several FRs read like a list of choices rather than a defended scope.

### Medium — UJ-3 onboarding has a UX cliff between FR-022 prompt and config-sheet paste

FR-022's prompt says "Attio API token not configured — ⏎ to open the setup guide." FR-023 says ⏎ opens the README. The user reads the README, finds where to generate the PAT, generates it, copies it… then has to remember that _they_ have to navigate to Alfred preferences → Workflows → Attio → Configure to paste it. The README presumably tells them this, but the prompt doesn't, and there's no in-Alfred affordance to jump to the config sheet (Alfred has no API to open its own config from a script). UJ-3 step 5 describes this as a smooth flow; in practice it's "read README, switch contexts, find Alfred prefs, find the workflow, click Configure." If Sarah skips the README and types `todo` again, she sees the same prompt — no progress indicator.

_Fix:_ Either (a) add an FR: "After PAT setup, the user must invoke any workflow keyword again; on first successful identity probe, a one-time macOS notification confirms 'Connected to <workspace name>'." This gives Sarah a closing receipt for the onboarding loop. Or (b) accept the cliff and document it more honestly in UJ-3 — "Sarah toggles to Alfred preferences" rather than "She opens the Alfred workflow's configuration sheet" (the latter implies a button-press from Alfred itself).

### Medium — Addendum §F item 8 contradicts a numbered FR with no cross-reference (§ FR-033, addendum §F point 8)

FR-033 says lifecycle attribute slugs are configured per object. Addendum §F point 8 says "Add three optional config fields in `info.plist`: `LIFECYCLE_ATTRIBUTE_PERSON`, `LIFECYCLE_ATTRIBUTE_COMPANY`, `LIFECYCLE_ATTRIBUTE_DEAL` (FR-033)." Three fields. But FR-033's text mentions "primary object (`person`, `company`, `deal`)" — three objects. Tasks have lifecycle-ish attributes too (completion status). The implicit reason tasks aren't included is that `is_completed` is already used in FR-013 (task context line: deadline + status). That's a real decision and should be visible in FR-033, not buried by omission.

Separately, FR-033's reference to `[[lifecycle-config]] in addendum` — there's no `lifecycle-config` section in the addendum. There's an addendum §F point 8 that touches on it, but the wikilink-style reference suggests a dedicated section that doesn't exist.

_Fix:_ (a) Add to FR-033: "Tasks are excluded from lifecycle config because completion is rendered in FR-013's task context line via the boolean `is_completed`." (b) Either add a `## I. Lifecycle attribute configuration` section to the addendum and link to it, or change the cross-ref in FR-033 to "see addendum §F point 8."

### Medium — Note-creation mutation has no length-limit FR (§ FR-016, FR-017)

FR-016 says "captures the rest of the Alfred query as a single-line note." Alfred's query box doesn't have a published length cap, but practically holds a few hundred characters before becoming unusable. Attio Notes accept long bodies. No FR specifies whether the workflow truncates or escapes characters. The native multi-line input (FR-017) has the same ambiguity — what about embedded newlines, markdown, control characters? The downstream `POST /v2/notes` body needs a defined shape.

_Fix:_ Add: "Note content is sent as plain UTF-8 to Attio's Notes API; no client-side length limit beyond the input mechanism's natural cap; no markdown rendering by the workflow." Also say what happens to trailing whitespace and newlines.

### Medium — Empty-state copy is over-specified, error-state copy is under-specified

FR-008 specifies the empty state with a personalized name ("No tasks due today for Paul Martin"). FR-021 specifies it for search. FR-005 specifies the success notification ("Task completed: <truncated content>"). But error states are vague:

- FR-005: "If the API call fails, the notification reports the error" — what error text? Attio's API error messages aren't UI-friendly.
- FR-043: "On failure: notification with the error reason; the drill-down is not modified." — same.
- NFR-008: "When the token is invalid (401)" — but what about 403 (insufficient scope), 404 (record deleted between read and write), 422 (validation error)?

_Fix:_ Add an FR table or appendix mapping {HTTP status, action context} → user-visible copy. Or at minimum: "Error notifications use the workflow's own strings (FR-037), not raw Attio error messages, except for 422 validation errors where the field-level message from Attio is surfaced verbatim."

### Low — Localization claim "no code change to keyword scripts" (NFR-012) is undermined by FR-008

FR-008's empty state names the user ("No tasks due today for Paul Martin"). If the French translation is "Pas de tâches dues aujourd'hui pour Paul Martin", great. But if French grammar requires the name to appear differently (it doesn't here, but for other interpolated strings like "Updated by Paul Martin" → "Modifié par Paul Martin"), the interpolation order is part of the string. Centralizing strings doesn't fix word-order — the strings file must support templating. The PRD doesn't say which templating mechanism (printf-style? ICU? mustache?).

_Fix:_ Specify: "Strings support `{name}`-style placeholder substitution. ICU pluralization rules are out of scope for V1." Or whatever the actual mechanism will be.

### Low — UJ-2 ⌘⏎ "degrades to opening the record in Attio with a one-time hint" — what is a "one-time hint"?

FR-015 repeats this language. A "one-time toast" implies persisted state ("this user has seen the hint, don't show it again") — but where is that stored? `alfredClient.config`? Per-record or globally? The FR is vague.

_Fix:_ "Hint is shown the first time ⌘⏎ is invoked on a deal or task; a boolean `cmd_enter_hint_dismissed` is persisted in `alfredClient.config`."

### Low — FR-046's "loading indicator on the affected line" assumes script-filter dynamism that fast-alfred may not provide

Alfred script filters are synchronous: the script runs, emits JSON, Alfred renders, done. There is no native "live update one row in place." A loading indicator on a single line implies the row is rendered with a spinner icon while the PATCH is in flight, then the script re-runs after the PATCH completes. Workable, but requires the script filter to know it's in "post-PATCH" mode — that state has to be passed via Alfred's argument variables or env. The FR pretends this is free.

_Fix:_ "The loading indicator is rendered by re-running the drill-down script with a query argument `pending=<field_slug>`; the script paints a spinner on that field's row while polling the API result via a worker. The implementation pattern is documented in the architecture spec." Push the detail downstream, but acknowledge it exists.

## Furniture / theater spotted

- **§3 Users and the moments that matter** — single paragraph that explicitly says "this PRD does not maintain a standalone persona section" and then doesn't have one. The section exists to satisfy a template slot. Either embed the persona work into §4 journeys (in which case §3 is dead weight) or commit to a persona section.
- **§7 Adoption / Friction split with no instrumentation** — the metrics are categorized as Adoption (positive) and Friction (counter-metrics) but there's no scoreboard. M-1 download counts have no target. The section reads like it was written because the template has a "Success metrics" slot.
- **§8 Open questions** — "Reviewers may surface additional open items at finalize; those will be added here." Boilerplate; either own that there are no remaining product questions or list them.
- **§9's "Possibly: bulk actions"** (V2-6) — "possibly" is a non-commitment. Either it's planned for V2 or it isn't. If it's "maybe V2 or V3", say "Not planned" and let it surface again when there's signal.
- **NFR-D — Privacy and security** — three NFRs, one of which (NFR-010) references nonexistent refresh tokens. The section feels like template-fill rather than a considered privacy stance. No mention of: what happens to the cache directory on uninstall, whether PAT is exposed in process arguments to other macOS processes, what's in the debug log.
- **Addendum §G distribution checklist** — a build-time checklist masquerading as PRD-level content. Useful, but it belongs in the engineering plan, not in a PRD addendum. Item "Optional: submit to Alfred Gallery once V1.0.0 is stable" is especially out of place.

## What's missing entirely

- **License declaration.** Public OSS workflow with no license statement anywhere in the PRD. MIT? Apache 2.0? GPL? Worth deciding at PRD time because it affects acceptance of contributions and dependency choices.
- **What happens when the Attio API changes.** The PRD calls out two specific instability points (task URL pattern, identity endpoint shape, OAuth scope set) but has no policy for the general case. Will the workflow pin to a version of the Attio API? When Attio adds a new attribute type (e.g. "rating"), what does V1 render? Silent skip? Read-only with a hint? This connects to FR-040–FR-046 directly.
- **Update notification UX.** When a new release lands on GitHub, how does the user know? `.alfredworkflow` files don't auto-update. Document: "Users self-update by downloading and reinstalling. No in-workflow update prompt in V1." Or add an FR for an update check.
- **Telemetry stance is partial.** NFR-009 forbids it. But the success metrics in §7 implicitly need it. Either commit to "no telemetry, ever" (which constrains M-1–M-6) or open the door to opt-in telemetry in V2.
- **Contribution / issue-template UX.** Public OSS implies contributors and issue reporters. Issue templates (bug, feature, setup-failure) directly feed M-3–M-6. PR templates. Code of conduct. Not strictly PRD content but the success metrics depend on the friction these reduce.
- **What's logged.** NFR-009 forbids remote logging but Alfred's debug log is local. What does the workflow write there? PAT? (Hopefully not.) Request URLs with record IDs? Errors with response bodies that include record content? Privacy stance is incomplete without this.
- **macOS / Alfred version floor.** Addendum §G mentions "Declare Alfred 5 minimum in README and `info.plist`" but the PRD body itself doesn't pin a minimum macOS version, a minimum Node version (if the runtime bundles it), or Apple Silicon support. Public OSS users on older macs will be confused on first failure.
- **First-run identity probe failure.** FR-025 says the identity probe runs on first successful API call. If it fails (network error, scope missing), what does the user see on the next `todo` invocation? The PRD treats the success path as the only path.
- **Multi-line note content with newlines that look like Alfred query separators.** FR-017's macOS input window — does Alfred re-enter on submit? Does the workflow re-launch with a different argv? Implementation detail, but the FR pretends it's free.
- **Concurrency / re-entrancy.** What if Paul invokes `todo`, marks a task complete, and before the PATCH returns invokes `todo` again? Two script-filter processes are now racing on the same cache. The PRD has no concurrency model.
- **PAT scope set.** FR-022 mentions "scoped to read access (plus task updates and note creation)" in UJ-3 step 4 — what about field updates (F-G's PATCH)? Sarah's PAT generation in UJ-3 doesn't mention granting write scopes that F-G needs. UJ-3 was written before F-G was bolted on; the onboarding journey now under-grants permissions.
