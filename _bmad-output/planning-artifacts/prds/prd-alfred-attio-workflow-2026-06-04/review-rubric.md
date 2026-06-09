# PRD Quality Review — Alfred Workflow for Attio CRM

## Overall verdict

This PRD is solidly built for its stakes: a one-author OSS Alfred workflow whose audience is the author plus future contributors. It is decision-ready on the load-bearing axes (auth model, scope of edits, customization handling) and the addendum carries enough technical depth that an implementer can start. The main weaknesses are NFR theater in the performance numbers (unjustified p95 targets), thin counter-metric logic (issue counts as the sole data source), and a Success Metrics section that under-bets on what the PRD itself claims is the thesis ("collapse the switch-to-Attio pattern into 1–3 keystrokes").

## Decision-readiness — strong

The PRD names its hard decisions where they live and shows the trade-offs honestly. The PAT-over-OAuth call in §F-C is the strongest example: the addendum §C.1 explains _why_ — "Embedding `client_secret` in a publicly distributed `.alfredworkflow` is incompatible with public OSS distribution" — and the decision is paid for in NG/V2 (NG1, V2-3) and in the "Known limitation" of FR-027. The NG2 override (scalar edits in, non-scalar deferred) is similarly load-bearing: NG2 explicitly distinguishes "Scalar field updates ARE in scope (F-G)" so no reader can miss that the override happened. UJ-3's last paragraph — "a PAT is workspace-scoped, so one Alfred install binds to one Attio workspace … Users who work across multiple Attio workspaces need to either pick one for V1 or wait for V2's OAuth flow" — is the kind of cost-naming a good PRD does.

The Open Questions section (§8) self-admits its purpose: "All PRD-level open questions raised during Discovery have been resolved … Remaining unknowns are build-time technical details." That is honest. A weaker PRD would have manufactured open questions for theater.

What dampens this from a clean "strong" only slightly: there are zero `[NOTE FOR PM]` callouts in the PRD body despite a real PM-vs-engineering tension at FR-004 (using an undocumented URL pattern that "may change"). The decision is made, but a `[NOTE FOR PM]` would be appropriate at the place where the workflow accepts an undocumented Attio surface as a V1 dependency.

### Findings

- **low** No `[NOTE FOR PM]` flag at the undocumented task deep-link dependency (§F-A, FR-004) — The phrase "This URL shape is undocumented and may change" buries a real product risk that future contributors should be able to grep for. _Fix:_ add `[NOTE FOR PM: V1 ships with a known-fragile task deep-link; revisit if Attio publishes a stable URL contract or breaks the current one.]` at the end of FR-004.

## Substance over theater — adequate

Persona theater is well-avoided: §3 explicitly says "Persona context appears inline in the journeys below at the moments it shapes a decision; this PRD does not maintain a standalone persona section." That is the right call for a one-author OSS workflow and Paul/Sarah carry just enough context to anchor the four UJs without bloat.

Innovation theater is absent — there is no Differentiation or Competitive section, which is correct for a workflow PRD that should not be pretending to be a strategy doc.

Vision theater is also avoided — §1 is grounded: "Repeated dozens of times a day this friction quietly degrades both productivity and CRM hygiene (users skip logging when the cost is too high)" reads like an actual product observation, not category boilerplate. It could be swapped only to other launcher-extension PRDs, not "any PRD in this category."

The weakest dimension here is **NFR theater in §6 NFR-A**. NFR-001 ("under 200ms p95"), NFR-002 ("under 1.5s p95"), NFR-003 ("after 300ms") are stated as product-specific thresholds but nothing in the PRD or addendum justifies _why_ these numbers. They are not derived from Alfred's UX conventions, from measured baselines on the existing `people.ts`, or from competitive workflows. They read as plausible-sounding numbers, which is exactly what NFR theater looks like. For a V1 OSS workflow this is low-stakes but it is worth flagging because downstream story creation will treat these as testable acceptance criteria.

### Findings

