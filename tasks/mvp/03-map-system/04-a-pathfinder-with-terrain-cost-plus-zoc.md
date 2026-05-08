# A* Pathfinder with Terrain Cost + ZoC

Module: [Map System (M1)](../03-map-system.md)

Description:
Implement A* for hero movement on the adventure map. Two modes:
1. **Reachable tiles** — given MP budget, return all tiles reachable this turn
2. **Path to target** — find lowest-cost path from source to destination

Zone of Control (ZoC): enemy hero presence on a tile blocks diagonal movement around that tile.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `MapStorage` (Task 3)
- `TerrainRegistry` (Task 2)
- Source `HexCoord`, target `HexCoord`, MP budget

Outputs:
- `src/engine/pathfinder.ts`
- `findPath(map, terrain, src, dst, mpBudget, zocTiles): HexCoord[] | null`
- `reachable(map, terrain, src, mpBudget, zocTiles): Map<HexCoord, number>` (coord → cost)

Owned Paths:
- `src/engine/pathfinder.ts`

Dependencies:
- mvp.03-map-system.02-tile-type-registry
- mvp.03-map-system.03-layered-tile-storage

Acceptance Criteria:
- Finds correct shortest path on a 20×20 mixed-terrain map vs hand-calculated reference
- Returns `null` when destination is unreachable (obstacles or out of MP budget)
- ZoC test: hero cannot pass diagonally adjacent to an enemy without entering enemy hex
- Performance: path on a 128×128 map completes in < 5ms
- All floating-point avoided (use integer costs ×100)
- `findPath` and `reachable` are pure functions of
  `(map, terrain, src, dst|mpBudget, zocTiles)`. This purity is
  the precondition for the per-turn cache shipped by
  `mvp.03-map-system.11-pathfinder-cache`.

## Optional cache

Memoization of pure pathfinder results is determinism-safe and
ships in `mvp.03-map-system.11-pathfinder-cache`. The cache key
is `(state.mapVersion, srcHex, mpBudget, state.zocVersion)`.
Invalidation is **explicit, not time-based**:

- `state.mapVersion` is bumped by any command that mutates terrain
  (terraform spell, bridge built); pinned in
  `mvp.01-engine-core.06-command-dispatcher`.
- `state.zocVersion` is bumped on hero arrival/departure on a
  tile; pinned in the same dispatcher contract.
- The cache is flushed at every End-Day turn boundary.

The pathfinder API itself does not change. Callers that want
caching go through `cache.getOrCompute(key, () => findPath(...))`;
direct `findPath(...)` calls stay valid for tests and one-shot
queries.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
