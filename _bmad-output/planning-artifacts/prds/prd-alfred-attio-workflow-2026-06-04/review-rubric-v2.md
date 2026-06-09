# PRD Quality Review — Alfred Workflow for Attio CRM (v2)

## Overall verdict

This is a substantially stronger PRD than its first cut. The Update pass closed the three earlier-cited critical gaps (cache invalidation is now its own cross-cutting FR-047; datetime timezone behavior is explicit in FR-042 and §H; record-reference target fallback is FR-048), removed the persona theater (Paul/Sarah → "the user"), and reframed success metrics honestly to admit the thesis-validation gap forced by the no-telemetry stance (NFR-009). What's still at risk is mostly structural debris from the late F-G expansion: the new FRs land in the right places but introduce a handful of forward references, one FR-ID collision in addendum §F, and a noticeable density tilt toward field-edit mechanics in a PRD whose top-line thesis is read-first ergonomics. None of these are critical or high; the PRD is now decision-ready and downstream-extractable.

## Decision-readiness — strong

The PRD now states real decisions and names what was traded for what. The OAuth-in-V1 → PAT-in-V1 reversal is documented in addendum §C.1 ("Embedding `client_secret` in a publicly distributed `.alfredworkflow` is incompatible with public OSS distribution"). NG2 explicitly carves "creation requires multi-step input UX, per-workspace attribute discovery … all of which exceed V1's design budget." FR-031's 24h attribute-definition TTL now justifies itself ("attribute schemas change rarely … the trade-off is that admin-added options take up to 24h"). NFR-004 carries per-object TTL justifications. FR-019 names what's bought by going single-level ("simpler state machine, no recursive refresh contracts, predictable cache invalidation" — phrased via the V2 deferral). NG6 is new and useful. §8 honestly distinguishes "open questions" from "build-time confirmations" and admits there are no real open product questions left.

The single `[NOTE FOR PM]` at FR-004 (task deep-link fragility) lands at a genuine tension. The PRD does not pretend the success metrics measure the thesis — §7 leads with "no quantitative metric for thesis validation" and names the single-instrument dependency on GitHub Issues. That admission is more useful than the prior M-1…M-6 with fake thresholds.

### Findings

- **low** §2 NG1 implies F-G adequately but does not cross-link (§2 NG1) — NG1 says "Updating fields on records that already exist is in scope (see F-G)" which is good, but NG2 also lists "value clearing/deletion" without explicitly noting this is the _only_ clearing semantics in V1 (no edit affordance ever clears). A reader scanning NG2 alongside FR-040 may infer empty input clears the field. _Fix:_ add "(sending empty value to clear is not supported — see addendum §H)" to NG2 to close the loop.

## Substance over theater — strong

The persona section was the prior round's clearest theater and it's been demolished cleanly. §3 is now a single short paragraph naming why role-neutral phrasing is the honest choice given V1's role-uniform capabilities, with a forward note that named protagonists return in V2 if role-aware filters land. That's the right call. Vision/context in §1 is product-specific (Attio + Alfred + 1–3 keystrokes) — not swappable into any CRM PRD.

NFRs no longer read as boilerplate. NFR-001 explicitly disclaims quantitative thresholds because no runtime telemetry ships, and instead pins itself to a concrete `npm run perf` script run pre-release. NFR-006a (concurrency) is the kind of section a PRD would normally skip — its presence and its frank "later writer wins on disk … acceptable because" reasoning is the opposite of theater.

The glossary in §10 is earned, not decorative — it includes domain terms (Object, Slug, Scalar vs non-scalar, Lifecycle attribute) that are actually used identically across the FRs.

### Findings

- **low** §4 UJ-3 closing paragraph ("This V1 flow is honest about its constraints…") (§4 UJ-3) — the meta-commentary is useful as PRD prose but reads as a note to the reviewer, not a journey beat. _Fix:_ either move this paragraph to a `[NOTE FOR PM]` callout under §4 or to F-C as a rationale block; leave UJ-3 as the journey itself.

