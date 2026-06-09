export enum Variables {
  API_KEY = 'API_KEY',
  /**
   * `attio:diag` row 2 (`Me: …`) is suppressed when this env var is set to
   * `false`. Users sharing public screenshots toggle this off via the
   * Alfred config sheet (FR-051 / UX §`attio:diag`).
   */
  DIAG_INCLUDE_IDENTITY = 'DIAG_INCLUDE_IDENTITY',
}
