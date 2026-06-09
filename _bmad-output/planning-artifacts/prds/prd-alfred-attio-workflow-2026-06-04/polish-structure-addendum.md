---
title: Structural Editorial Review — Addendum
status: review
created: 2026-06-04
updated: 2026-06-04
target: addendum.md
---

# Structural Editorial Review — Addendum

Structural polish only. No new content, no decision reversals. The addendum's mandate (per its own intro) is "depth that belongs downstream but doesn't fit the PRD body." The review checks where it drifts into parallel coverage of the PRD body, where the same fact appears twice across §A / §B / §F / §H, and where reorganization would lower the cost of reading it.

## Overall density

The addendum runs ~214 lines across eight sections. Roughly 30–40 lines are duplication (same fact restated across sections) and another ~15 are restatement of PRD FRs in slightly different words. Cutting these would not lose information — every restated fact already lives somewhere else in the addendum or in the PRD body. Target shape after cuts: ~150 lines, eight sections preserved, with §C reorganized and §E compacted to a matrix.

The signal-to-noise on §A, §D, §G, and §H is high; these only need light trims. §B, §C, §E, and §F carry the duplication weight.

## Cuts

### §A row "Mark task complete / update task" — final clause duplicates PRD FR-040

Current text:

> Per Attio docs: only `deadline_at`, `is_completed`, `assignees`, `linked_records` are writable. `content` (task title/body) is **not** PATCH-able and remains read-only in F-G (per FR-040).

PRD FR-040 already states "task `content` cannot be patched. The workflow renders task `content` as read-only in drill-down." And §H restates it a third time in its closing paragraph ("Tasks are a separate endpoint with a narrower writable surface…"). **Cut the clause from §A** — keep only the endpoint + writable shape: `PATCH /v2/tasks/{id}` with `{ "is_completed": true }` (or other writable fields among `deadline_at`, `is_completed`, `assignees`, `linked_records`). Let §H own the read-only `content` rule.

### §A row "Create Note" — title-derivation detail belongs in PRD FR-016/017, not §A

Current text:

> `title` is auto-derived from `content`: single-line path truncates `content` to 80 chars; multi-line path uses the first non-empty line truncated to 80 chars. No separate title prompt.

This is a near-verbatim duplicate of PRD FR-016 ("note `title` is auto-derived from the content, truncated to 80 characters") and FR-017 ("title is auto-derived from the first non-empty line of content, truncated to 80 characters"). **Cut from §A.** Replace with one sentence: "Title derivation per FR-016 (single-line) / FR-017 (multi-line)."

### §B "Bundling assumption" trailing paragraph

Current text:

> Bundling assumption: one TypeScript entry per Alfred keyword under `src/main/*.ts`. The current `src/main/people.ts` becomes `src/main/person.ts` (renamed) or stays as `people.ts` with the keyword renamed in `info.plist`.

This is a migration choice, not a fast-alfred primitive. §F migration item 1 already addresses the keyword rename and source-file rename. **Cut from §B**, fold the "one TS entry per keyword" sentence into §F item 1 as the second sentence.

### §B "alfredClient.output(ScriptFilter)" bullet — splits two unrelated facts

Current bullet conflates (a) ScriptFilter is the standard rendering primitive with (b) the FR-046 polling mechanism for the PATCH worker. The polling mechanism is implementation depth for F-G, not a general primitive listing.

**Proposed split:** keep the first sentence ("standard ScriptFilter rendering for every keyword script"). Move the rest (the `ScriptFilter.rerun` mechanism, the spinner-row contract for FR-046) into §F as a new item or into a new "F-G implementation notes" subsection. Cleaner mental model: §B is "what fast-alfred gives us," not "how FR-046 is implemented."

### §C.1 final paragraph "Known limitation"

Current text:

> **Known limitation:** a PAT is workspace-scoped — one Alfred install binds to one Attio workspace. Multi-workspace users either pick one or wait for V2.

This is verbatim PRD FR-027 ("Multi-workspace is not supported in V1. […] One Alfred install binds to one Attio workspace. Multi-workspace lands with V2's OAuth flow") and PRD UJ-3 closing paragraph. **Cut.** Three places is two too many.

### §D last sentence

Current text:

> This is why FR-036 (graceful degradation) is non-negotiable: any UI that hardcodes attribute shapes will break on a customized workspace.

§D's job is to document the mechanics. Justifying FR-036 belongs in the PRD body (which already states the requirement). **Cut.** §D ends cleanly at item 2.

### §F item 5 vs §B first bullet

