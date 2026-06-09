/**
 * Shared constants. Grows as helpers are added in subsequent stories.
 *
 * Story 1.2 adds the retry policy (referenced by AttioClient in Story 1.7)
 * and the icon-name type (consumed by script-filter.ts in Story 1.5).
 */

/** Attio API base URL. */
export const API_BASE_URL = 'https://api.attio.com'

/** Web base for opening records in the Attio app. */
export const ATTIO_APP_BASE_URL = 'https://app.attio.com'

/**
 * README anchor opened by the setup-prompt row (FR-022 / FR-023). The
 * `#setup` fragment points at the README's PAT-setup section.
 */
export const README_SETUP_URL = 'https://github.com/flomarin88/alfred-attio-workflow#setup'

/** Default Alfred result-list cap. Matches FR-011 and the existing `people.ts`. */
export const DEFAULT_RESULT_LIMIT = 9

/** Retry policy for NFR-005 — exponential backoff with one retry on HTTP 429 / 5xx. */
export const RETRY_INITIAL_DELAY_MS = 1000
export const RETRY_MAX_DELAY_MS = 8000
export const RETRY_MAX_ATTEMPTS = 2

/** Cache TTLs per NFR-004 (milliseconds). Wired by `cache.ts` in Story 1.3. */
export const CACHE_TTL_TASKS_MS = 60 * 1000 //  60 s
export const CACHE_TTL_PEOPLE_MS = 10 * 60 * 1000 //  10 min
export const CACHE_TTL_DEALS_MS = 5 * 60 * 1000 //   5 min
export const CACHE_TTL_COMPANIES_MS = 24 * 60 * 60 * 1000 // 24 h
export const CACHE_TTL_SCHEMA_MS = 24 * 60 * 60 * 1000 // 24 h

/**
 * Icon-name registry. Each name maps to a PNG family in `assets/icons/`
 * (see DESIGN.md UX-DR2). The actual path resolution lives in
 * `script-filter.ts` (Story 1.5); `error.ts` consumes the type only.
 */
export type IconKey = 'person' | 'company' | 'deal' | 'task' | 'info' | 'sync' | 'error' | 'warning' | 'success'
