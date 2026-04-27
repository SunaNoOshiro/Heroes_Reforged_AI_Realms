# Unit Test Suite for Pathfinder Edge Cases

Status: planned

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
