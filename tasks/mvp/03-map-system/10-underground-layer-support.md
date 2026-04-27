# Underground Layer Support

Status: planned

Module: [Map System (M1)](../03-map-system.md)

Description:
Extend map storage, coordinates, pathfinding, fog, and serialization to
support surface and underground layers. Layer transitions are explicit
map objects and the renderer/UI consumes layer IDs rather than raw z
branching.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- `docs/architecture/wiki/screens/15-underground-toggle/interactions.md`
- `docs/architecture/wiki/screens/16-view-world/interactions.md`

Inputs:
- Tile storage from Task 3
- Pathfinder and fog from Tasks 4 and 5
- Map object schemas from content schemas

Outputs:
- `src/engine/map/layers.ts`
- Layer-aware coordinate helpers and serializer updates
- Pathfinding tests for subterranean gates

Owned Paths:
- `src/engine/map/layers.ts`
- `src/engine/map/hex.ts`
- `src/engine/map/pathfinding.ts`
- `src/engine/map/fog.ts`
- `src/engine/map/serialize.ts`

Dependencies:
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc
- mvp.03-map-system.05-fog-of-war
- mvp.03-map-system.06-map-serializer-deserializer

Acceptance Criteria:
- Surface and underground tiles serialize deterministically with layer IDs
- Pathfinder traverses layers only through valid transition objects
- Fog-of-war is tracked per player and per layer
- Screen 15 and 16 selectors can switch view layer without mutating
  gameplay state

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
