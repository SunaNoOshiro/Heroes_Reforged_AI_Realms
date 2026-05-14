# Error Formatter Contract

> Companion docs:
> [`error-ux.md`](./error-ux.md) (surface decision matrix),
> [`error-taxonomy.md`](./error-taxonomy.md) (severities, record shape),
> [`error-codes.md`](./error-codes.md) (wire-visible vocabularies),
> [`crypto-rules.md`](./crypto-rules.md) (`redact: true` tag),
> [`production-build.md`](./production-build.md) (`__DEV__`, cause-chain stripping),
> [`state-flow.md`](./state-flow.md) (names this module as the only UI error sink),
> [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
> (closed `errors.*` namespace).

The single sink that converts thrown `Error` instances into user-grade
text and developer-grade dev sinks. Every UI toast, modal, and console
write that originates from a thrown error MUST route through this
contract. Outside `src/errors/`, the following are banned: raw
`err.message`, `err.stack`, `String(err)`, `` `${err}` ``,
`JSON.stringify(err)`.

## 1. API

The contract is implemented in two reserved paths under `src/errors/`
(owned by
[`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)):

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

- `formatUserError` is the **only** function that may produce text
  bound into a UI sink (toasts, modals, inline panels).
- `formatDevError` is the **only** function that may produce text
  bound into a developer sink (browser console, on-device crash log
  file).

## 2. Required behaviour

Both functions:

1. strip `Error.stack` from any user-visible payload;
2. drop the `Error.cause` chain in production builds (see
   [`production-build.md`](./production-build.md) rule 3); preserve
   it in dev builds for `formatDevError` only;
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
- IPv4 dotted-quad literals and IPv6 colon-segmented literals
  (covers WebRTC ICE candidates and signaling peer addresses — see
  [`64-network-lobby/spec.md` § Peer-Failure Error Contract](./wiki/screens/64-network-lobby/spec.md#peer-failure-error-contract));
- base64 payloads ≥ 32 characters (heuristic for SDP / ICE blobs and
  signed-blob fragments);
- any structured-error field tagged `redact: true`. A structured
  error is any object that extends `Error` and carries a `redact`
  property; the formatter inspects the property and treats matching
  values as opaque. The `redact: true` tag is the contract
  [`crypto-rules.md` § 2](./crypto-rules.md#2-throw--uniform-error-never-carry-the-secret)
  uses to suppress secret-compare leakage.

A matched value is replaced with the literal `[redacted]` (no
surrounding quotes). The redactor never partially redacts a value;
substring redaction is out of scope to keep the contract trivially
auditable.

## 4. `errorId` generation

Every call to `formatUserError` and `formatDevError` allocates a
fresh UUID v4 via `crypto.randomUUID()`. The `errorId` is:

- attached to the user-grade toast (`"Error abc-123"`);
- attached to the dev-grade payload at the same key;
- emitted to the `error.shown` telemetry event declared by
  [`error-ux.md` § 4](./error-ux.md#4-telemetry-tagging);
- never derived from any field of the underlying error (so it
  cannot leak its source).

## 5. Locale resolution

`formatUserError` consults the active locale through the same loader
that backs
[`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
resolution. If the requested locale is missing the key, the
formatter falls back to the bundle's `fallbackLocale`. If both are
missing, the formatter returns `errors.generic` and emits an
`error.shown` telemetry event with `reason: "missing_locale_key"`.

Keys MAY be marked `@fallbackOnly` (a doc-only marker on the
localization example) — these are not required in every locale, only
in the fallback bundle.

## 6. Production vs dev branching

Reads `__DEV__` at module load time (the constant declared in
[`production-build.md` rule 1](./production-build.md#1-__dev__-is-constant-folded)).

- `__DEV__ === true` (dev build): `formatUserError` still returns a
  closed key; `formatDevError` keeps the full redacted message and
  redacted stack.
- `__DEV__ === false` (prod build): `formatUserError` runs unchanged;
  `formatDevError` drops `Error.cause` chains entirely; only the
  redacted top-level message and a synthetic single-line stack
  (`"Error abc-123 in <module>"`) survive.

The on-device crash log writer documented in
[`data-inventory.md` § 4 Crash Dumps](./data-inventory.md#4-crash-dumps)
consumes `formatDevError`. There is **no** automatic upload; the
user must explicitly press "Send report" in
[`75-content-report`](./wiki/screens/75-content-report/) after
seeing the redacted preview.

## 7. Schema-validation errors

When an Ajv-style validator throws (save import, pack manifest
import, AI-generation pipeline output validation, peer envelope
validation), `formatUserError` classifies the error into one of the
closed import keys:

- `errors.import.versionMismatch`
- `errors.import.corrupted`
- `errors.import.unsupportedPack`
- `errors.import.tooOld`
- `errors.import.unknown`

The classifier mapping lives in `src/errors/import-classifier.ts`
(reserved by
[`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)).
`formatDevError` of the same error returns the full Ajv `errors[]`
array — only ever shown in the dev console.

This rule applies to **every** schema-validation surface. The
save-import flow consumes the contract today; future flows
(peer-envelope validation, pack-manifest import) inherit it.

## 8. Banned patterns (CI lint)

The fixture-driven lint test `tests/lint/no-raw-error-message-in-ui.test.ts`
(reserved by
[`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md))
asserts the following patterns do not appear inside `src/ui/` or
`src/services/*` (anywhere outside `src/errors/`):

- `err.message`
- `err.stack`
- `String(err)`
- `` `${err}` ``
- `JSON.stringify(err)` where the argument is a thrown error

Violations fail the lint test. Integration with the project's chosen
lint tool lands with the build pipeline; the fixture test is the
gate for now.

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
- [`state-flow.md`](./state-flow.md) — names this module as the
  only error sink crossing the UI boundary.
- [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
  — closed `errors.*` namespace consumed by `formatUserError`.

---

## 🔍 Sync Check

- **UI: ✔** — § 3 IP-pattern reference resolves to
  [`64-network-lobby/spec.md` § Peer-Failure Error Contract](./wiki/screens/64-network-lobby/spec.md#peer-failure-error-contract)
  exactly; § 6 "Send report" path resolves to
  [`75-content-report`](./wiki/screens/75-content-report/) per
  [`production-build.md` rule 4](./production-build.md#4-console-sinks-route-through-formatdeverror).
  The `formatUserError(err, locale)` rule is registered on every
  screen `interactions.md` (acceptance criterion of task
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)).
- **Schema: ✔** — Every `errors.*` key named in §§ 2, 5, 7
  (`generic`, `import.{versionMismatch, corrupted, unsupportedPack,
  tooOld, unknown}`) is required by
  [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
  (lines 30, 58–75); `Localization` row present in
  [`schema-matrix.md`](./schema-matrix.md). The `error.shown`
  telemetry event referenced in §§ 4–5 is the same row registered in
  [`observability.md` row 12](./observability.md#4-required-emissions-catalogue).
- **Tasks: ⚠** — Owning task
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)
  lists this file in `Owned Paths`, names the API signatures, the
  redaction allowlist, the `errorId` rule, and § 7 as its acceptance
  criteria. The task's reserved `src/errors/*` paths cover
  `format.ts` and `redact.ts` only — not `import-classifier.ts`
  cited in § 7. Detail in `## ⚠ Issues`.

## ⚠ Issues

- **`src/errors/import-classifier.ts` not reserved by task 22-01.**
  § 7 claims the import classifier lives in
  `src/errors/import-classifier.ts` "reserved by
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)",
  but that task's `Outputs` and `Owned Paths` only reserve
  `src/errors/format.ts` and `src/errors/redact.ts`. Either the
  classifier path needs to be added to task 22-01's `Outputs` (most
  consistent — the classifier is the surface that decides which
  `errors.import.*` key fires) or § 7 should drop the path and
  describe the mapping as living inside `format.ts`. Per
  [`.agents/rules/tasks.md`](../../.agents/rules/tasks.md) (task
  paths are authoritative), task 22-01 owns the call. Suggested
  values: add `src/errors/import-classifier.ts (reserved path)` to
  task 22-01's `Outputs` list. Skill did not edit the task file
  (Hard Prohibition D — never edit cross-checked files).
- **Localization-key convention conflict across sibling error docs.**
  This file uses the plural-camelCase form
  (`errors.import.versionMismatch`, `errors.generic`) which matches
  [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
  exactly. [`error-ux.md` § 3](./error-ux.md#3-localization-key-naming)
  uses `error.<domain>.<code>.<part>` (singular `error`, hyphenated,
  with `body` / `title` / `cta` parts);
  [`error-taxonomy.md` § 4](./error-taxonomy.md#4-user-facing-vs-internal)
  uses `errors.<lowercase code>` (snake-case). The localization
  runtime can honor only one; the schema sides with this file.
  Already flagged from the `error-ux.md`, `error-taxonomy.md`, and
  `error-codes.md` audit trailers; surfaced again because this file
  is the runtime that resolves codes to keys. Owner:
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md).
  Skill did not silently rewrite either side because the conflict is
  structural and surfaces across three sibling docs.
