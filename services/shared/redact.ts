// services/shared/redact.ts
//
// Recursive deny-list scrubber for structured log fields. Strips any
// property whose name (case-insensitive) appears in DENY before the
// record reaches the transport. This is the structured-payload
// counterpart to pino's `redact` option, applied to nested fields
// the pino path syntax cannot reach (e.g., arbitrary depth, array
// elements).
//
// Owner: docs/architecture/trust-boundaries.md § 7 + docs/operations/services-runtime-rules.md.

const DENY = new Set<string>([
  "authorization",
  "apikey",
  "api_key",
  "token",
  "password",
  "prompt",
  "theme",
  "playername",
  "player_name",
  "chattext",
  "chat_text",
  "ip",
  "remoteaddress",
  "x-forwarded-for",
  "set-cookie",
  "cookie",
]);

const REDACTED = "[REDACTED]";

export function redact<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (DENY.has(key.toLowerCase())) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = walk(child);
  }
  return out;
}

export function isDenied(fieldName: string): boolean {
  return DENY.has(fieldName.toLowerCase());
}
