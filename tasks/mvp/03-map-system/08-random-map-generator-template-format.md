# Random Map Generator Template Format

Module: [Map System (M1)](../03-map-system.md)

Description:
Implement the runtime representation for random-map templates. The
format is validated by schema, then normalized into deterministic zone,
connection, terrain, start-position, and object-pool records.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- `docs/architecture/wiki/screens/06-random-map-setup/interactions.md`

Inputs:
- `content-schema/schemas/random-map-template.schema.json`
- World and map-object registries
- PCG32 named RNG streams from engine core

Outputs:
- `src/engine/map/random-map-template.ts`
- `RandomMapTemplate` runtime type and normalizer
- Validation fixtures for valid and invalid template graphs

Owned Paths:
- `src/engine/map/random-map-template.ts`

Dependencies:
- mvp.03-map-system.03-layered-tile-storage
- mvp.02-content-schemas.18-random-map-template-schema

Acceptance Criteria:
- Templates normalize to stable sorted arrays and ID maps
- Zone graph validation detects disconnected or impossible templates
- Every object pool entry references content IDs, not asset paths
- `ROLL_RMG_SEED` and `GENERATE_RANDOM_MAP` have a typed template input

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
