# Bundled fonts

Per `DESIGN.md` typography section and Story 1.1.

| File                     | Family             | License | Source                                                              |
| ------------------------ | ------------------ | ------- | ------------------------------------------------------------------- |
| `Inter.woff2`            | Inter (variable)   | SIL OFL | https://github.com/rsms/inter (via fontsource CDN, weight axis VF). |
| `JetBrainsMono.woff2`    | JetBrains Mono VF  | SIL OFL | https://github.com/JetBrains/JetBrainsMono (via fontsource CDN).    |
| `OFL.txt`                | SIL Open Font License 1.1 — applies to both files above. |

## Inter Display

Story 1.1 calls for bundling `InterDisplay.woff2` as well. rsms/inter v4 collapsed the Display optical-size variant into Inter's `opsz` axis, so no separate WOFF2 ships from the canonical sources. The DESIGN.md `font-family` chain (`Inter Display, Inter, system-ui, -apple-system, sans-serif`) gracefully falls back to `Inter.woff2` when `InterDisplay` is absent — the visual delta at fiche-header sizes is subtle.

A future story may add the opsz-axis Inter VF (currently `~340 KB`) when a reliable hosted URL is available. Tracked as a Story 1.1 deferred follow-up in the implementation log.
