# University Skill Table

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define university skill-offer content. A university record exposes a
deterministic set of purchasable skill IDs, costs, availability rules,
and localization keys consumed by the university screen and command.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `content-schema/schemas/skill.schema.json`
- `content-schema/schemas/resource-id.schema.json`
- `content-schema/schemas/condition.schema.json`

Outputs:
- `content-schema/schemas/university-skill-table.schema.json`
- `src/content-schema/university-skill-table.ts`
- Canonical examples under `content-schema/examples/records/university-skill-tables/`

Owned Paths:
- `content-schema/schemas/university-skill-table.schema.json`
- `src/content-schema/university-skill-table.ts`
- `content-schema/examples/records/university-skill-tables/`

Dependencies:
- mvp.02-content-schemas.13-effect-registry
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- University offers reference skill IDs and costs by stable IDs
- Availability rules are declarative conditions
- The table validates duplicate skill offers and invalid resources
- UI text resolves through localization IDs, not embedded labels

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
