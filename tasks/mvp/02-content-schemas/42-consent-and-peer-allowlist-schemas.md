# Consent And Peer-Allowlist Schemas

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Add the schemas Plan 23 needs that have no existing surface:
[`consent.schema.json`](../../../content-schema/schemas/consent.schema.json),
[`consent-audit-log.schema.json`](../../../content-schema/schemas/consent-audit-log.schema.json),
and
[`peer-allowlist.schema.json`](../../../content-schema/schemas/peer-allowlist.schema.json).
Author canonical examples per schema, register them in
[`schema-matrix.md`](../../../docs/architecture/schema-matrix.md) and
[`content-schema/README.md`](../../../content-schema/README.md), and
extend `scripts/check-repo-contracts.mjs` with the suffix mapping rows.

Plan 23 § 3 / Critical Fix 2.

Read First:
- [`docs/implementation-plans/23-unsafe-actions-ux-and-consent-plan.md`](../../../docs/implementation-plans/23-unsafe-actions-ux-and-consent-plan.md)
- [`docs/architecture/onboarding.md`](../../../docs/architecture/onboarding.md)
- [`docs/architecture/peer-trust.md`](../../../docs/architecture/peer-trust.md)

Inputs:
- Closed `ConsentScope` enum (`storage`, `multiplayer`, `aiGeneration`, `telemetry`, `crashReports`, `analytics`, `unsignedPacks`).
- Closed `state` enum (`unset`, `granted`, `revoked`, `denied`).
- Closed `method` enum (`explicit`, `import`, `legacy`, `session`).
- Per-scope `tier` enum (`required`, `optional`).

Outputs:
- `content-schema/schemas/consent.schema.json`
- `content-schema/schemas/consent-audit-log.schema.json`
- `content-schema/schemas/peer-allowlist.schema.json`
- Canonical examples under `content-schema/examples/consent/`,
  `content-schema/examples/consent-audit-log/`, and
  `content-schema/examples/peer-allowlist/`.
- Registration rows in
  [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md) and
  [`content-schema/README.md`](../../../content-schema/README.md).
- Schema-mapping suffix rows in
  [`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs).

Owned Paths:
- `content-schema/schemas/consent.schema.json`
- `content-schema/schemas/consent-audit-log.schema.json`
- `content-schema/schemas/peer-allowlist.schema.json`
- `content-schema/examples/consent/`
- `content-schema/examples/consent-audit-log/`
- `content-schema/examples/peer-allowlist/`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.41-error-and-audit-schemas

Acceptance Criteria:
- Each schema validates its canonical example(s).
- Each schema declares `additionalProperties: false`.
- `consent.schema.json` `scope` enum equals exactly
  `["storage", "multiplayer", "aiGeneration", "telemetry", "crashReports", "analytics", "unsignedPacks"]`.
- `consent.schema.json` `state` enum equals exactly
  `["unset", "granted", "revoked", "denied"]`.
- `consent.schema.json` `method` enum equals exactly
  `["explicit", "import", "legacy", "session"]`.
- `consent-audit-log.schema.json` declares a capacity bound
  `[16, 1024]`, default 256.
- `peer-allowlist.schema.json` declares a capacity bound
  `[16, 1024]`, default 256, and a closed `tier` enum
  `["friend", "recent"]`.
- `npm run validate:contracts` passes.
- `npm run validate:enums` and `npm run generate:enum-snapshot`
  agree (snapshot updated).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
