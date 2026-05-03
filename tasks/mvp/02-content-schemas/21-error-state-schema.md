# ErrorState Schema (canonical UI error record)

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Land the canonical `ErrorState` JSON schema and three example records.
Every cross-screen error pipe (toast tray, recoverable-error panel,
telemetry sink) consumes this shape. Today every screen invents its
own error fields; without the shared schema, telemetry cannot key on
stable codes and localization fallbacks differ per screen. The schema
is presentation-only — `ErrorState` lives under `state.ui.*` and is
excluded from saves, replays, and the canonical state hash.

Source audit:
[`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
(Q54, Issue 3.B-1, Missing Logic bullet 3).

Read First:
- [`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../../../docs/implementation-plans/03-ui-state-and-interactions-plan.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Audit Q54 in
  [`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
- Existing per-screen error bindings under
  [`docs/architecture/wiki/screens/59-loading-screen/`](../../../docs/architecture/wiki/screens/59-loading-screen/)
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)
  (referenced by `retryAction`)
- [`content-schema/schemas/localization.schema.json`](../../../content-schema/schemas/localization.schema.json)
  (referenced by `messageKey`)

Outputs:
- `content-schema/schemas/error-state.schema.json`
- `content-schema/examples/records/error-state/recoverable-load.error-state.json`
- `content-schema/examples/records/error-state/invalid-target.error-state.json`
- `content-schema/examples/records/error-state/save-failed.error-state.json`

Owned Paths:
- `content-schema/schemas/error-state.schema.json`
- `content-schema/examples/records/error-state/recoverable-load.error-state.json`
- `content-schema/examples/records/error-state/invalid-target.error-state.json`
- `content-schema/examples/records/error-state/save-failed.error-state.json`

Dependencies:
- None

Acceptance Criteria:
- `content-schema/schemas/error-state.schema.json` parses as JSON
  Schema 2020-12 with `additionalProperties: false`.
- Required fields are `code`, `severity`, and `messageKey`. `severity`
  is a closed enum of `info | warn | error | fatal`. `retryAction`
  `$ref`s `command.schema.json` so retried commands flow through the
  normal nonce gate.
- All three canonical examples validate against the schema and cover
  the three severity tiers (`warn` recoverable load, `warn`
  recoverable invalid target, `error` non-recoverable save failure).
- `docs/architecture/schema-matrix.md` lists `ErrorState` and links
  the schema by canonical path.
- `content-schema/schemas/README.md` registers the schema under the
  UI presentation contracts family.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 3 hours
