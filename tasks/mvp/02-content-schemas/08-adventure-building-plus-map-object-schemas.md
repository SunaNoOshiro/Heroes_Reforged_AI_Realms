# Adventure Building + Map Object Schemas

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define schemas for visitable adventure-map buildings and generic map
objects such as mines, shrines, quest huts, treasure chests, portals,
and creature banks. These must separate interaction logic from map
sprite, state visuals, and animation bindings.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Building schema (Task 5) for shared economy/prerequisite patterns
- Ruleset schema (Task 6) for economy and reward constants
- Effect registry (Task 13) for closed reward/economy payloads

Outputs:
- `src/content-schema/adventure-building.ts`
- `src/content-schema/map-object.ts`
- `src/content-schema/neutral-stack-template.ts`
- `content-schema/schemas/adventure-building.schema.json`
- `content-schema/schemas/map-object.schema.json`
- `content-schema/schemas/neutral-stack-template.schema.json`
- canonical examples under `content-schema/examples/records/adventure-buildings/`,
  `content-schema/examples/records/map-objects/`, and
  `content-schema/examples/records/neutral-stack-templates/`

Owned Paths:
- `src/content-schema/adventure-building.ts`
- `src/content-schema/map-object.ts`
- `src/content-schema/neutral-stack-template.ts`
- `content-schema/schemas/adventure-building.schema.json`
- `content-schema/schemas/map-object.schema.json`
- `content-schema/schemas/neutral-stack-template.schema.json`
- `content-schema/examples/records/adventure-buildings/`
- `content-schema/examples/records/map-objects/`
- `content-schema/examples/records/neutral-stack-templates/`

Dependencies:
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.13-effect-registry

Acceptance Criteria:
- Adventure buildings, map objects, and neutral-stack templates are
  closed schemas with explicit `kind`-based gameplay sub-objects
- Rewards and economy payloads reuse the shared effect/formula
  contracts instead of inventing local mini-DSLs
- Presentation fields remain ID-based and optional where gameplay does
  not require them
- Canonical examples validate and demonstrate at least one capturable
  economy building, one reward object, and one guarded neutral template

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
