# Error and Audit Schemas

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Add the four schemas Plan 22 needs and that have no existing surface:
[`signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json),
[`audit-log-entry.schema.json`](../../../content-schema/schemas/audit-log-entry.schema.json),
and
[`erasure-receipt.schema.json`](../../../content-schema/schemas/erasure-receipt.schema.json)
(plus `signature-error.schema.json` if not already shipped by
22-03). Author canonical examples per schema, register the schemas in
[`schema-matrix.md`](../../../docs/architecture/schema-matrix.md) and
[`content-schema/README.md`](../../../content-schema/README.md), and
extend `scripts/check-repo-contracts.mjs` with the suffix mapping rows.

Plan 22 § 3 — Closed signaling-error / signature-error / audit-log /
erasure-receipt schemas.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

Inputs:
- The closed wire enum (three values) for signaling.
- The closed `OwnerNotice` reason enum.
- The audit-log type enum (`ERASURE`, `REPLAY_EXPORT`,
  `POLICY_ACCEPTED`, `OPT_IN_TOGGLED`).
- The erasure-receipt fields named in Plan 22 § Erasure-receipt UX.

Outputs:
- `content-schema/schemas/signaling-error.schema.json`
- `content-schema/schemas/audit-log-entry.schema.json`
- `content-schema/schemas/erasure-receipt.schema.json`
- Canonical examples for each under `content-schema/examples/`.
- Registration rows in `schema-matrix.md` and
  `content-schema/README.md`.
- Schema-mapping suffix rows in
  `scripts/check-repo-contracts.mjs`.

Owned Paths:
- `content-schema/schemas/signaling-error.schema.json`
- `content-schema/schemas/audit-log-entry.schema.json`
- `content-schema/schemas/erasure-receipt.schema.json`
- `content-schema/examples/signaling-error/`
- `content-schema/examples/audit-log-entry/`
- `content-schema/examples/erasure-receipt/`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Each schema validates its canonical example(s).
- Each schema declares `additionalProperties: false`.
- The signaling-error schema's `wireCode` enum is exactly
  `["JOIN_FAILED", "RATE_LIMITED", "SERVER_ERROR"]`.
- The audit-log-entry schema's `type` enum is exactly
  `["ERASURE", "REPLAY_EXPORT", "POLICY_ACCEPTED", "OPT_IN_TOGGLED"]`.
- The erasure-receipt schema requires `erasureRequestId`, `scope`,
  `performedAt`, `contentHash`, `policyVersion`.
- `npm run validate:contracts` passes.
- `npm run validate:enums` and `npm run generate:enum-snapshot`
  agree (snapshot updated).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