- **medium** Performance NFRs are unsourced (§6 NFR-A, NFR-001 / NFR-002 / NFR-003) — "under 200ms p95", "under 1.5s p95", "after 300ms" appear without justification. The existing `people.ts` provides a measurable baseline that could anchor at least one of these. _Fix:_ either anchor the numbers ("p95 must not regress from current `people.ts` baseline of X ms measured on N invocations") or replace with a directional NFR ("cached lists must feel instant; cold lists must show a loading state before perceptible delay").
- **low** NFR-016 reads as boilerplate (§6 NFR-F) — "Issues and feature requests are tracked on GitHub. The workflow is community-supported, best-effort; no SLA is implied" is true but adds no information. _Fix:_ either delete or make it earn its place by naming the labels / triage cadence the project will use.

## Strategic coherence — adequate

The PRD has a thesis and it is named in §1: "A well-designed Alfred workflow can collapse the 'switch to Attio to do one small thing' pattern into 1–3 keystrokes." Goals G1–G4 each map to a piece of that thesis: G1 = read, G2 = act-in-place (the keystroke-collapsing piece), G3 = install friction, G4 = doesn't break on customized workspaces. The MVP scope kind is coherently "experience" (collapse the round-trip), and F-A through F-G follow from that.

The arc holds: UJ-1 (read), UJ-2 (search-from-anywhere), UJ-3 (install), UJ-4 (edit) are the four bets the thesis implies. F-G being added mid-session is exactly the move the thesis demands — without edits, the workflow is "purely a navigator" (G2's own phrasing) and the keystroke-collapsing thesis fails.

Where coherence weakens: §7 Success Metrics. The thesis is about _collapsing keystrokes per CRM action_, but the metrics measure adoption (M-1 downloads, M-2 stars, M-3 issues) and friction proxies (M-4 setup issues, M-5 rate-limit issues, M-6 perf issues). None of them validate the thesis. M-1 measures whether people _tried_ the workflow, not whether it collapsed their round-trips. Granted, the PRD acknowledges the constraint — "These metrics are observable externally without telemetry … community signal is the data source" — and the no-telemetry stance (NFR-009) makes thesis-validation hard. But the gap is worth naming: the PRD does not have a way to know if it succeeded at what it claims to do.

### Findings

- **medium** Success Metrics do not validate the thesis (§7) — The thesis is "collapse to 1–3 keystrokes" but no metric measures whether users actually accomplish CRM actions in Alfred without opening the app. Telemetry is correctly off the table per NFR-009, so the gap is structural. _Fix:_ either add an explicit `[NOTE FOR PM: V1 has no thesis-validation metric; we are betting on community signal as a proxy and accepting we cannot measure round-trip collapse directly]`, or add a qualitative validation plan (e.g. "interview 5 GitHub-issue-opening users in month 3 about which actions they used Alfred for vs. Attio web").
- **low** Counter-metrics are all "count of issues mentioning X" (§7 M-4 / M-5 / M-6) — Three of three counter-metrics are the same instrument. If GitHub Issues activity is low generally, all three are blind simultaneously. _Fix:_ acknowledge the single-instrument dependency in the section preamble.

## Done-ness clarity — strong

This is the PRD's strongest dimension. FRs are concrete and testable. A representative slice:

- FR-002: "Each task list item renders, on one line: task content, linked person name, linked deal name, linked company name. Missing links are silently omitted (no `null` artefacts)." — testable consequence (silent omission), specific anti-pattern named.
- FR-003: sort order spelled out — `deadline_at` asc, `created_at` desc tiebreaker.
- FR-004: even the fallback behavior is specified ("falls back to opening `https://app.attio.com/{workspace_slug}/tasks` (list view) if Attio later changes the deep-link contract").
- FR-005: success and failure behavior both specified ("If the API call fails, the notification reports the error and the list does not refresh").
- FR-042: per-type input UX enumerated with what each type's affordance is.

Addendum §H is exceptional for done-ness: the table of (attribute type → input UX → API value shape → V1 notes) is the kind of artifact engineers can implement directly against.

A handful of adjectives slip through without bounds:

- FR-035: "drill-down items use the same FastAlfred ScriptFilter pattern" — fine, technical.
- FR-036: "gracefully degrade" — the _what_ is specified ("empty fields are omitted, not rendered as `—` or `null`") so this one is earned.
- NFR-002: "typical home/office connection" — undefined, but the p95 budget at least quantifies the consequence.

The single adjective that genuinely lacks a bound is NFR-007's "Offline — showing cached data" — what counts as "offline"? Network unreachable? 5xx after retry? First DNS failure? Downstream story creation will need this resolved.

### Findings

- **low** "Offline" is undefined (§6 NFR-007) — The trigger condition for the "Offline — showing cached data" prefix item is not specified. _Fix:_ name the detection rule (e.g. "network request rejected at socket layer, OR Attio returns 5xx after the single retry in NFR-005").
- **low** "Typical home/office connection" is unbounded (§6 NFR-002) — undefined baseline for the 1.5s p95 budget. _Fix:_ either drop the qualifier or pin it ("assuming round-trip latency to `api.attio.com` under 200 ms").

## Scope honesty — strong

Non-goals are explicit and they do real work. NG1 names the deferral (creation), NG2 names what got carved back in mid-session (scalar edits) and what stayed out (non-scalar), NG3 prevents sync-engine scope creep, NG5 dispatches the "client" wording from the brain dump with a pointer to the decision log, NG6 reserves destructive ops. Each NG names a reason or a future-path, not just "out of scope."

The de-scoping in NG2 is the cleanest example of scope honesty: "Editing non-scalar attribute types in V1 … Deferred to V2 because each requires a distinct multi-step UX (additive vs replace, sub-field selection, confirmation for destructive change). Scalar field updates ARE in scope (F-G)." The PRD pays the full price of being explicit about the carve-out.

§9 ("Out of scope for V1, planned for V2") is six concrete V2 entries, each with the why. V2-3 names the trade-off the V2 OAuth design will need to swallow ("accepting the trust + hosting cost trade-off"). V2-6 is honest about its uncertainty ("Possibly: bulk actions …").

Open-items density is appropriate for stakes: §8 has three remaining open items, all build-time technical confirmations rather than product decisions. There are no `[ASSUMPTION: …]` tags inline, which is consistent with a PRD where the author _is_ the user — but it means the PRD has no Assumptions Index to verify against. This is fine at this scale but worth noting.

### Findings

- **low** No inline `[ASSUMPTION: …]` tags or Assumptions Index — Given the author is also the user, this is defensible, but FR-004 ("This URL shape is undocumented") and FR-025 ("`GET /v2/self` or equivalent — confirm at build") are functioning as un-tagged assumptions. _Fix:_ tag them inline (e.g. `[ASSUMPTION: identity endpoint is GET /v2/self; confirm at build]`) so they appear in a future Assumptions Index if one is added.

## Downstream usability — adequate

The PRD will feed story creation more than architecture (architecture is mostly already in the addendum). FR / UJ / SM / NFR / NG IDs are contiguous and unique on a spot-check:

- FRs: 001–046 contiguous, FR-029 explicitly reserved ("_(Reserved for V2: OAuth flow keyword.)_") — flagged correctly so the gap is not a continuity bug.
- NFRs: 001–016 contiguous.
- UJs: 1–4 contiguous, each with a named protagonist (Paul, Paul, Sarah, Paul). UJ-2/UJ-4 both belong to Paul which is fine but worth noting for traceability.
- Goals G1–G4, NGs 1–6, Ms 1–6, V2s 1–6 all contiguous.

Cross-references are mostly resolvable: "See addendum §A", "see [[client-semantics]] in the decision log", "see [[lifecycle-config]] in addendum". The `[[lifecycle-config]]` wikilink in FR-033 has no matching section in the addendum (§D discusses workspace customization but is not labeled `lifecycle-config`); that is a broken cross-reference at the level of a wikilink target.

There is no Glossary section. For a PRD this size with this much domain overlap (Attio's terms: object, slug, attribute, workspace member, record-reference, lifecycle attribute, PAT, scalar/non-scalar) a small glossary would help future contributors. Domain nouns are used consistently in the body so the absence is not actively harmful — but the rubric flags this dimension specifically and a Glossary is missing.

The "see addendum §A" pattern works because addendum sections are letter-labeled. Each FR section makes sense pulled out alone except for places that reference UJs ("anchors UJ-1") — but UJ context is needed to ground the keystroke choices, so that coupling is load-bearing not editorial laziness.

### Findings

- **medium** No Glossary section — Domain nouns (object, slug, attribute, workspace member, record-reference, lifecycle attribute, scalar/non-scalar, PAT) are used consistently but undefined. For future contributors, especially non-Attio-native ones, even a 10-term Glossary would lower the onboarding cost. _Fix:_ add §10 Glossary defining: Attio object, slug, attribute, workspace member, record-reference, lifecycle attribute, scalar vs non-scalar attribute, PAT, Quick Look, drill-down.
- **medium** Broken wikilink at FR-033 — `[[lifecycle-config]] in addendum` does not resolve; addendum §D discusses workspace customization generally but has no `lifecycle-config` anchor. _Fix:_ either rename addendum §D's relevant subsection to `lifecycle-config` or change the wikilink target to `addendum §D`.
- **low** Two of four UJs belong to Paul — UJ-1, UJ-2, UJ-4 all star Paul; only UJ-3 (install) uses Sarah. The protagonists are distinguishable but the "named protagonist carrying context inline" pattern is slightly weakened by repetition. _Fix:_ none required; flag only for awareness.

## Shape fit — strong

The PRD is shaped correctly for what it is. The shape options the rubric lists map cleanly: this is a **hobby / solo + chain-top + meaningful UX** product — solo-authored OSS, will feed story creation downstream, and Alfred UX is load-bearing (the entire value proposition is keystroke economy). The PRD treats it as such:

- UJs are present and load-bearing because keystroke flows are the product. Each UJ walks through keystrokes (`⌥space`, `todo`, **⏎**, **⌘⏎**, **⇧**, **→**) at the granularity an Alfred-UX-aware reader needs.
- Persona section is collapsed inline per §3 — correct for a hobby/solo PRD.
- Success Metrics are appropriately operational/community-signal-based given the no-telemetry stance and stakes.
- Capability-spec elements (the FR table density, the addendum's API and payload matrices) are present because story creation will need them.

The PRD is not over-formalized — there is no compliance traceability matrix or stakeholder approval section masquerading. It is not under-formalized — FR coverage and the addendum together carry enough for an implementer.

The one shape question worth flagging: §3 names the audience as Attio users (sales reps, AEs, CS, founders) but the PRD itself states the audience is "the developer himself (Florian) and any future contributors" (per the validation context). The PRD reads as if it is for a product audience, not for Florian. This is mostly fine — UJs grounded in real-user moments are exactly what good PRDs do — but it means the PRD reads slightly more formal than its stakes warrant. Not a defect, just a calibration note.

### Findings

None at fix-worthy severity.

## Mechanical notes

- **Glossary drift:** consistent usage across the PRD on domain nouns. `person`/`people` is the only case to watch — addendum §F.1 calls out the rename `people` → `person` in `info.plist`, and §B references both "people 10 minutes" (NFR-004) and the new keyword names. No drift in the body, but the migration step is the bridge.
- **ID continuity:** FR 001–046 contiguous (FR-029 reserved-and-labeled). NFR 001–016 contiguous. UJ 1–4, G 1–4, NG 1–6, M 1–6, V2 1–6 contiguous. No duplicates spot-checked.
- **Cross-references:**
  - `[[client-semantics]] in the decision log` — referenced from NG5, target is in `.decision-log.md`, treated as out of scope for this review.
  - `[[lifecycle-config]] in addendum` — broken (no matching anchor in addendum.md). Logged as a Downstream usability finding above.
  - "See addendum §A" / "§H" / "§D" — resolve correctly.
- **Assumptions Index roundtrip:** no inline `[ASSUMPTION]` tags, no Assumptions Index. Defensible at this scale; noted in Scope honesty.
- **UJ protagonist naming:** every UJ has a named protagonist (Paul × 3, Sarah × 1) with context inline. No floating UJs.
- **Required sections for stakes / product type:** Context, Goals/Non-goals, Users, UJs, FRs, NFRs, Success Metrics, Open Questions, V2 scope — all present. Glossary is missing (flagged). Decision Log exists as a separate file per the validation context.
