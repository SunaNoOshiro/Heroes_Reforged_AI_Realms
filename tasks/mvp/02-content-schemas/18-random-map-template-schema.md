# Random Map Template Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the deterministic random-map template contract. Templates
describe zones, player starts, connection rules, terrain budgets,
object pools, and RNG stream names so generated maps can be replayed
from seed plus content hash.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- `content-schema/schemas/world.schema.json`
- `content-schema/schemas/map-object.schema.json`
- `content-schema/schemas/ruleset.schema.json`

Outputs:
- `content-schema/schemas/random-map-template.schema.json`
- `src/content-schema/random-map-template.ts`
- Canonical examples under `content-schema/examples/records/random-map-templates/`

Owned Paths:
- `content-schema/schemas/random-map-template.schema.json`
- `src/content-schema/random-map-template.ts`
- `content-schema/examples/records/random-map-templates/`

Dependencies:
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.15-world-schema

Acceptance Criteria:
- Template zones, links, terrain weights, and object pools validate
  without runtime code
- Every random choice names an RNG sub-stream and consumes integer
  weights only
- Template output references stable record IDs, never raw asset paths
- Invalid disconnected zone graphs fail validation with a clear path

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
