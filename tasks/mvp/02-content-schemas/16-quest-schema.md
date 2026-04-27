# Quest Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the quest contract used by quest huts, campaign objectives, and
the quest log. Quests are content records with stable IDs, declarative
objectives, deterministic completion checks, and rewards expressed
through the effect registry.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `content-schema/schemas/effect.schema.json`
- `content-schema/schemas/condition.schema.json`
- Map object schemas from Task 8

Outputs:
- `content-schema/schemas/quest.schema.json`
- `src/content-schema/quest.ts`
- Canonical quest examples under `content-schema/examples/records/quests/`

Owned Paths:
- `content-schema/schemas/quest.schema.json`
- `src/content-schema/quest.ts`
- `content-schema/examples/records/quests/`

Dependencies:
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.13-effect-registry

Acceptance Criteria:
- Quest objectives are a closed discriminated union for visit, deliver,
  defeat, collect, and survive-until conditions
- Rewards use effect-registry payloads and never embed imperative script
- Quest progress serializes with stable quest and source IDs only
- Canonical examples validate and include one timed objective and one
  reward-bearing objective

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
