export enum Variables {
  API_KEY = 'API_KEY',
  /**
   * `attio:diag` row 2 (`Me: …`) is suppressed when this env var is set to
   * `false`. Users sharing public screenshots toggle this off via the
   * Alfred config sheet (FR-051 / UX §`attio:diag`).
   */
  DIAG_INCLUDE_IDENTITY = 'DIAG_INCLUDE_IDENTITY',
  /**
   * Per-object lifecycle attribute slug. When set, the configured slug is
   * looked up on each `person`/`company`/`deal` row and appended to the
   * result subtitle as `· {lifecycle_value}` (FR-033 / Story 2.5). Empty
   * default → subtitle keeps the FR-013 layout. Tasks are intentionally
   * excluded — their lifecycle is rendered via `is_completed` already.
   */
  LIFECYCLE_ATTRIBUTE_PERSON = 'LIFECYCLE_ATTRIBUTE_PERSON',
  LIFECYCLE_ATTRIBUTE_COMPANY = 'LIFECYCLE_ATTRIBUTE_COMPANY',
  LIFECYCLE_ATTRIBUTE_DEAL = 'LIFECYCLE_ATTRIBUTE_DEAL',
}
