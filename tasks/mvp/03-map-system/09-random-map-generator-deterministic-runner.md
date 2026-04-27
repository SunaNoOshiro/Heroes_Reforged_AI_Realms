# Random Map Generator Deterministic Runner

Status: planned

Module: [Map System (M1)](../03-map-system.md)

Description:
Implement the deterministic runner that turns a random-map template plus
seed into a `WorldState`. The runner consumes named RNG sub-streams in a
fixed order and produces canonical JSON-compatible map data.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Template normalizer from Task 8
- Tile storage, terrain registry, and serializer
- PCG32 RNG from engine core

Outputs:
- `src/engine/map/random-map-generator.ts`
- `generateRandomMap(template, seed): WorldState`
- Golden fixture tests for generated maps

Owned Paths:
- `src/engine/map/random-map-generator.ts`

Dependencies:
- mvp.03-map-system.08-random-map-generator-template-format
- mvp.03-map-system.06-map-serializer-deserializer
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams

Acceptance Criteria:
- Same template, seed, and content hashes produce byte-identical map
  serialization
- Different RNG sub-streams are used for topology, terrain, objects,
  guards, and rewards
- Generated maps always include valid player starts and reachable core
  objectives
- Runner fails loudly when template constraints cannot be satisfied

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
