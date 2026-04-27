# Faction Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the data shape for a faction. A faction is the container for units, heroes, buildings, and alignment metadata.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Unit schema (Task 1)

Outputs:
- `src/content-schema/faction.ts` exporting `FactionSchema` and `Faction`

Owned Paths:
- `src/content-schema/faction.ts`

Canonical files:
- Schema: [faction.schema.json](../../../content-schema/schemas/faction.schema.json)
- Example: [faction.json](../../../content-schema/examples/packs/emberwild-faction/faction.json)

Dependencies:
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- Parses the Emberwild example faction descriptor
- Rejects a faction with duplicate unit IDs
- All referenced IDs are strings (cross-reference validation happens at content-load time, not schema time)

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
