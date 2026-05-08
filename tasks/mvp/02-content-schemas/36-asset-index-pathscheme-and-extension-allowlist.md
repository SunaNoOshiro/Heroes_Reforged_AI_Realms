# Asset Index pathScheme And Extension Allowlist

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Tighten [`asset-index.schema.json`](../../../content-schema/schemas/asset-index.schema.json)
to forbid absolute schemes (`http`, `https`, `file`, `data`,
`blob`), parent-directory escapes, and any extension outside the
closed allowlist (`png`, `webp`, `ogg`, `mp3`, `json`). Adds a
required `pathScheme: "pack-relative"` constant. Per
[`ugc-safety.md` § External URL Ban](../../../docs/architecture/ugc-safety.md#1-external-url-ban).

Read First:
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)
- [`docs/architecture/pack-contract.md` § Asset Path Scheme](../../../docs/architecture/pack-contract.md)

Inputs:
- Closed extension allowlist.
- CSP baseline from `ugc-safety.md` § CSP Baseline.

Outputs:
- Updated `content-schema/schemas/asset-index.schema.json`.
- Canonical example
  `content-schema/examples/asset-index/canonical.asset-index.json`.

Owned Paths:
- `content-schema/schemas/asset-index.schema.json`
- `content-schema/examples/asset-index/`

Canonical files:
- Schema: [asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json)
- Example: [canonical.asset-index.json](../../../content-schema/examples/asset-index/canonical.asset-index.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema rejects entries with absolute schemes, leading slashes,
  parent-directory escapes, or non-allowlisted extensions.
- `pathScheme` is a required const `"pack-relative"`.
- The pack-loader task acceptance lines reject any
  `assets/index.json` whose `pathScheme != "pack-relative"`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