## Strategic coherence — adequate

The thesis is stated and load-bearing: "collapse the 'switch to Attio to do one small thing' pattern into 1–3 keystrokes" (§1). The feature prioritization mostly follows: F-A (todo) and F-B (search) are the high-frequency read paths the thesis bets on; F-C/F-D are the table-stakes plumbing; F-E is rendering; F-F is localization. F-G (field updates) lands as a thesis-extending bet — UJ-4 is well-chosen to anchor it.

What's now somewhat at risk is _balance_. F-G is the heaviest feature group (12 FRs, FR-040 through FR-051) in a PRD whose §1 leads with "read-first ergonomics and three in-place mutation actions." Three actions in §1 vs twelve FRs of mechanics in §5 is a real density tilt. The decision log shows this was a conscious mid-process scope expansion. The PRD body acknowledges this implicitly (FR-049, FR-050, FR-051 are all guardrail FRs for the new surface) but the §1 framing was not updated to reflect that F-G is now a co-headline feature alongside read.

Success metrics validate the thesis only weakly. §7 admits this and offers the V2-7 telemetry deferral and the qualitative-interview option as honest exits, which is the right call given NFR-009. Counter-metrics M-4/M-5/M-6 (setup-friction, rate-limit, perceived perf) are well-chosen as friction signals.

### Findings

- **medium** §1 framing under-counts F-G's weight (§1, §5 F-G) — §1 says "read-first ergonomics and three in-place mutation actions — mark a task complete, attach a note, and update a scalar attribute". The "three" reads as countable when in fact F-G covers ~10 attribute types via FR-040, sub-search UX (FR-042), permission marker UX (FR-050), and a new cross-cutting cache contract (FR-047). _Fix:_ either rephrase §1 to "read-first ergonomics plus an in-place editing surface for scalar attributes" or add one sentence under §1 acknowledging F-G is a co-headline. Otherwise downstream UX/architecture readers will under-budget F-G.
- **low** §7 counter-metric weight (§7) — M-4/M-5/M-6 are well-chosen but no counter-metric exists for F-G specifically. Given F-G is the riskiest user-visible surface in V1, "issues mentioning 'edit', 'wrong value', 'saved wrong'" would be a worth-naming friction signal. _Fix:_ add an M-7 or expand M-4 to explicitly include edit-related friction issues.

## Done-ness clarity — strong

Most FRs carry at least one testable consequence and the late-added F-G FRs are notably specific. FR-005 names what the success notification says and what happens on failure. FR-017 specifies whitespace handling, control-character stripping, and the difference between single-line (newlines stripped) and multi-line (newlines preserved) — this is the level of detail the prior round was missing. FR-031 specifies cache key and TTL. FR-042 row-by-row specifies inputs and parse-error behavior. FR-043 specifies the success notification format and the failure path. FR-046 specifies the loading-state mechanism (`pending=<field_slug>` query argument, worker polls). FR-051 specifies HTTP status → user-visible copy mappings, which is the strongest "done" definition I'd expect for an error contract.

