# Building Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the data shape for town buildings. Buildings form a dependency
tree — later tiers require earlier tiers.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Baseline town building-tree reference data
- `content-schema/schemas/resource-id.schema.json`

Outputs:
- `src/content-schema/building.ts` exporting `BuildingSchema` and `Building`

Owned Paths:
- `src/content-schema/building.ts`

Canonical files:
- Schema: [building.schema.json](../../../content-schema/schemas/building.schema.json)
- Example: [kennels.building.json](../../../content-schema/examples/packs/emberwild-faction/buildings/kennels.building.json)

Dependencies:
- mvp.02-content-schemas.02-faction-schema

Acceptance Criteria:
- Parses the Emberwild Kennels building example correctly
- Rejects a building that requires itself (cycle detection at content-load time)
- `BuildingEffect` references the shared effect registry (see
  `docs/architecture/effect-registry.md`) — no ad-hoc effect kinds

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
