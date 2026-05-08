# Unit Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the full data shape for a unit type. This is the most-referenced schema in the engine — every combat calculation reads from it.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Baseline unit reference data (research docs, baseline ruleset)

Outputs:
- `src/content-schema/unit.ts` exporting `UnitSchema` (Zod) and `Unit` (inferred type)

Owned Paths:
- `src/content-schema/unit.ts`

Canonical files:
- Schema: [unit.schema.json](../../../content-schema/schemas/unit.schema.json)
- Example: [ash-hound.unit.json](../../../content-schema/examples/packs/emberwild-faction/units/ash-hound.unit.json)

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- Zod parses the Emberwild Ash Hound example object without errors
- Zod rejects an object with a negative `hp` value
- Zod rejects an object missing required fields
- `Unit` TypeScript type is fully inferred (no manual type declarations needed)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
