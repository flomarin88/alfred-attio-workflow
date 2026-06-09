<div align="center">

# Alfred · Attio Workflow

Search and act on your [Attio](https://attio.com) CRM records straight from the Alfred bar.

[![Latest Version Downloads](https://img.shields.io/github/downloads/flomarin88/alfred-attio-workflow/latest/total?label=Latest%20Version%20Downloads&color=green)](https://github.com/flomarin88/alfred-attio-workflow/releases/latest)
[![Latest Version](https://img.shields.io/github/v/release/flomarin88/alfred-attio-workflow?label=Latest%20Version&color=green)](https://github.com/flomarin88/alfred-attio-workflow/releases/latest)
[![Total Downloads](https://img.shields.io/github/downloads/flomarin88/alfred-attio-workflow/total?label=Total%20Downloads&color=blue)](https://github.com/flomarin88/alfred-attio-workflow/releases)

</div>

> **Unofficial.** This workflow is built by the community against the [Attio public REST API](https://docs.attio.com/rest-api). It is not affiliated with, endorsed by, or supported by Attio Inc.

---

## Keywords

| Keyword          | What it does                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `todo`           | Today's open tasks assigned to you (overdue first), with `who · when` subtitles.                       |
| `person <query>` | Search people by name; ⏎ opens the record in Attio, ⌘⏎ opens LinkedIn when present.                    |
| `attio:diag`     | A copy-safe diagnostic snapshot (workspace, token presence, cache ages, last error, workflow version). |
| `attio:refresh`  | Wipe every cache, re-fetch identity + object schemas, scrub Quick Look HTML.                           |

> Epics 2-5 will add `company`, `deal`, drill-down record edits, notes / task creation, and Quick Look. See [`_bmad-output/planning-artifacts/epics.md`](_bmad-output/planning-artifacts/epics.md).

---

## Setup

> The instructions assume macOS, Node 22+, and [Alfred 5](https://www.alfredapp.com/) with the Powerpack.

### 1. Install Node 22+

```bash
brew install node@22
```

### 2. Issue an Attio Personal Access Token

1. Open [Attio](https://app.attio.com).
2. **Workspace settings → Developers → Personal access tokens → Create new token**.
3. Grant the scopes the workflow needs:
   - `record:read`, `record:write`
   - `comment:read`, `comment:write` (notes — Epic 4)
   - `task:read`, `task:write`
   - `user_management:read` (used by `/v2/self` during the identity probe)
4. Copy the token. It's only shown once.

### 3. Install the workflow

Two paths:

**A. Use a release build (recommended once releases exist).** Download the latest `.alfredworkflow` from the [Releases page](https://github.com/flomarin88/alfred-attio-workflow/releases/latest) and double-click to install.

**B. Build from source (current path while the workflow is in active development).**

```bash
git clone https://github.com/flomarin88/alfred-attio-workflow.git
cd alfred-attio-workflow
npm install
npm run build:icons         # rasterizes Lucide SVGs into assets/icons/*.png (one-time)
npm run bundle              # bundles src/main/*.ts into esbuild/*.js
npm run dev:link            # symlinks the repo into Alfred's workflows folder
```

`npm run dev:link` creates a symlink under
`~/Library/Application Support/Alfred/Alfred.alfredpreferences/workflows/flomarin88.attio.workflow`,
so any future `npm run bundle` is picked up by Alfred immediately — no re-import.

Restart Alfred so it picks up the new workflow (`killall Alfred && open -a Alfred`).

### 4. Paste your token

Alfred bar → `attio:diag` (will show "Token: missing") → click the gear icon on the workflow → **Configure Workflow…** → paste the PAT into **Attio API Key**.

Re-run `attio:diag`. You should see:

```
Workspace: <your workspace>
Me
Token: configured
Cache age   …
```

### 5. Try it

- `todo` → today's tasks. ⏎ opens the selected task in Attio.
- `people <name>` → search people. ⏎ opens the record, ⌘⏎ opens LinkedIn when available.
- `attio:refresh` → clears every cache + re-fetches schemas. Use after an admin adds a deal stage or attribute.

---

## Local development

### Run the test suite

```bash
npm test          # one-shot
npm run test:watch
npm run lint
```

### Iterate on a keyword

1. Edit `src/main/<keyword>.ts` (and any `src/common/*` it consumes).
2. `npm run bundle` → re-bundles `esbuild/<keyword>.js`.
3. Trigger the keyword in Alfred — the symlink from `npm run dev:link` means no re-install.

You can also drive a keyword from a terminal:

```bash
API_KEY="…your PAT…" node esbuild/todo.js
API_KEY="…your PAT…" node esbuild/diag.js
```

The script writes the Alfred JSON envelope to stdout; pipe through `jq` for readability.

### Project layout

```
src/
  common/           pure helpers — strings, cache, error, attio client, builders
    attio/          API client + zod schemas + identity probe
  main/             one file per Alfred keyword (people, todo, diag, refresh)
  strings/          en.json + fr.json microcopy catalogs
scripts/
  bundle.mjs        esbuild bundler that produces esbuild/<name>.js
  build-icons.mjs   rasterizes Lucide SVGs into the assets/icons family
  link-to-alfred.sh symlinks the repo into Alfred's workflows folder
assets/
  icons/            light + dark PNG variants in @1x and @2x
  fonts/            Inter + JetBrains Mono WOFF2 (Quick Look — Epic 3)
test/               vitest unit tests (mirror src/ layout)
info.plist          Alfred workflow descriptor — keywords + connections
_bmad-output/       planning artifacts (PRD, architecture, UX, epics)
```

### Architectural boundaries

Enforced by `eslint.config.mjs` (`no-restricted-imports` overrides):

- `src/common/attio/client.ts` is the only file allowed to call `fetch`.
- `src/main/*.ts` may not touch `node:fs` or `node:fs/promises`. Cache + Quick Look go through the dedicated helpers.
- `src/common/attio/encoders/*` (Epic 5) may not import `strings`, `cache`, or call `fetch`.
- `src/common/cache.ts` may not import the API client (would create a cycle).
- Tests opt out of these rules — they need to wire mocks.

### Privacy floor

The workflow is designed so that everything visible in `attio:diag` and notifications is safe to paste into a public GitHub issue:

- The PAT never reaches `alfredClient.log`.
- The PAT hash is stored in `alfredClient.config` (locally) but never surfaced.
- Record IDs are redacted to `<redacted>` in the persisted last-error endpoint pattern.
- The first-run notification carries a non-affiliation disclaimer.
- Set the **Show identity in attio:diag** field to `false` if you want to share `attio:diag` screenshots publicly — the `Me` row is then suppressed.

---

## Troubleshooting

| Symptom                                              | Likely cause                                             | Fix                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Alfred shows `Couldn't find the node binary`         | Node is not on Alfred's PATH                             | `brew install node@22` + restart Alfred                                                    |
| `Token invalid — update token in Alfred preferences` | PAT was rotated, revoked, or copy-pasted with whitespace | Generate a new token, paste it into the workflow config sheet                              |
| `Token lacks the required scope`                     | The PAT was issued without one of the required scopes    | Re-issue with the full scope set (see [Setup §2](#2-issue-an-attio-personal-access-token)) |
| `Attio is unreachable` even though the website works | Corporate proxy intercepting outbound TLS                | Whitelist `api.attio.com` or run the workflow off the proxy                                |
| Workflow opens an old version of a record            | Cache TTL window — records cache for 10 min, deals for 5 | Run `attio:refresh` to wipe every cache layer                                              |
| Quick Look opens to an empty page                    | HTML cache survived a workspace change                   | `attio:refresh` (will scrub `*.html` in the workflow cache dir)                            |

For deeper triage, run `attio:diag` and paste the snapshot into a [GitHub issue](https://github.com/flomarin88/alfred-attio-workflow/issues). The snapshot contains zero secrets and zero record IDs.

---

## License

[MIT](LICENSE)