§B first bullet: "`alfredClient.cache.setWithTTL(key, value, { maxAge })` — replaces the current ad-hoc TTL constants in `people.ts` (FR-031, NFR-004)."

§F item 5: "Wire the currently-dead cache constants in `people.ts` (`COMPANY_TTL`, `PEOPLE_TTL`) into `alfredClient.cache.setWithTTL` and read paths (NFR-004). At present the constants exist but are never consulted."

Same fact, twice. **Keep §F item 5** (it names the specific dead constants, which is more useful for the engineer doing the migration). Trim §B first bullet to a generic mention of the primitive without the migration aside: "`alfredClient.cache.setWithTTL(key, value, { maxAge })` — TTL-aware cache writes (NFR-004); see §F item 5 for migration."

### §F item 12 vs §B "Primitive NOT provided" callout

§B already contains: "**macOS notifications.** […] Implementation: shell out to `osascript -e 'display notification "..." with title "..."'` from a small helper in `src/common/notify.ts`."

§F item 12 then says: "Add `src/common/notify.ts` — small helper wrapping `osascript -e 'display notification ...'` for FR-005 / FR-016 / FR-017 / FR-025 / FR-043. fast-alfred provides no notification primitive (see §B)."

Both name the helper, the file path, the mechanism, and the FRs. **Cut §F item 12 down to one line**: "Add `src/common/notify.ts` per §B notification callout (FR-005, FR-016, FR-017, FR-025, FR-043)." Avoids re-stating mechanism and FR list twice within ten lines of each other.

### §F item 15 vs §H "Build-time verification required" paragraph

§F item 15: "Pre-V1 verification pass against a fixture Attio workspace: curl-probe `PATCH /v2/objects/{slug}/records/{id}` for each editable attribute type in §H to confirm the value shape; curl-probe `POST /v2/notes` to confirm the five required fields; verify `GET /v2/tasks` filter parameters; verify the task deep-link URL still works (per FR-004)."

§H opening paragraph: "**Build-time verification required.** […] Before the F-G writers ship, an engineer must curl-probe each attribute type against a fixture workspace and update this table."

Both demand the same curl-probe pass; §F item 15 expands it to also cover notes, tasks filter, and the deep-link. The expansion is useful — keep §F item 15. **Trim §H's opening paragraph** to: "**Build-time verification required** — see §F item 15 for the full verification scope. The payload shapes below reflect documented + observed shapes and may diverge from Attio's actual PATCH contract; treat as starting point, not frozen contract."

### §F item 6 partially duplicates §A

§F item 6 lists ten new `AttioClient` methods: "`getSelf`, `listObjects`, `getObjectAttributes`, `patchRecord(slug, id, payload)`, `patchTask(id, payload)`, `createNote(payload)`, `listWorkspaceMembers`, plus search variants for `companies`, `deals`, `tasks`."

