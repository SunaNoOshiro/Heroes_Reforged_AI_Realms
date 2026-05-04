# Error Formatter Contract and `errors.*` Namespace

Status: planned

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Author [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)
declaring `formatUserError` and `formatDevError` as the only sinks
that produce text bound into UI / developer surfaces. Add the closed
`errors.*` namespace to
[`localization.schema.json`](../../../content-schema/schemas/localization.schema.json).
Reserve `src/errors/format.ts` and `src/errors/redact.ts` as the
implementation paths plus a fixture-driven lint test
`tests/lint/no-raw-error-message-in-ui.test.ts` that bans raw
`err.message`, `err.stack`, `String(err)`, `${err}`, and
`JSON.stringify(err)` outside `src/errors/`. Sweep the 70+ screen
`interactions.md` files to append the rule
"errors are produced by `formatUserError(err, locale)`; never
construct error toast text inline."

Plan 22 § 2 — Centralized error-formatter and lint contract.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/error-ux.md`](../../../docs/architecture/error-ux.md)
- [`docs/architecture/error-taxonomy.md`](../../../docs/architecture/error-taxonomy.md)

Inputs:
- The closed surface mapping in `error-ux.md`.
- The closed `errors.*` localization keys listed in the plan.

Outputs:
- `docs/architecture/error-formatter.md`
- `content-schema/schemas/localization.schema.json` (additive `errors.*`).
- `src/errors/format.ts` (reserved path; lint test gates implementation).
- `src/errors/redact.ts` (reserved path).
- `tests/lint/no-raw-error-message-in-ui.test.ts` (reserved path).
- Append-edit on every `docs/architecture/wiki/screens/*/interactions.md`
  to register the formatter rule.

Owned Paths:
- `docs/architecture/error-formatter.md`
- `tests/lint/no-raw-error-message-in-ui.test.ts`

Owned Paths (shared):
- `content-schema/schemas/localization.schema.json` is the **primary
  contract** of `mvp.02-content-schemas.10-zod-validators-for-all-schemas`;
  this task adds the `errors.*` namespace **additively** and does not
  rewrite the existing `entries` shape.
- `docs/architecture/wiki/screens/*/interactions.md` are owned by
  individual screen tasks; this task adds **additive** boilerplate
  only and must not rewrite any existing action row.

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `docs/architecture/error-formatter.md` declares the two API
  signatures, the redaction allowlist, the `errorId` UUID v4 rule,
  prod / dev branching, and § Schema-validation errors.
- `grep -L "formatUserError" docs/architecture/wiki/screens/*/interactions.md | wc -l`
  equals `0`.
- `tests/lint/no-raw-error-message-in-ui.test.ts` ships a fixture
  table covering every banned pattern.

Owned Paths (shared) acceptance:
- `content-schema/schemas/localization.schema.json` is **owned by**
  `mvp.02-content-schemas.10-zod-validators-for-all-schemas` (the
  primary contract). This task is **additive**: a new closed
  `errors.*` namespace is appended; the existing `entries` property,
  required list, and per-key interpolation block must not be
  rewritten.
- Each `docs/architecture/wiki/screens/*/interactions.md` is **owned
  by** the screen-package-contract-sweep tasks under
  `mvp.07-ui-shell` (the primary owner of every screen package).
  This task is **additive**: it appends one sentence registering the
  `formatUserError` rule; existing action rows, error surfaces, and
  navigation outcomes must not rewrite anything else.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
