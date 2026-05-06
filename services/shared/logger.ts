// services/shared/logger.ts
//
// Spec stub for the shared pino-backed logger. The single sanctioned
// import path for pino across all backend services. Implementation
// owner: tasks/phase-3/05-observability/01-shared-logger-and-redaction.md.
//
// Contract:
// - emits structured JSON validating against
//   content-schema/schemas/log-record.schema.json
// - redacts the deny-list in services/shared/redact.ts
// - splits emissions across the four LogChannel enums
// - validates SecurityEvent payloads against
//   content-schema/schemas/security-event.schema.json before securityLog()
// - never logs the prompt body, peer IP, ICE candidate body, save
//   payload, or chat content
//
// The runtime body lands with the implementation task; this file
// pins the public surface so callers can import-type-only today.

import type { LogChannel, LogSeverity } from "./log-channels.js";

export interface LogFields {
  [key: string]: string | number | boolean | null | undefined;
}

export interface LogContext {
  /** UUID v4. Generated at request entry; required on every emission. */
  correlationId: string;
  /** Optional player-report case id (256-bit hex per case-id.schema.json). */
  caseId?: string;
  /** Optional thrown-error correlation id. */
  errorId?: string;
}

export interface SafeLogInput {
  channel: LogChannel;
  severity: LogSeverity;
  event: string;
  fields?: LogFields;
  context: LogContext;
}

export interface AppLog {
  (event: string, fields: LogFields, context: LogContext): void;
}

export interface AccessLog {
  (event: string, fields: LogFields, context: LogContext): void;
}

export interface AuditLog {
  (event: string, fields: LogFields, context: LogContext): void;
}

export interface SafeLog {
  (input: SafeLogInput): void;
}

export interface SecurityEventInput {
  /** SecurityEvent.kind per content-schema/schemas/security-event.schema.json. */
  kind: string;
  severity: "info" | "warn" | "error" | "critical";
  context: LogContext;
  fields?: LogFields;
}

export interface SecurityLog {
  (input: SecurityEventInput): void;
}

/**
 * Factory contract. Implementations land per
 * tasks/phase-3/05-observability/01-shared-logger-and-redaction.md.
 */
export interface LoggerFactory {
  appLog: AppLog;
  accessLog: AccessLog;
  auditLog: AuditLog;
  securityLog: SecurityLog;
  safeLog: SafeLog;
}

/**
 * Caller convention: each service builds one factory at startup with
 * its `service` field pinned, then passes the four helpers to call
 * sites. Direct `console.*` and direct `pino()` imports are banned
 * from `services/**` by `npm run validate:contracts`.
 */
export interface CreateLoggerOptions {
  /** Service name; matches `service` in log-record.schema.json. */
  service: string;
  /** ISO 8601 UTC time source. Required injection for tests. */
  now: () => string;
  /** UUID v4 source. Required injection for correlation ids. */
  uuid: () => string;
}

export type CreateLogger = (options: CreateLoggerOptions) => LoggerFactory;