§A already documents every one of these endpoints in its table. The list-of-methods reframing is useful (it's an engineering checklist, §A is an endpoint reference), so **keep §F item 6 as-is** but consider adding a parenthetical "(endpoints per §A)" to make the cross-link explicit and avoid reviewers parsing two lists for consistency.

## Reorganizations

### Split §C cleanly into V1 (current) and V2 (planned)

Current §C has three sub-sections (C.1 V1 PAT, C.2 V2 OAuth, C.3 Verified shapes). C.3 is a verification table that applies only to V2 (it documents `/authorize` and `/oauth/token` shapes; V1 doesn't use these endpoints). Reader currently has to infer this.

**Proposed structure:**

- **§C.1 V1 — PAT paste** — keep the "Mechanics" bullets, drop the "Known limitation" paragraph (cut above), drop the OAuth-incompatibility intro paragraph (it's two sentences justifying a decision; move to .decision-log or to §C.2 as the rationale for V2 needing a relay).
- **§C.2 V2 — OAuth via hosted relay (planned)** — keep the sketch and trade-offs as-is. Move the dropped OAuth-incompatibility intro from C.1 to this section's opening (one sentence: "OAuth requires `client_secret`, no PKCE, no refresh tokens — incompatible with embedding in a public `.alfredworkflow`, hence the hosted-relay approach.").
- **§C.3 V2 — Verified `/authorize` and `/oauth/token` shapes** — rename to make the V2 scope explicit. This is the input to the V2 design pass, not V1 reference material.

Result: a reader scanning §C now sees "V1 = §C.1, V2 = §C.2 + §C.3" instead of needing to figure out which subsections apply to which version.

### §E — collapse eight subsections into a single matrix

§E currently spans eight subsections (4 objects × {Quick Look, Drill-down}), each a 4–7 item bulleted list. Pattern is identical: a list of field names. Readers comparing "what does deal Quick Look show vs person Quick Look" must jump back and forth.

**Proposed:** single matrix table with columns `Object | Quick Look fields | Drill-down items`. Each cell is a comma-separated or newline-bulleted list. Saves ~30 lines and makes per-object comparison trivial. The "(V1 draft)" caveat at §E's top stays.

### §H — move the tasks paragraph to its own row in the matrix, not a trailing paragraph

The "Tasks are a separate endpoint…" paragraph at the bottom of §H is structurally a row of the matrix (it has type / input UX / payload shape / V1 notes content) but rendered as prose because tasks don't use `data.values`. **Proposed:** add it as a labeled row in the matrix (or a small sister table) so the format is consistent. The "Attribute defs as gatekeeper" paragraph at the very end stays as a footnote — it's a cross-cutting rule, not per-type data.

## Redundancy across §A / §B / §F / §H

Triangulating the duplications above:

| Fact                                                                                                          | Appears in                                 | Recommended single home                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Task writable fields are `deadline_at`, `is_completed`, `assignees`, `linked_records`; `content` is read-only | §A row, §H closing paragraph, PRD FR-040   | PRD FR-040 + §H tasks row (cut §A clause)               |
| Note title auto-derivation (80-char truncate, single-line vs multi-line)                                      | §A row, PRD FR-016, PRD FR-017             | PRD FR-016/017 (cut §A detail, leave pointer)           |
| `osascript` notification helper, file path, FR list                                                           | §B callout, §F item 12                     | §B callout (compress §F item 12 to one-line cross-link) |
| TTL constants migration from `people.ts` to `cache.setWithTTL`                                                | §B first bullet, §F item 5                 | §F item 5 (trim §B bullet)                              |
| PAT is workspace-scoped, single-workspace V1 limitation                                                       | §C.1 closing, PRD FR-027, PRD UJ-3 closing | PRD FR-027 (cut §C.1 closing)                           |
| Curl-probe verification pass                                                                                  | §F item 15, §H opening paragraph           | §F item 15 (compress §H opening to cross-link)          |
| Endpoint list (PATCH records, PATCH tasks, POST notes, etc.)                                                  | §A table, §F item 6 method list            | Both — but make the §F → §A cross-link explicit         |

Net cut from these: roughly 25 lines.

## Stale or low-value bullets

- **§A note**: "All requests use `Authorization: Bearer <token>` against `https://api.attio.com`. Default `limit=9` for search queries to match the Alfred 9-result cap." Useful, keep.
- **§B `fast-alfred pack`** bullet ends with "Verify the artifact filename glob in the release config matches what `pack` actually emits before V1.0.0." This is a §G checklist item, not a primitive. **Move to §G** alongside "verify `fast-alfred pack` artifact is correctly attached by `semantic-release`" (which already exists). Avoids duplicating the same verification ask in two places.
- **§F item 14** (dormant hotkey trigger UID): low-stakes engineering cleanup. Keep, but consider downgrading to one short line — it currently spans three lines for what amounts to "remove the unused hotkey UID from `info.plist`."
- **§G "License decision"** restates that the decision is open: "choose between MIT / Apache 2.0 / GPL before V1.0.0." PRD §8 already lists this as a build-time decision. **Trim** §G's license bullet to a one-line action: "Add top-level `LICENSE` file and README declaration once §8 decision lands (default suggestion: MIT)." Drops the rationale recap.
- **§G "macOS version floor"** similarly restates PRD §8. **Trim** to: "Declare macOS floor (default: 13+) in README + `info.plist` once §8 decision lands."

## Net effect

If all cuts and reorganizations land:

- §A loses ~3 lines (note title clause, task writable clause)
- §B loses ~4 lines (bundling assumption, polling mechanism moved to §F, pack verification moved to §G)
- §C reorganized, ~3 lines cut from §C.1 closing
- §D loses 2 lines (FR-036 restatement)
- §E condensed from ~50 lines (8 subsections) to ~12 lines (one matrix)
- §F loses ~4 lines (item 12 compressed) but gains ~3 (polling mechanism from §B)
- §G loses ~3 lines (license / macOS floor restatement trimmed)
- §H loses ~3 lines (opening paragraph compressed, tasks paragraph promoted to row)

Approximate target: ~150 lines (down from 214), eight sections preserved, every fact still present exactly once, every PRD-body restatement removed. The addendum's purpose ("depth that doesn't belong in the PRD") is sharpened because the reader can no longer mistake it for a second copy of the PRD.

No content cuts; no decision reversals. Structural only.
