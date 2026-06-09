# Adversarial Review — Alfred Workflow for Attio CRM UX Spines (DESIGN.md + EXPERIENCE.md)

## Headline verdict

These two spines are confident but not shippable. The "mirror Attio" stance is undefended on the only axis that matters for a public OSS workflow — trademark, trade-dress, and the implied origin claim that "frictionless extension of Attio, not a third-party tool grafted on top" walks straight into; meanwhile the spec's surface-level discipline (1–3 keystrokes, single-accent, single-level drill-down, read-only Quick Look) starts collapsing the moment you walk a real flow against it. UJ-4's stage update is 4 keystrokes minimum (5 by the spine's own narration); KF-1's task subtitle silently contradicts the PRD's FR-013 mapping; the lifecycle-override subtitle pattern in §Result-list-item.Lifecycle-override (FR-033) explicitly exceeds three subtitle segments without acknowledging that Alfred's row will truncate; the FR microcopy catalogue ships untranslated FR strings that are sometimes English-shaped ("recoller dans la config", "Token changé", "Aucun·e {object}") and at least one is grammatically wrong; and Florence is the same decorative persona Paul was, with the same problem — she does no work the journey couldn't do without her.

## Findings

### Critical — The "mirror Attio" stance is a trademark/trade-dress problem the spec does not flag

DESIGN.md §Brand & Style: "the experience must read as a frictionless extension of Attio, not a third-party tool grafted on top." DESIGN.md §Components opens the Quick Look fiche with "the workflow's flagship visual artifact… fiches that read like a record card from Attio, not a generic preview web page." The README, GitHub release page, and Alfred Gallery listing are committed to inherit the same Attio register.

This is the textbook definition of trade-dress imitation. The PRD names this as an open-source GitHub-distributed workflow (G3) authored by a single maintainer (Florian). A non-Attio third party shipping software whose explicit design directive is to read as a first-party extension of Attio's UI, distributed under a name that includes "Attio" (the repo is `alfred-attio-workflow`, info.plist will mention Attio per NFR-015), with visual tokens deliberately reverse-engineered from Attio's marketing site, creates several legal exposures the spec does not address:

1. **Trade-dress / passing-off.** "Reads as a frictionless extension" is the harm test, not the goal. Even in jurisdictions without registered trade dress, an end-user who installs the workflow and concludes "this is by Attio" is the standard the spec is aiming at. Attio's counsel would have a clean letter.
2. **Trademark on "Attio".** The PRD names `attio:diag`, `attio:refresh`, the package name, the README title, and the Alfred Gallery listing as all using "Attio". Nominative fair use covers "for use with Attio" framing. It does not cover "by Attio" framing. The spec defaults toward the second. There is no `## Attribution & non-affiliation` section in either DESIGN.md or EXPERIENCE.md, no disclaimer microcopy in `attio:diag`, no first-run notice like "Unofficial workflow — not affiliated with Attio Inc.", and the README plan in NFR-014 does not list "non-affiliation disclosure" as a required section.
3. **Tiempos / Inter.** DESIGN.md correctly excludes Tiempos (commercial license, can't bundle in OSS) but the [ASSUMPTION] block on line 178 reads as "we'd ship it if we could." Inter (SIL OFL) is fine to bundle, but the spec doesn't actually say whether Inter is bundled with the `.alfredworkflow` or relied on as a system font; Quick Look HTML's `font-family: Inter Display, Inter, system-ui, …` fallback chain leaks the assumption that Inter is installed system-wide on the user's mac, which it is not on a default macOS.
4. **Color tokens.** `#266df0` is presumably reverse-engineered from an Attio surface. Colors aren't copyrightable, but the broader pattern — same accent, same near-black ink, same negative tracking, same sentence/uppercase label register — is what "trade dress" means in aggregate.
5. **Icons.** §Components.Alfred-result-list-item commits to "Attio-faithful icon" canvas conventions, with a Lucide fallback "if an Attio-faithful icon isn't available." This means the V1 happy path is _to ship icons traced from Attio's set_. That is a copyright exposure independent of the trademark issue, and the spec has no licensing audit for the icon assets.

**Fix.** (a) Reframe the brand directive from "mirror Attio" to "register-compatible with Attio without claiming origin." (b) Add a required microcopy slot to the spec for non-affiliation: at minimum a first-run notification "Unofficial workflow for Attio — not affiliated with Attio Inc." in EN+FR, a `attio:diag` row "Unofficial workflow · github.com/<user>/alfred-attio-workflow", and a README-level disclaimer section. (c) Commit V1 to Lucide (or another SIL/MIT-licensed set) for all object icons, full stop — no "Attio-faithful icon" path that risks tracing. (d) State explicitly that Inter is bundled with the workflow (OFL allows this) and ship the WOFF2 in the cache directory, not relied upon as a system font. (e) Add an explicit license declaration to the README plan (PRD already flags this gap; the UX spines should _require_ the disclaimer microcopy regardless of which license is chosen).

### Critical — UJ-4's "deal stage update" exceeds 3 keystrokes; the spine narrates 4–5 and counts none

EXPERIENCE.md §Design constraint says: "Flows that exceed 3 keystrokes are deferred to V2 (creation; multi-select edit) or require a configuration step done once (PAT paste). A change to the spec that adds a keystroke to a common path requires explicit decision-log justification." KF-4 is **the** anchor flow for F-G and the climax demo of in-place editing.

Let's count KF-4 honestly (EXPERIENCE.md lines 291–298):

1. ⌥space — summon Alfred (the constraint defines 1-keystroke flow as "user types the keyword + query, hits ⏎"; ⌥space is the launcher and is fair to exclude, but the spec is silent on the convention).
2. Types `deal acme series a` — multi-character query.
3. ⏎ on the result list. **Spec says default ⏎ "opens in Attio" (FR-014).** Per EXPERIENCE.md line 291 step 1: "⌥space → types `deal acme series a` → ⏎ result list shows the deal at top." This is either a typo for "no ⏎, just select" or an actual ⏎ that contradicts the default action — in which case Florence just _opened the deal in Attio_, which is exactly the context flip she was avoiding. Step 2 then says "→ drill-down" as if no Attio tab opened.
4. → drill-down. (Keystroke 2 by the spec's count: keyword + query + drill-down.)
5. Down-arrow to `Stage: Discovery`. (Arrow navigation. EXPERIENCE.md §Interaction Primitives does not list down-arrow at all. Either it doesn't count, or it does and the count breaks.)
6. ⏎ to open the picker. (Keystroke 3.)
7. Types `nego` to filter the picker.
8. ⏎ on Negotiation. (Keystroke 4. Over budget.)
9. Backspace. (Keystroke 5. Over budget.)
10. ⎋ to close Alfred.

That is at minimum 4 keystrokes (drill-down ⏎ on field row, type-to-filter, ⏎ on option, backspace to return), and the spec sells it as "Total elapsed: ~6 seconds. The Attio web UI is never visible." It says nothing about the keystroke budget breach. The constraint section's escape hatch ("flows that exceed 3 are deferred to V2 or require a configuration step done once") doesn't apply — UJ-4 is a V1 anchored journey for F-G.

The same problem hits KF-2 lighter: ⌥space + `person florian` + ⇧ + ⌘C + ⇧ + ⎋ + ⌘V is 4+ depending on how you count Quick Look open/close and the macOS clipboard ops. KF-1 step 4 says "Without leaving Alfred, she presses ⌘⏎" — fine — but to mark three tasks complete she presses ⌘⏎ three times across three rows, which means three down-arrows interleaved. Same omission of arrow keys.

**Fix.** Either (a) drop the "1–3 keystrokes" claim from the experience-level constraint to "1–3 _deliberate_ keystrokes excluding arrow navigation and modifier-only presses" and re-walk every key flow to confirm; or (b) keep the constraint and acknowledge UJ-4/F-G as a budgeted exception — "Field editing trades the 3-keystroke ceiling for the 5-second ceiling; the design objective for F-G is wall-clock time, not keystroke count" — and re-write KF-4 to count honestly. The current state, where the constraint is asserted and the anchor flow violates it without comment, is the worst of both.

### Critical — KF-1 task subtitle contradicts FR-013 (PRD source of truth)

PRD FR-013: task context line is **"deadline + completion status"**. EXPERIENCE.md KF-1 step 2 says task subtitle is **"`{person} · {deal} · {company}`"**. These are different fields with different cardinality. The PRD's version answers "is this overdue, am I done with it" (correct for a todo list). The EXPERIENCE.md version answers "what record is this task about" (which is what the _title row above the subtitle_ already partly answers since FR-002 says the task content line _already_ renders content + linked-person + linked-deal + linked-company).

The deeper bug: FR-002 (task list, anchored UJ-1) defines the line as "task content, linked person name, linked deal name, linked company name on one line" and explicitly omits deadline from the visible line. FR-013 (search context line, anchored UJ-2) says task subtitle is "deadline + completion status." Whether the `todo` keyword and the `task <query>` keyword should render tasks identically is itself an open product question the PRD doesn't resolve. EXPERIENCE.md picks the FR-002 shape (person/deal/company) for the `todo` subtitle and applies it generally to KF-1, then ignores FR-013 for the `task <query>` flow which has no key flow narrated at all. The subtitle separator convention in §Layout & Spacing (`·`) is also ill-suited to FR-002's "content, then person, then deal, then company" — that's a title with three context segments, not three peer segments. The current spec rendering would read "Follow up on proposal · Florian Marin · Acme Series A · Acme Corp" which puts the action verb in the subtitle slot alongside three subjects with no semantic differentiation.

**Fix.** Pick one rendering for tasks across `todo` and `task <query>`, and align the experience spine to whichever the PRD says. If the PRD is wrong (which it might be: a `todo` row arguably wants both deadline status _and_ the linked records), file a PRD change request rather than silently diverging in EXPERIENCE.md. Also commit the title/subtitle split for tasks: title = task content; subtitle = `<deadline_status> · <person> · <deal> · <company>` or some defended subset.

### High — Lifecycle-override subtitle (FR-033) is a fourth segment Alfred will truncate

EXPERIENCE.md §Result-list-item.Lifecycle-override (line 142): "Example for a person with `LIFECYCLE_ATTRIBUTE_PERSON=lifecycle_stage`: `CTO · Acme Corp · Customer`." That's three segments and looks fine. But FR-013's default for a person is "job title + company name" — two segments. The lifecycle override adds a _third_: this is the example shown. So far so good.

Now apply the same reasoning to a **deal**. FR-013 says deal context = "stage + value." Two segments. Add FR-033 lifecycle override → three segments: `Discovery · $50,000 · Customer`. But for deals, the lifecycle override is _the stage_, isn't it? Or is it a separate "deal lifecycle" attribute distinct from the stage? The PRD FR-033 names lifecycle attribute slugs per object; deals already have a stage. If a workspace's "deal lifecycle attribute slug" is the same as the deal's stage attribute, the row reads `Discovery · $50,000 · Discovery`. The EXPERIENCE.md spec does not deduplicate.

For **company**, FR-013 says context = "domain or location." That's already an OR (one or the other), not a pair. Add FR-033 → `acme.com · Customer` (two segments) or `Paris, France · Customer` — fine in width. But the OR-fallback in FR-013 is not specified in EXPERIENCE.md at all; the spine just says the lifecycle "appends to the FR-013 default" without saying what the FR-013 default _is_ when domain and location are both present (does it pick one? show both?).

Alfred subtitle width is fixed by the Alfred theme. Three segments at `body-sm` with `·` separators will routinely hit truncation, especially in dark themes with larger row heights or for long stage labels ("Customer Success Onboarding"). EXPERIENCE.md §Foundation.Form-factor concedes Alfred owns row height and padding, but the spine then designs a 3-or-4-segment subtitle and never says what happens when it overflows. There is no truncation-priority rule (first segment wins? last segment wins? middle ellipses?).

**Fix.** Specify (a) the truncation priority per object — "If the subtitle overflows, segments are dropped in this order: …" or "Each segment is independently truncated to N chars before joining"; (b) the deal-stage-vs-lifecycle deduplication rule when they collide; (c) the company `domain or location` resolver — which one wins? both? Decision-logged.

### High — Quick Look read-only is the right call but the spec doesn't justify the keystroke cost

EXPERIENCE.md §Quick Look fiche line 146: "⇧ Quick Look is read-only. To act on the record, the user closes Quick Look (⇧ again or any other key) and uses ⏎, →, or a mod from the parent list." This is defensible — Quick Look's spec contract from Alfred has no mod-passthrough, and a read-only stance is honest. But:

KF-2 demonstrates the cost: "She presses ⇧. Quick Look opens with Florian's full fiche… **She drags her cursor over the email value, ⌘C copies it (standard macOS selection).** She presses ⇧ to close Quick Look, closes Alfred with ⎋, pastes the email into Gmail."

This breaks the spec's own no-mouse claim (§Interaction Primitives line 199: "Mouse is not used (Alfred is a launcher)"). The flow uses a cursor drag to highlight text in the HTML pane. That is a mouse operation. The alternatives — keyboard-select inside the Alfred Quick Look HTML pane — are not commonly supported and the spec doesn't say whether macOS keyboard-only selection works in Alfred's WebView. If it doesn't, the _only_ way to copy a field value from Quick Look is the mouse. That should be flagged as a design constraint, not narrated as if it were a smooth keyboard flow.

Adjacent question the spec ducks: why is Quick Look read-only when Alfred's Quick Look pane natively supports mod-passthrough on dismissal (closing Quick Look returns focus to the result row with mods intact)? The spec asserts "Quick Look is strictly read-only" without contrasting against an "embedded actions" or "mod-passthrough" alternative. The PRD doesn't mandate read-only; FR-018 says "Quick Look — readonly fiche of the record's key fields." That's "readonly fiche" describing the _content_, not the _interaction model_ — arguably the fiche shows readonly fields but ⌘⏎ from Quick Look could still mark a task complete. The spine has converted "readonly content" into "no actions, ever" without justifying the read.

A second adjacent question: ⌘C from the Quick Look HTML to copy an email is "an action" in the user's mental model. The spec's "Quick Look is read-only" framing miscommunicates the affordance — better framing is "Quick Look is non-mutating; reading and copying is supported, mutating is not."

**Fix.** (a) Address mouse-vs-keyboard in §Accessibility floor honestly: either ship a "press 1, 2, 3 to copy field N" keyboard shortcut inside the Quick Look HTML, or concede that field-copy is a mouse operation. (b) Re-word the "Quick Look is read-only" framing to "Quick Look is non-mutating; ⏎/mods on the parent list drive actions." (c) Document in §Open questions whether Alfred's mod-passthrough on Quick Look dismissal is reliable enough to relax the "close-then-act" requirement in V2.

### High — French translations are uneven: some natural, some English-shaped, one grammatically wrong

EXPERIENCE.md §Microcopy catalog. Let me walk each FR translation that is clearly off:

- **"Token invalide — recoller dans la config"** (401 error). "Recoller dans la config" is English imperative syntax with French words. A native FR would say "recollez-le dans la configuration" or "remplacer dans la fiche de configuration" or "le token doit être recollé dans la configuration." "Dans la config" is fine spoken slang but reads as cheap in product copy that EXPERIENCE.md is telling us to deliver in "calm, declarative, brief" register.
- **"Token changé — actualisation de l'identité"** (FR-026). "Token changé" is missing an article ("Le token a changé") and "changé" with bare-token-as-subject reads as a Slack message, not as product microcopy. A native FR notification would be "Token modifié — identité actualisée" or "Token mis à jour — rafraîchissement de l'identité."
- **"Aucun·e {object} ne correspond à « xyz »"** uses inclusive writing (point-médian) which is a deliberate stylistic choice but inconsistent with the rest of the catalog ("Tâche complétée", "Note ajoutée" — both gendered without inclusive form). Pick one stance and apply it consistently. If `{object}` expands to "personne" (f) or "société" (f) or "deal" (m) or "tâche" (f), grammatical gender agreement on adjectives downstream becomes a templating problem the catalog has not solved. The current `{object}` interpolation pattern with no gender metadata will _break_ in French — "Aucun·e deal ne correspond" reads as "Aucun deal" which is fine, but "trouvé sous l'identifiant personnalisé" (line 112) has "trouvé" agreeing with `{object}` and will be wrong for "tâche" (should be "trouvée") and "personne" (should be "trouvée"). NFR-012 says "ICU pluralization rules and grammatical-gender handling are out of scope for V1" — but the catalog is _currently broken_ for V1, not deferred.
- **"Édition impossible pour {object} — schéma indisponible, essayez refresh"** (FR-049). "Essayez refresh" is English imperative; FR is "essayez `attio:refresh`" or "lancez `attio:refresh`" with the keyword named verbatim (since that's what the user has to type).
- **"Token API Attio non configuré"** (setup prompt). Fine but a French native would say "Token API non configuré" — the word "Attio" is redundant after "Token API" because the workflow context already implies Attio. The EN version does need "Attio" because the prompt is the user's first surface and they may not know what API token is in play; in FR it reads cluttered.
- **"L'enregistrement n'existe plus dans Attio"** (404). Natural FR. Good.
- **"Connecté à {workspace_name}"** (first-success). Natural. Good.
- **"Aucune tâche prévue aujourd'hui pour {workspace_member_name}"** vs EN "No tasks due today for {workspace_member_name}". FR adds "prévue" (planned) where EN says "due" — the meaning shifts slightly. "Due today" specifically means "deadline today"; "prévue aujourd'hui" reads as "planned for today" which is a different semantic. If FR-001's scope is "due today or undated and assigned to me", the FR should mirror "due today or undated" — closer to "Aucune tâche échue aujourd'hui pour…" or "Aucune tâche à traiter aujourd'hui pour…".
- **"Hors ligne — données en cache"** is acceptable but "hors-ligne" with the hyphen is more common. Minor.
- **"Format attendu : AAAA-MM-JJ"** — date format displayed as `AAAA-MM-JJ` is correct for French (Année-Mois-Jour). Good.
- **"Format attendu : AAAA-MM-JJTHH:MM"** — but `T` is the ISO-8601 separator, not a French letter. Reads weird; consider "Format attendu : AAAA-MM-JJ HH:MM" with a space, or "ISO 8601 : AAAA-MM-JJTHH:MM" to flag the format name explicitly.
- **"Valeur numérique attendue"** (FR-042 number parse error). Natural. Good.
- **"Bonjour Florence"** never appears (good — the spec resisted adding it), but the README plan (NFR-014) is silent on whether onboarding microcopy translates.

The §Voice and tone rule "Both EN and FR ship in V1" with three short stylistic rules (direct, system-verbs, no-emoji) is fine. The catalog application of those rules in French is not natively edited. The spine reads as if EN strings were translated by a bilingual maintainer mid-write rather than reviewed by a French-native UX writer at finalize.

**Fix.** (a) Mark the FR column as "draft" at the top of the microcopy catalog and add an §Open question entry "Native FR review pass before V1.0.0 — current FR strings are author-translated and several read as English-shaped." (b) Resolve the gender-agreement breakage in `{object}`-interpolated strings before V1: either add a `{object}` lookup table with `{m/f}` flags and pluralize the participle ("trouvé"/"trouvée"), or restructure the strings to avoid agreement (`Espace de travail : {object} sous l'identifiant personnalisé "{slug}"`).

### High — Florence is the same persona theater as the PRD's Paul

The adversarial review of the PRD called out persona theater (Paul does no decision work). EXPERIENCE.md introduces Florence with the same defect:

- KF-1 protagonist: "Florence, AE at a Series-B B2B startup. Wakes up at 7:30, laptop open by 8, four tabs already loaded — Gmail, calendar, Slack, Attio dashboard. Today she has six prospects to chase." Cut Florence and the journey is unchanged: any persona using `todo` would see the same five rows, hit ⇧ on the same row, and ⌘⏎ to complete. The "AE at a Series-B" detail does no design work.
- KF-2 protagonist: same Florence. "Mid-morning, replying to a prospect's email" — generic. The flow would be identical for a CS rep replying to a ticket, a recruiter replying to a candidate, a founder replying to an intro.
- KF-3 protagonist: "Florence, day one with the workflow installed. She downloaded the `.alfredworkflow` from a blog post she saw on Hacker News." The HN-from-blog detail is decorative; it does not shape the onboarding flow (which is dictated by FR-022/023/025 regardless of acquisition channel).
- KF-4 protagonist: "Florence, mid-day, just got verbal confirmation from Acme on a Term Sheet." This is the only place where her sales-rep identity arguably matters, and even then the _requirement_ (scalar stage update) is identical for any persona. The PRD's adversarial review made the same observation about Paul on UJ-4.

Notice also: Florence is **the same persona across all four KFs**. The spine never models the secondary persona the PRD §3 explicitly defers ("when V1 capability does start to vary by role… the PRD will reintroduce named protagonists"). EXPERIENCE.md reintroduces _one_ protagonist for _all_ journeys, which surfaces no role-variation insight at all.

**Fix.** Either (a) drop Florence to "the user" in all four KFs and own that this is a generic keystroke-flow doc; or (b) make Florence shape at least one beat per flow that a different persona would _not_ do. Example for KF-1: "Florence skips ⌘⏎ on the second task — it's a follow-up call she wants logged in Attio with the call activity feed, so she ⏎-opens it instead." That justifies the existence of ⏎ alongside ⌘⏎ as a real interaction split, not just a default.

### High — Single-level drill-down breaks the spec's own "deal → linked person → edit email" pretension

EXPERIENCE.md §IA tree shows `deal row → drill-down (field edits)` and lists linked person / linked company as drill-down rows. §Drill-down list line 152 says "⏎ on a linked-record row opens that record in Attio." So if Florence is in the deal drill-down, sees "Linked person: Florian Marin," and wants to update Florian's email — she cannot. She must ⏎ to open Florian in Attio (context flip — the whole pattern the workflow exists to prevent), or back out, ⌥space → `person florian` → →. That's 3 extra interaction beats (back, summon, retype, drill).

The PRD FR-019 says drill-down is single-level "in V1" with V2-5 promising arbitrary depth. The single-level cut is defensible — but EXPERIENCE.md sells the workflow as covering "the most painful CRM-hygiene round-trips" (G2) and the deal-context update-linked-person-email is exactly that round-trip. The spec converts a 3-keystroke promise into a 7-keystroke detour for any update to a linked record, and the climax demo for that (KF-4) avoids the problem by demonstrating an _intrinsic_ deal-stage update where no link-following is needed.

The "single concession" §Drill-down list line 154 — "Linked-records grouping… expands inline into N child rows when selected" — is essentially a workaround that admits the single-level constraint is too rigid in practice. But the workaround is also under-specified: when "Linked people" expands inline, what state is the drill-down in? Is the expanded group focus-able row-by-row? Is the ⏎ on a child still "open in Attio" (per §line 152) or does it inherit some other action? The spec waves at the problem without resolving it.

**Fix.** Either (a) accept that "open linked record in Attio" is the V1 cost, document it as an explicit named limitation in §Known limitations, and add microcopy: "Linked records open in Attio — to edit, use `person`/`company`/`deal` keywords directly." Or (b) widen the V1 scope to allow ONE more level of drill-down (deal → linked person → person's editable fields) and pay the keystroke cost. The current "inline expansion" workaround is a half-step that doesn't actually solve the edit-the-linked-record use case.

### High — Microcopy catalog has at least 8 missing edge cases

EXPERIENCE.md §Microcopy catalog covers normal-path states well. Coverage gaps:

1. **Partial cache hit (one of N records cached, others not).** Spec says "cached results are shown with a one-result 'Offline — showing cached data' prefix." But what if half the result list is cached and half is fresh from API, or if the workspace identity is cached but the schema is not? The §Offline state assumes "all-cached vs all-online" but the runtime has tri-state behavior.
2. **Rate-limit spike during read (HTTP 429 sustained).** NFR-005 says one retry with backoff, then error. But the user-visible microcopy on the second 429 is undefined. The catalog has no row for "Slow down — Attio rate-limit reached, try again in {N}s."
3. **Network slow but not offline (request taking 3+ seconds, still in flight).** §State patterns shows `Loading…` after 300ms. But after 2 seconds the user thinks it crashed. No "Still loading… (Attio responding slowly)" intermediate state.
4. **Schema fetched but partial (e.g. some attribute defs returned 403 because the PAT scope is narrow).** FR-049 covers "never succeeded for this object" → suppress edit affordances. But what about "succeeded last week, refreshed today, this time three attributes are missing because the admin restricted scopes"? The catalog has no copy for "Some fields are now read-only — token scope changed."
5. **First-run identity probe partial success (workspace_id resolved, workspace_member_id not found).** Spec assumes `GET /v2/self` returns everything. What if Attio's response shape changes? Catalog has no copy for that.
6. **Multi-line note submitted via NSAlert but exceeded some Attio-side limit (HTTP 413 / 422 on body length).** No catalog row.
7. **Cache flush on token rotation conflicts with in-flight read.** Concurrency. No catalog row.
8. **Lifecycle attribute slug configured by the user but doesn't exist in the workspace's schema (typo or admin renamed).** FR-033 lifecycle config — the user pastes `lifecycle_stagee` (typo). The subtitle silently drops the segment with no signal. No catalog row.
9. **Quick Look HTML cache directory unwritable (disk full, permissions).** No catalog row.
10. **User configured `LANG=fr` override but a string is missing from `fr.json`.** Fallback behavior is unspecified (fall back to EN? show key? crash?). No catalog row.

The §State Patterns table is the right shape but only spans 5 + 9 states. The microcopy catalog should be the _exhaustive_ enumeration. It is currently the happy-path catalog.

**Fix.** Add a §Microcopy catalog — edge cases section explicitly listing these states (and the others you'll discover when you walk every FR×HTTP-status × cache-state cell). Acknowledge that the EN+FR pair will need re-review when each row is added.

### High — `attio:diag` leaks more than it claims to

EXPERIENCE.md §Maintenance & diagnostics.attio:diag, row 3: "`Token: {present | missing}` / `last hash: {short}` (never reveal the PAT)." A "short hash" of the PAT _is information about the PAT_. If the workflow uses a 4-character or 8-character SHA-256 prefix:

- 4 chars (16 bits) — collisions trivial; not useful for diagnostics, not a leak.
- 8 chars (32 bits) — still narrow but identifies the token across diagnostic reports.
- Any hash without a per-install salt is **vulnerable to dictionary/rainbow attack if a leaked PAT format is known** (Attio PATs have a predictable prefix per their docs). An attacker who scraped a diag screenshot from a community support thread could correlate the hash to a candidate token if the PAT space is bounded enough.

Worse: the diagnostic is intended for _community support_ (PRD FR-028). Users post diag output to GitHub issues. Hash leakage in a public issue is a small but real attack surface. The spec's "never reveal the PAT" is met technically but misses the threat model.

Other diagnostic-output rows that are sensitive:

- **Row 1 workspace slug** — fine, this is also in the web URL on every Attio session, low sensitivity.
- **Row 2 workspace member name + ID** — the member ID is internal; combined with the workspace slug it identifies a specific user. In a public GitHub issue this is a privacy leak (the user might not want their identity associated with a bug report about a CRM).
- **Row 5 "Last error: {ISO timestamp} · {HTTP status} · {endpoint}"** — endpoint URLs include record IDs. If the last error was on `PATCH /v2/objects/people/records/abc123`, posting that means leaking the existence of a person record with that ID in a workspace identified by row 1. Low individually but the pattern is sloppy.

The PRD adversarial review flagged "what's logged" as missing. The UX spine for `attio:diag` is the natural place to fix that and doesn't.

**Fix.** (a) Replace "last hash: {short}" with "configured ✓" only — no hash bytes at all. (b) `attio:diag` should have a one-row preface: "Copy this for support — does not contain your token or record contents" (in EN+FR). (c) Row 2 should be opt-out: "Identity included" by default but with a config flag to elide the member ID/name in diag output for users who plan to share screenshots publicly. (d) Row 5 should redact record IDs from the URL — `PATCH /v2/objects/people/records/<redacted>` — and surface the endpoint pattern only.

### Medium — Dark-mode promise has at least four under-addressed failure modes

§Colors.Dark-mode and §Open questions acknowledge that Alfred bar theming is user-owned ("the workflow only swaps icons (when the theme is dark) and chooses subtitle text that reads in both registers"). But:

1. **Icon asset swap convention is [ASSUMPTION].** §Components.Alfred-result-list-item line 241: "Alfred swaps between light/dark icon directories automatically via `@2x` and `@dark` filename conventions [ASSUMPTION: verify exact convention at build]." This is a load-bearing assumption — if the convention isn't actually `@dark`, every icon ships only in light mode and is invisible/inverted on dark themes. Should be verified before merge, not flagged for build.
2. **Subtitle contrast against arbitrary Alfred themes is unsolvable in principle.** The user can install any Alfred theme (Catppuccin, Tokyo Night, Dracula, custom). The workflow has no way to query the active theme's background color. `ink-secondary` set to `#a3a5ab` (the dark-mode value) will look fine on dark backgrounds and unreadable on cream/sepia themes. The §Open questions row "Dark-mode subtitle contrast" punts this to V1.0.0 visual QA pass — but visual QA on three themes (Alfred default dark, Catppuccin Mocha, Tokyo Night) is sampling, not solving. There is no spec for "what if the user's theme has a brown background." Alfred bar subtitle color is fundamentally Alfred-controlled; the workflow only writes the _text_, and Alfred's theme renders it. The spec mis-states the affordance: the workflow does NOT "choose subtitle text that reads in both registers" — it writes the same text, Alfred styles it. There is no choice to make.
3. **Color-coded states lose meaning in dark mode.** §Status pill says pills are outlined, no fill, and the workflow defends "type and shape carry the affordance." Good for color-blindness. But "RETARD" is the heading for overdue tasks — in the EN microcopy catalog it's "RETARD" (a French loanword? heading label?) and in §Accessibility floor line 225 it says "The 'RETARD' task group is labeled by its heading, not by red." But RETARD-in-EN is _not English_. The heading is presumably "OVERDUE" in EN and "RETARD" in FR. The spec ships only "RETARD" and doesn't localize the section heading.
4. **Dark-mode accent `#4a86ff` for the edit affordance.** Quick Look only — fine. But the §Status pill border is `outline` which in dark mode is `#34373c` against a dark `surface-raised` of `#1a1c1f`. Contrast ratio is ~1.4:1. Below WCAG AA for non-text UI components (3:1). The spec asserts dark mode meets WCAG AA but the outline-pill pattern in dark mode does not.

**Fix.** (a) Lock the icon naming convention before the spec is shippable; remove the [ASSUMPTION] block. (b) Acknowledge in §Accessibility floor that subtitle text rendering is at Alfred's mercy and the workflow cannot guarantee contrast; ship a fallback strategy (do not use color-only signals in subtitle; rely on the prefix character / icon for state). (c) Localize "RETARD" → "OVERDUE" in EN, "EN RETARD" in FR (RETARD alone is a noun; the section heading should be a noun phrase). (d) Re-derive the dark-mode outline color to meet 3:1 against surface-raised.

### Medium — Single-accent constraint sacrifices the "Closed Won" moment

DESIGN.md §Colors: "single accent only." §Do's and Don'ts: "Don't use background fills for status. Pills are outlined; stage / status text is the signal." §Status pill line 271: "No icon, no color — type and shape carry the affordance."

This is consistent and defensible. It costs the user one specific moment: **closing a deal.** UJ-4's climax is "Florence selects Negotiation and ⏎." The deal stage goes from `Discovery` to `Negotiation`. The notification confirms. Now imagine the next stage transition: Negotiation → Closed Won. Same row pattern, same pill style, same accent-color subtitle "→ edit." The visual register treats "Closed Won" with the same weight as "Negotiation Round 2." For a CRM, the close is _the_ event. Stripping color from the Closed Won pill is a design choice that the spec asserts without acknowledging the loss.

EXPERIENCE.md doesn't address this. The PRD doesn't either. The PRD's success metrics (§7) explicitly mention CRM-hygiene round-trips as the value being saved; "deal closed" is the rarest and highest-value of those round-trips. The notification for it is `Updated stage: Closed Won` per FR-043 microcopy template — same template as `Updated stage: Negotiation`. No celebration beat, no different copy, no different color. Some user-research literature on sales-tool UX would call this a missed opportunity to reinforce CRM hygiene by rewarding the close event.

This is a design philosophy question, not a bug. But the spec asserts the single-accent rule as discipline without showing the costed alternative.

**Fix.** Decision-log entry: "The single-accent rule is preserved even for Closed Won. We accept that the deal close is treated visually the same as any stage update. Rationale: the Attio register is calm and reserved; celebratory affordances would break it. The success notification copy is the same template across all stage transitions." Either own the choice on the record or relax the rule for terminal stages.

### Medium — KF-3 onboarding still has the cliff between FR-022 prompt and config-sheet paste

The PRD adversarial review flagged this. EXPERIENCE.md's KF-3 narration repeats the same smoothing-over: step 3 "Browser opens to the README's PAT-setup anchor. The README walks through Attio → Settings → Developer → API tokens with screenshots." Step 4: "Florence generates the PAT with the required scopes, copies it. Opens Alfred preferences → Workflows → Attio → Configure. Pastes the token. Saves."

The hand-wave between "copies it" and "Opens Alfred preferences" is the cliff. The workflow has no way to open Alfred's own preferences from a script (per the PRD addendum). EXPERIENCE.md §Setup prompt line 161 acknowledges the half-cliff: "Re-typing the keyword after generating the PAT but before saving in the config sheet still shows the setup prompt — the workflow detects the absence of the env var, not the user's intent." But the spine does not surface any _transition microcopy_ between "you generated the token" (browser) and "you pasted it" (Alfred prefs). The setup prompt is binary: configured or not. No third state for "we know you came back, but please complete the paste step in Alfred preferences → Workflows → Attio → Configure." Florence is the user the PRD says reads the README. Real users skim README, miss the config-sheet step, type `todo` again, see the same prompt, get frustrated, close.

**Fix.** Add a microcopy row for the "user came back to Alfred without configuring" detection: hard, because the workflow has no `lastSetupPromptShownAt` state — but the subtitle could rotate on second invocation: "Setup not yet complete · Open Alfred preferences → Workflows → Attio → Configure → paste PAT" (or the equivalent path). At minimum, document the cliff in §Open questions and own the onboarding regression in the README.

### Medium — Cmd-Enter hint (FR-015) is a non-modal toast with no surface

§Microcopy catalog row "Cmd-Enter hint (deal/task)": `LinkedIn / website not applicable — opening in Attio`. §IA tree shows `deal row → ⌘⏎ open with hint` and `task row → ⌘⏎ open with hint`. The PRD FR-015 says the hint is "shown the first time ⌘⏎ is invoked on a deal or task; a boolean `cmd_enter_hint_dismissed` is persisted globally."

EXPERIENCE.md doesn't say _where_ the hint is rendered. Alfred has no native toast affordance. The options are:

- macOS notification — but the workflow already uses notifications for `Task completed:` etc. and FR-015's hint is information not action. Notification spam.
- Replace the result-list with a one-row hint and "Press ⏎ to continue" — adds a keystroke (now 4 for what was supposed to be 2).
- Inline subtitle on the next row render — but ⌘⏎ has already fired the open-in-Attio action; the user has context-flipped away from Alfred.
- Persistent banner inside Alfred — Alfred doesn't support this.

The spec asserts the hint exists without specifying its surface. The PRD admits the hint is "shown the first time" without saying _as what UI element_. This is a downstream stories problem the UX spine should resolve, not punt.

**Fix.** Pick a surface and microcopy it. Most likely: a one-time macOS notification after the first ⌘⏎ on deal/task. Catalog accordingly.

### Medium — `attio:refresh` returns no list but the spec asserts a notification

EXPERIENCE.md §attio:refresh: "On invocation: shows a one-row loading state, then a notification on success ('Cache cleared — {N} objects, {M} attribute sets' per microcopy). On failure: notification with FR-051 error copy. Returns no list; the user re-invokes the desired keyword."

Two problems:

1. "Shows a one-row loading state" inside Alfred — followed by Alfred closing because the script returns no list. Alfred's behavior with a script that emits one row then exits to a notification is undefined. Either the Alfred bar stays open showing the loading row (then what closes it?), or it closes on notification (then the user can't see the success notification copy alongside the loading row — racing). The behavior needs a spec.
2. "Returns no list; the user re-invokes the desired keyword" forces a keystroke regression. The user typed `attio:refresh` to flush caches because they want fresh data — they almost certainly want to re-invoke `todo` or `deal acme` right after. The spec ends `attio:refresh` with Alfred closed and the user manually re-summoning. This adds 2 keystrokes (⌥space + re-type the keyword). For a "calm productivity" register, this is the opposite.

**Fix.** Either (a) `attio:refresh` returns to the previously-active keyword's result list (state-machine, requires remembering "last keyword") — V2 candidate, document the regression for V1; or (b) on success, `attio:refresh` returns a one-row "Cache cleared — type a keyword to continue" prompt and Alfred stays open so the user can type. Pick one; current spec leaves the UX undefined.

### Medium — Quick Look HTML's accessibility floor over-promises `rem` scaling without verifying

EXPERIENCE.md §Accessibility floor: "The user's macOS 'Larger Text' setting is respected in Quick Look HTML via `rem`-based units [ASSUMPTION: verify Alfred's Quick Look pane respects `rem` scaling at finalize]."

Alfred's Quick Look pane is a WebKit/WebView surface. WebViews on macOS have their own zoom semantics, often _not_ tied to system "Larger Text" settings (which affect AppKit text, not embedded web content). The [ASSUMPTION] block is right to flag the question, but the §Accessibility floor section asserts the commitment ("Type sizing… respected in Quick Look HTML via `rem`-based units") and then qualifies it as unverified. That's not an accessibility floor — it's an accessibility hope.

Same concern: `prefers-color-scheme: dark` inside the Quick Look HTML works only if Alfred's WebView is configured to inherit the system appearance. Some embedded WebViews are pinned to light or follow the host app's appearance, not the system. Spec asserts dark mode without verifying.

**Fix.** Verify both behaviors against an Alfred 5 fixture before this spec freezes; remove the [ASSUMPTION] blocks and re-state §Accessibility floor as actually-floored commitments, not deferred verifications.

### Low — "Re-paste in config sheet" is clunky in EN too

The microcopy rule says "no English idioms" but the EN string "re-paste in config sheet" is itself idiom-shaped. "Config sheet" is Alfred-internal jargon (the workflow configuration panel inside Alfred preferences). A first-time user reading "Token invalid — re-paste in config sheet" will not know what "config sheet" means. The "Setup prompt subtitle" row uses "⏎ for setup instructions" which is clear, but "config sheet" leaks Alfred terminology.

**Fix.** "Token invalid — paste a new token in workflow preferences" or "Token invalid — update token in Alfred preferences." Match the FR side similarly.

### Low — Voice and tone rule "no exclamation marks" is consistent but "no period at end of sentence-microcopy" is asserted and then violated

§Voice and tone rule 3: "Period at end of sentence-microcopy; no punctuation at all in single-noun labels." Walking the catalog:

- "Connected to {workspace_name}" — no period. Violates the rule (this is sentence-microcopy: subject + verb + object).
- "Loading…" — ellipsis, fine.
- "Updated stage: Negotiation" — colon, no period. Same issue.
- "Note added to {record_name}" — no period.

Every notification-style string in the catalog drops the trailing period. The rule says "period at end of sentence-microcopy" but the actual practice is "no terminal punctuation on notifications, period on inline errors." That's a reasonable convention but the spec asserts the wrong rule.

**Fix.** Re-write the voice rule to match practice: "Notifications and labels: no terminal punctuation. Errors and parse hints: em-dash to separate cause and remediation, terminal punctuation optional." Then update the catalog to match consistently — currently "Token invalid — re-paste in config sheet" has no period either, so the inline-error half of the rule is also violated.

### Low — The "⇧" mod for Quick Look is documented but the close-Quick-Look behavior is "⇧ again or any other key"

§Quick Look fiche line 146: "To act on the record, the user closes Quick Look (⇧ again or any other key) and uses ⏎, →, or a mod from the parent list." "Any other key" is broad. If the user is about to ⌘⏎ to mark task complete, ⌘⏎ is _also_ the close-Quick-Look gesture? Or does ⌘⏎ close Quick Look _and_ fire the action? Or close-then-no-action, requiring the user to press ⌘⏎ again? Alfred's Quick Look behavior here is ambiguous and the spec doesn't pin it.

**Fix.** Verify against Alfred 5 — does ⌘⏎ close Quick Look and fire? Or just close? Spec the answer.

## Furniture / theater spotted

- **DESIGN.md §Layout & Spacing** "Base unit is 4px. All measurable spacing is a multiple of 4." Then lists three fiche spacing tokens that are multiples of 4 (20, 8, 16). Asserting "multiples of 4" reads as design-system polish but does no actual constraint work for a workflow whose visible chrome is mostly outside the workflow's control (Alfred row height, Quick Look pane width). The fiche has three padding/gap tokens. There's no system to constrain.
- **DESIGN.md §Shapes** lists 7 radius values from xs(2) to full(9999) and then says "The workflow does not use xl: 12px or larger in V1." Why are xl, full, etc. in the design tokens at all if they're not used? Token theater.
- **DESIGN.md §Elevation & Depth** [ASSUMPTION] "A faint top-shadow on the fiche may be added in dark mode to lift the card off the #101113 background. To verify visually at finalize key-screen render." The whole section is one paragraph saying "no shadows," and then an [ASSUMPTION] saying "maybe one shadow." Pick one.
- **EXPERIENCE.md §Foundation.UI system** "No third-party UI library. No React, no Tailwind, no design-system import." This is correct as a constraint but reads as defensiveness — the workflow is a Node script emitting JSON to Alfred; there is no DOM to render React into. Stating "no React" is template-fill where a constraint isn't actually being made.
- **EXPERIENCE.md §IA tree, last row** "(no setup keyword) → token-missing state surfaces via any keyword's setup-prompt row." Including "(no setup keyword)" as an IA-tree row is anti-information; the tree is supposed to show what exists.
- **EXPERIENCE.md §Open questions** four bullets, three of which are "verify at finalize key-screen render." A spec whose open questions are "verify at finalize" is a spec that has pushed verification past the finalize line. Resolve before finalize, or push past.
- **DESIGN.md §Brand & Style, third paragraph** "The README, GitHub release page, and Alfred Gallery listing inherit the same register: Inter, near-black on cream-white or pure white, single-blue accent, no marketing gloss." This is a directive for the _marketing surface_, not the workflow. Belongs in a separate Brand Guide doc if it's load-bearing; in DESIGN.md it's furniture suggesting the spec's scope is bigger than it actually is.

## What's missing entirely

- **Trademark / non-affiliation disclaimer microcopy.** Critical finding #1. No strings in the EN+FR catalog, no first-run notification, no README requirement. The single most important microcopy gap given this is a public OSS workflow with the same brand register as a commercial CRM.
- **Bundled vs system Inter font.** §Typography asserts Inter as the workflow's typeface. Whether Inter ships _inside_ the `.alfredworkflow` (as WOFF2) or relies on system Inter (not present by default) is unspecified. The Quick Look HTML's `font-family` chain has Inter Display, Inter, system-ui — meaning on a default Mac without Inter installed, the Quick Look pane falls back to system-ui (San Francisco), which is _not_ the editorial-cold register the spec mandates. The whole §Brand & Style discipline collapses on default Macs.
- **Icon licensing audit.** §Components.Alfred-result-list-item says outline 1.5px stroke icons, with "Lucide equivalent at 14×14 with 1.5px stroke as the V1 fallback." But Lucide is not the V1 _plan_ — it's the fallback. The plan is "Attio-faithful icons." Where do those come from? Traced from Attio's web app? Built fresh in the same style (likely indistinguishable in court)? Until icon provenance is decided and licenses verified, this is unspec'd.
- **`prefers-reduced-motion` floor.** §Accessibility floor mentions it but says "the workflow has no animations in V1 anyway, but the future field-edit spinner animation should be disabled." Future. So V1 has a spinner (FR-046 + EXPERIENCE.md §State patterns "PATCH in flight") that uses the `sync` icon as a spinner. Either the sync icon is an animated GIF/CSS — then `prefers-reduced-motion` applies in V1, not "future" — or it's a static icon, in which case "spinner" is the wrong word and the spec mis-describes the FR-046 affordance.
- **Spinner rendering inside Alfred.** §State patterns line 188 says "the affected row shows the `sync` icon as a spinner." Alfred ScriptFilter row icons are static PNGs. There is no animation. The spec asserts an animation Alfred does not natively render. (The PRD adversarial review flagged this. EXPERIENCE.md inherits the problem.)
- **Per-keyword icon variants for state.** §Components.Alfred-result-list-item: "Icon… one per object type and per state (default / completed / error)." So 4 object types × 3 states × 2 (light/dark) × 2 (1x/2x) = 48 icon assets minimum. Bundle size, asset pipeline, naming convention — none specified.
- **Quick Look HTML caching strategy.** §Quick Look fiche says fiches are generated on-demand to `alfredInfo.cache()`. What's the cache cleanup policy? If a user previews 100 records, 100 HTML files sit in the cache forever (until `attio:refresh` per NFR-011). The spec acknowledges scrub-on-refresh but not LRU eviction or size cap.
- **Quick Look HTML and the PAT.** The PRD's NFR-010 explicitly forbids the PAT in Quick Look HTML. EXPERIENCE.md doesn't mention this. The spec should call out: "Quick Look HTML never includes the PAT, the Authorization header value, or any token-derived identifier." (Defensive — a careless template literal could inline it.)
- **What happens when a workspace is renamed.** FR-025 caches `workspace_name`. If the admin renames the workspace in Attio, the cached value goes stale and the "Connected to {workspace_name}" notification at first probe is now wrong. The spec has no FR for re-fetching identity periodically (NFR-006 forbids background polling). The `attio:refresh` flow fixes this on-demand but the user has to know to use it.
- **Empty `task` keyword fallback.** PRD FR-020: "Empty query on `task` falls through to `todo` semantics." EXPERIENCE.md §IA tree shows `task <query>` but doesn't show the empty-query → todo behavior. Microcopy is unspecified — does the empty `task` keyword show the same RETARD/today grouping as `todo`?
- **Drill-down inline expansion microcopy.** §Drill-down list line 154: "Linked-records grouping… expands inline into N child rows when selected." When the group expands, what does the group row look like (still a row? becomes a heading?)? When expanded, can the user re-collapse on ⏎? Spec says "⏎ a second time" but doesn't spec the visual state difference.
- **Confirmation copy for destructive-ish actions.** Mark task complete is destructive in the sense that it's hard to undo (the workflow has no "uncomplete" action in V1). No confirmation step, no undo path, no microcopy for "Are you sure?" — fine if the design choice is "trust the user," but the spec should state that choice explicitly.
- **The "scroll past 9 results" affordance.** PRD FR-011 caps result lists at 9. What if the user wants the 10th match? No microcopy ("Type more characters to narrow"), no pagination, no "View all in Attio →" escape hatch. Especially relevant for `company` searches where 9 results out of a long list may not include the right one.
- **The `task <query>` flow has no KF.** UJ-1 (todo), UJ-2 (person/company), UJ-3 (onboarding), UJ-4 (deal stage edit) — there's no KF demonstrating `task <query>` search-and-act, even though the keyword exists per FR-010. Missing flow.
- **The note-creation flow (FR-016/⌥⏎) has no KF.** The keystroke is documented in §Interaction Primitives but no KF walks it. Adding a note is one of the three V1 mutation surfaces — it deserves a KF.
- **The multi-line note flow (FR-017/⇧⌥⏎) has no KF.** Same problem; the macOS NSAlert behavior, the title-from-first-line behavior, the embedded-newline preservation are all specced but never demonstrated in a flow.
- **Lifecycle attribute setup flow.** FR-033 lets the user configure a lifecycle attribute slug per object. Where does the user _enter_ the slug? Alfred preferences → Workflows → Attio → Configure (per the PAT pattern). EXPERIENCE.md does not document the setup-side UX for this configuration, only how it's rendered downstream. Onboarding regression: a user who wants Customer/Lead/Churned visible in their search results has to find the right textfield in the Configure sheet and paste the right slug. No microcopy for the configure-field label, no spec for what happens if the slug is wrong (silent vs error).
- **Schema-discovery first-run UX.** FR-030 fetches `/v2/objects` on first call. FR-031 fetches attribute defs at first run. EXPERIENCE.md mentions these as background facts in §State patterns ("Schema unavailable") but the first-run user, after pasting PAT, will see — what? An additional spinner? A delay on first invocation as schemas fetch? KF-3 step 5 says "the task list renders" right after the identity probe — but the schema fetch is a separate call(s). The spec elides the latency. Should specify or commit to: first-run cold-cache UX shows "Loading workspace schema…" or similar.
- **Update-available UX.** PRD V2-8 defers this. UX spine doesn't mention it. Fine for V1, but the README plan should commit to documenting "no auto-update; check GitHub Releases manually" so users don't expect a notification path.
