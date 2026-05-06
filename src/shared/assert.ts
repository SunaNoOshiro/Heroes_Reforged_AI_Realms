// src/shared/assert.ts
//
// Owner: docs/architecture/fail-loud.md.
//
// Single global assert helper enforcing the "missing gameplay
// requirements must fail loudly" rule from CLAUDE.md. Throws a
// typed TrustViolationError on failure; never silently coerces.
// The error name is reserved — lint refuses catching it.
//
// The runtime body for structured-log emission lands when the
// first trusted-core code path needs it; this stub pins the
// public surface so callers can `import { assert } from
// "@hr/shared/assert"` today.

export class TrustViolationError extends Error {
  readonly fields?: Record<string, string | number | boolean | null>;

  constructor(
    message: string,
    fields?: Record<string, string | number | boolean | null>,
  ) {
    super(message);
    this.name = "TrustViolationError";
    this.fields = fields;
  }
}

export function assert(
  condition: unknown,
  message: string,
  fields?: Record<string, string | number | boolean | null>,
): asserts condition {
  if (!condition) {
    throw new TrustViolationError(message, fields);
  }
}
