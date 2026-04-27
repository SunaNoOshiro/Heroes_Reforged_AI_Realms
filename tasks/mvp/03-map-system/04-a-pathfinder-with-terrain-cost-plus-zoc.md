# A* Pathfinder with Terrain Cost + ZoC

Status: planned

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

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