NFR-A is honest about the impossibility of asserted thresholds without telemetry and replaces them with a `npm run perf` baseline. That is testable in a different way (the script either runs or doesn't) and downstream-extractable.

The one residual softness is in NFR-001's prose ("feel instant", "in a single render frame", "no perceptible spinner"). These are adjectives where bounds were possible — even a wall-clock target ("< 50 ms from keystroke to first paint on a warm cache") would be more useful than "no perceptible spinner." That said, the `npm run perf` script is the de-facto threshold and the addendum §G distribution checklist commits to its existence.

### Findings

- **low** NFR-001/NFR-002 adjectives where numbers were possible (§6 NFR-A) — "feel instant", "under a couple of seconds", "perceptible delay" are adjectives. _Fix:_ either pin one wall-clock target each (warm-cache < 50 ms, cold path < 2s p50) or rename the section to "perf baseline" and point at `npm run perf` as the contract.

## Scope honesty — strong

Non-goals are explicit and reasoned: NG1 (creation), NG2 (non-scalar edits and clearing), NG3 (sync engine), NG4 (bulk), NG5 (`client` keyword), NG6 (destructive operations — new and useful). Each gets a one-line "why" or forward-reference to V2. §9 V2-1 through V2-10 maps onto the NGs cleanly and adds V2-7 (telemetry) and V2-9 (Attio-attribute-type cadence policy).

Inline `[ASSUMPTION]` tags are used judiciously and indexed in §8: FR-004 (task deep-link URL pattern) and FR-025 (identity endpoint name) are both genuine inferences not yet confirmed against the live API. The `[NOTE FOR PM]` at FR-004 is at a real tension (task deep-link fragility), not a safe checkpoint. §8 admits no open _product_ questions and lists three build-time decisions (macOS floor, license, Alfred Gallery timing) deferred to engineering — that's honest.

Open-items density is low relative to stakes. A public OSS workflow PRD that ships with 2 `[ASSUMPTION]`s and 1 `[NOTE FOR PM]` after a discovery-and-update cycle is right-sized.

### Findings

_(none)_

## Downstream usability — adequate

§10 glossary is new and useful. Domain nouns (Object, Slug, Attribute, Scalar, Record, Record-reference, Workspace, Workspace member, Lifecycle attribute, PAT, Quick Look, Drill-down, `web_url`) are defined once and used consistently across §5 and addendum §H. FRs cross-reference each other by ID (FR-005 → FR-047/FR-051; FR-042 → FR-048; FR-047 names FR-005/FR-016/FR-017/FR-043; FR-049/FR-050 reference FR-031/FR-028/FR-026).

Where this dimension drops from "strong" to "adequate" is mechanical hygiene at the FR-IDs and cross-references:

1. **FR-ID collision in addendum §F.** The migration checklist has two items numbered "7" — `7` (Centralize all UI strings) and `7` (Add `src/common/tz.ts`). The second should be `7a` per the existing convention used at `7b` ("Add `src/common/cache.ts`"). A downstream reader extracting the migration checklist by line number will skip an item.
2. **FR-029 is reserved but never referenced.** "FR-029 — _(Reserved for V2: OAuth flow keyword.)_" is a placeholder with no current use. Either tag it `[ASSUMPTION/V2]` or remove it; reserved-but-empty FRs make ID-roundtrip tooling brittle.
3. **NFR-006a is a sub-ID that breaks the otherwise contiguous NFR-NNN scheme.** All other NFRs are 3-digit; NFR-006a is the only sub-letter ID. It's fine semantically (concurrency is a sub-topic of caching/rate-limiting) but breaks the count if a tool does `NFR-${zero-pad}`.
4. **Stale ID reference.** FR-008 references "the localization layer (FR-037)" — correct. But FR-002 ("Missing links are silently omitted (no `null` artefacts)") implicitly relies on the FR-036 "graceful degradation" contract without cross-reference. Minor.
5. **Addendum §D references "FR-035 (graceful degradation)"** — but FR-035 is "Drill-down items use the same FastAlfred ScriptFilter pattern". The graceful-degradation FR is FR-036. This is a real broken cross-reference. The §D sentence ("This is why FR-035 (graceful degradation) is non-negotiable") should be FR-036.
6. **Addendum §B references FR-027 for "resolve 'me'"** — but FR-027 is the multi-workspace non-support FR. The "resolve me" FR is FR-025. Broken cross-reference.
7. UJ protagonist naming: §3 acknowledges "the user" is intentionally role-neutral. All four UJs use "The user". Consistent.
8. Each section makes sense pulled out alone, with one caveat — F-G assumes the reader knows what "drill-down" means; §10 glossary now solves that.

### Findings

- **medium** Broken cross-reference: addendum §D "FR-035 (graceful degradation)" (addendum §D) — FR-035 is "ScriptFilter pattern"; the graceful-degradation FR is FR-036. _Fix:_ change "FR-035" to "FR-036" in §D.
- **medium** Broken cross-reference: addendum §B "GET /v2/workspace_members | For FR-027 (resolve 'me')" (addendum §A) — FR-027 is the multi-workspace non-support FR; the "resolve me" FR is FR-025. _Fix:_ change "FR-027" to "FR-025" in addendum §A's table row.
- **low** Duplicate item number in addendum §F migration checklist (addendum §F) — items `7` (centralize strings) and `7` (tz.ts) collide; the second should be `7a` to match the existing `7b` convention. _Fix:_ renumber the tz item as `7a`.
- **low** FR-029 reserved-but-empty (§5 F-C) — "_(Reserved for V2: OAuth flow keyword.)_" with no use is fragile against ID-roundtrip tooling. _Fix:_ either drop FR-029 and accept the gap (note in §8 if a contiguous-ID tool complains) or move "Reserved for V2" out of the FR list into §9.
- **low** NFR-006a sub-letter ID breaks the otherwise-flat NFR scheme (§6 NFR-B) — only sub-letter ID in the document. _Fix:_ either renumber as NFR-007 and shift subsequent NFRs, or leave a `[NOTE FOR PM]` that NFR-006a is intentional and tooling should accept letter-suffixed NFR IDs.

## Shape fit — strong

The PRD shape fits the product. This is a chain-top, public-distribution OSS workflow PRD that will feed UX → architecture → stories, so downstream-usability rigor is warranted and present (glossary, contiguous FRs modulo the small breaks noted above, cross-references). It's a single-operator consumer tool (one user at their Mac, no admin/end-user split), so the role-neutral "the user" framing and the four UJs are the right load-bearing weight — not overformalized.

Brownfield references in addendum §F ("the current `src/main/people.ts` already implements …") are accurate (this matches the current branch state). New behavior vs existing behavior is distinguished (rename keyword, add modifiers, replace TTL constants).

Success metrics are operational-qualitative rather than user-facing-quantitative, which matches the shape (community OSS, no telemetry, single-maintainer cadence).

### Findings

_(none)_

## Mechanical notes

- **Glossary drift:** None observed in the body. §10 defines all domain terms used in §5 and addendum §H. Minor inconsistency: §1 uses "scalar attribute" but glossary defines "Scalar vs non-scalar attribute" — the definition covers it but a search for the exact term "scalar attribute" only resolves via prose proximity. Acceptable.
- **ID continuity:**
  - FRs FR-001 → FR-051, contiguous except FR-029 (reserved-but-empty placeholder).
  - NFRs NFR-001 → NFR-016 plus NFR-006a (the one sub-letter ID).
  - UJs UJ-1 → UJ-4. All four have a named protagonist ("the user").
  - Mn IDs M-1 → M-6 contiguous.
  - V2-1 → V2-10 contiguous.
  - F-A → F-G contiguous, alphabetical.
- **Broken cross-references:**
  - Addendum §D says "FR-035 (graceful degradation)" — should be FR-036.
  - Addendum §A table says "For FR-027 (resolve 'me')" — should be FR-025.
- **Assumptions Index roundtrip:** §8 names 2 inline `[ASSUMPTION]`s (FR-004, FR-025). Both appear inline. Index complete. No orphan tags.
- **UJ protagonist naming:** All four UJs use "the user" consistently. §3 names why this is intentional.
- **Required sections present:** §1 Context · §2 Goals/Non-goals · §3 Users · §4 UJs · §5 FRs · §6 NFRs · §7 Success metrics · §8 Open questions · §9 V2 · §10 Glossary. All seven rubric-required dimensions have coverage in the PRD body.
- **Decision log:** Comprehensive and traceable; documents the OAuth → PAT reversal, the F-G scope expansion, and the four validation-update real-choice resolutions.
- **Addendum §F duplicate item-number `7`:** noted above; minor numbering hygiene issue.
