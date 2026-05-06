// services/shared/log-channels.ts
//
// Closed log-channel enum mirrored from
// content-schema/schemas/log-record.schema.json. Every backend
// service imports from here instead of restating the literal set.
// The retention policy per channel lives in
// docs/operations/services-runtime-rules.md § 4.

export const LogChannel = {
  /** Developer-side runtime events. 30 d retention. */
  App: "app",
  /** Inbound HTTP / WebSocket access log. 30 d retention. */
  Access: "access",
  /** Consent / wipe / policy events. Indefinite append-only. */
  Audit: "audit",
  /** SecurityEvent records. 1 y archived. */
  Security: "security",
} as const;

export type LogChannel = typeof LogChannel[keyof typeof LogChannel];

export const LogSeverity = {
  Debug: "debug",
  Info: "info",
  Warn: "warn",
  Error: "error",
  Fatal: "fatal",
} as const;

export type LogSeverity = typeof LogSeverity[keyof typeof LogSeverity];
