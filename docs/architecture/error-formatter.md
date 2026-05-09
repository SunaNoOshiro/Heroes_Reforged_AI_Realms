# Error Formatter Contract

The single sink that converts thrown `Error` instances into user-grade
text and developer-grade dev sinks. Every UI toast, modal, and console
write that originates from a thrown error must route through this
contract; raw `err.message`, `err.stack`, `String(err)`, `${err}`, and
`JSON.stringify(err)` are banned outside `src/errors/`.

## 1. API

The contract is implemented in two reserved paths under `src/errors/`:

```ts
// src/errors/format.ts
export interface UserError {
  messageKey: string;                    // closed key from localization.schema.json#errors.*
  params: Record<string, string>;        // safe interpolation tokens (no PII)
  errorId: string;                       // UUID v4; user-visible "Error abc-123" shorthand
  severity: 'info' | 'warn' | 'fatal';
}

export function formatUserError(err: unknown, locale: string): UserError;

export interface DevError {
  errorId: string;
  redactedMessage: string;
  redactedStack: string;
}

export function formatDevError(err: unknown): DevError;
```

`formatUserError` is the **only** function that may produce text bound
into a UI sink. `formatDevError` is the **only** function that may
produce text bound into a developer sink (browser console, on-device
crash log file).

## 2. Required behaviour

Both functions:

1. strip `Error.stack` from any user-visible payload;
2. drop the `Error.cause` chain in production builds (see
   [`production-build.md`](./production-build.md) rule 3); preserve it
   in dev builds for `formatDevError` only;
3. replace any value matching the redaction allowlist patterns
   (defined in § 3) with `[redacted]`;
4. attach an `errorId` (UUID v4) so a user-grade toast can render
   "Error abc-123" while the dev sink keeps the full context.

`formatUserError` always returns a key from the closed `errors.*`
namespace declared in
[`localization.schema.json`](../../content-schema/schemas/localization.schema.json).
If the classifier cannot resolve a more specific key, it returns
`errors.generic`.

## 3. Redaction allowlist

The redactor strips every match of the following patterns before
either function returns:

- file paths under `node_modules/` (e.g.
  `/Users/.../node_modules/foo/bar.js:42:10`);
- absolute filesystem paths beginning with `/` or a drive letter
  (`C:\…`);
- IPv4 `dotted-quad` literals and IPv6 `:`-segmented literals (covers
  WebRTC ICE candidates and signaling peer addresses — see
  [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  § Peer-Failure Error Contract);
- base64 payloads ≥ 32 characters (heuristic for SDP / ICE blobs and
  signed-blob fragments);
- any structured-error field tagged `redact: true`. A structured
  error is any object that extends `Error` and carries a `redact`
  property; the formatter inspects the property and treats matching
  values as opaque.

When a value is replaced, the formatter writes `[redacted]` (literal,
no surrounding quotes). The redactor never partially redacts a value;
"redact a substring of a longer string" is out of scope to keep the
contract trivially auditable.

## 4. `errorId` generation

Every call to `formatUserError` and `formatDevError` allocates a
fresh UUID v4 via `crypto.randomUUID()`. The `errorId` is:

- attached to the user-grade toast (`"Error abc-123"`);
- attached to the dev-grade payload at the same key;
- emitted to the `error.shown` telemetry event declared by
  [`error-ux.md`](./error-ux.md);
- never derived from any field of the underlying error (so it
  cannot leak its source).

## 5. Locale resolution

`formatUserError` consults the active locale through the same loader
that backs `localization.schema.json` resolution. If the requested
locale is missing the key, the formatter falls back to the bundle's
`fallbackLocale`. If both are missing, the formatter returns
`errors.generic` and emits an `error.shown` telemetry event with
`reason: "missing_locale_key"`.

Keys MAY be marked `@fallbackOnly` (a doc-only marker on the localization
example) — these are not required in every locale, only in the
fallback bundle.

## 6. Production vs dev branching

Reads `__DEV__` at module load time (the constant declared in
[`production-build.md`](./production-build.md) rule 1).

- `__DEV__ === true` (dev build): `formatUserError` still returns a
  closed key; `formatDevError` keeps the full redacted message and
  redacted stack.
- `__DEV__ === false` (prod build): `formatUserError` runs unchanged;
  `formatDevError` drops `Error.cause` chains entirely; only the
  redacted top-level message and a synthetic single-line stack
  ("Error abc-123 in <module>") survive.

The on-device crash log writer documented in
[`data-inventory.md` § Crash Dumps](./data-inventory.md#4-crash-dumps)
consumes `formatDevError`. There is **no** automatic upload; the
user must explicitly press "Send report" in screen 75
(content-report) after seeing the redacted preview.

## 7. Schema-validation errors

When an Ajv-style validator throws (save import, pack manifest
import, AI-generation pipeline output validation, peer envelope
validation), the formatter classifies the error into one of the
closed import keys:

- `errors.import.versionMismatch`
- `errors.import.corrupted`
- `errors.import.unsupportedPack`
- `errors.import.tooOld`
- `errors.import.unknown`

The mapping lives in `src/errors/import-classifier.ts` (reserved
path; specified by task **22-01** in the plan). `formatDevError` of
the same error returns the full Ajv `errors[]` array — only ever
shown in the dev console.

This rule applies to **every** schema-validation surface. the save-import flow consumes this contract; future flows (peer envelope
validation, pack-manifest import) inherit it.

## 8. Banned patterns (CI lint)

Task **22-01** ships `tests/lint/no-raw-error-message-in-ui.test.ts`,
a fixture-driven lint rule that asserts the following patterns do
not appear inside `src/ui/` or `src/services/*` (anywhere outside
`src/errors/`):

- `err.message`
- `err.stack`
- `String(err)`
- `` `${err}` ``
- `JSON.stringify(err)` where the argument is a thrown error

Violations fail the lint test. The lint integration with the
project's chosen lint tool lands with the build pipeline;
the fixture test is the gate for now.

## 9. Cross-references

- [`production-build.md`](./production-build.md) — `__DEV__` and
  source-map rules; consumers of `formatUserError` rely on these
  flags.
- [`crypto-rules.md`](./crypto-rules.md) — secret-compare failures
  throw with `redact: true`; the formatter strips them.
- [`error-codes.md`](./error-codes.md) — closed wire-error
  vocabulary for signaling and AI gateway boundaries.
- [`error-ux.md`](./error-ux.md) — surface-decision matrix
  (toast / inline / modal / log-only).
- [`error-taxonomy.md`](./error-taxonomy.md) — error severities
  and code-to-record schema.
- [`state-flow.md`](./state-flow.md) — names this module as the only
  error sink crossing the UI boundary.
- [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
  — closed `errors.*` namespace consumed by `formatUserError`.
