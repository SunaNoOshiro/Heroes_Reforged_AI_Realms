# Save Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Pin the closed shape of an exportable save record. Imports validate
against this schema **before** any pack mount, asset fetch, or
IndexedDB write per
[`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md).
The Zod counterpart and runtime validator live in the persistence
module.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)
- [`docs/architecture/diagrams/24-save-flow.md`](../../../docs/architecture/diagrams/24-save-flow.md)
- [`docs/architecture/diagrams/25-load-flow.md`](../../../docs/architecture/diagrams/25-load-flow.md)

Inputs:
- Existing on-disk shape from
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../08-persistence/02-log-only-save-format.md)

Outputs:
- `content-schema/schemas/save.schema.json`
- Canonical example
  `content-schema/examples/save/canonical.save.json`
- Negative example
  `content-schema/examples/save/pack-skew.save.json`

Owned Paths:
- `content-schema/schemas/save.schema.json`
- `content-schema/examples/save/`

Canonical files:
- Schema: [save.schema.json](../../../content-schema/schemas/save.schema.json)
- Example: [canonical.save.json](../../../content-schema/examples/save/canonical.save.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema validates the canonical example.
- Schema rejects each negative example.
- `saveVersion`, `engineHash`, `packHashes`, and `stateHash` are all
  pattern-checked.
- The schema is referenced from
  [`pack-trust.md` § Save Version Bounds](../../../docs/architecture/pack-trust.md#3-save-version-bounds).

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
