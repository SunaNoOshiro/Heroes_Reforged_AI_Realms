# Unit Test Suite for Pathfinder Edge Cases

Module: [Map System (M1)](../03-map-system.md)

Description:
The pathfinder is called thousands of times per game — bugs cause incorrect movement which breaks determinism. Exhaustively test edge cases.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- All prior tasks in this module

Outputs:
- `src/engine/__tests__/pathfinder.test.ts`

Owned Paths:
- `src/engine/__tests__/pathfinder.test.ts`

Test cases to cover:
- Source == destination (zero-length path)
- Destination unreachable (fully surrounded by walls)
- Destination reachable but over MP budget (returns `null`)
- Path around a C-shaped obstacle (avoids dead end)
- ZoC blocking diagonal movement
- Map edge (starting at corner)
- Large open map (benchmark: 128×128, 10 random paths in < 50ms total)
- **Deliberate-tie scenario** (adventure map and tactical grid):
  construct a fixture with two equal-cost paths from src to dst. The
  pathfinder must select the path whose first divergent hex has the
  lower axial `(q, r)` value (per
  [`tasks/mvp/05-adventure-map/03-hero-movement.md`](../../mvp/05-adventure-map/03-hero-movement.md#L112)
  determinism contract). The fixture is committed under
  `src/engine/__tests__/fixtures/pathfinder-tiebreak.json`.
- **Tactical-grid case** (covers
  [`tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md`](../../mvp/09-tactical-combat/04a-tactical-pathfinder.md)):
  flying-vs-non-flying treatment of obstacle hexes; wall segments
  block non-flying.

Dependencies:
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc

Acceptance Criteria:
- All test cases pass
- Test file documents WHY each edge case is tested (comment per test group)
- No test uses `Math.random()` (deterministic fixtures only)

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
