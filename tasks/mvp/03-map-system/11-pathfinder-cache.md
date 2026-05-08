# Pathfinder cache (per-turn, version-keyed)

Module: [Map System (M1)](../03-map-system.md)

Description:
Add a per-turn pathfinder cache keyed by
`(mapVersion, srcHex, mpBudget, zocVersion)`. The cache is a
plain `Map<key, Result>`; lookups are O(1). Invalidation is
**explicit, not time-based** — version fields on `GameState`
drive it.

Determinism contract: `findPath(...)` and `reachable(...)` are
pure, so cache hits return the same value as cache misses. The
cache is therefore safe to ship in the engine layer rather than
only in AI code, and the AI threat-map BFS shares this single
cache rather than introducing a parallel one (see
`mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients`).

Invalidation rules:

- Any command that mutates terrain (terraform spell, bridge
  built) bumps `state.mapVersion`.
- Any hero arrival or departure on a tile bumps
  `state.zocVersion`.
- The cache is **flushed at every End-Day turn boundary** as a
  belt-and-braces guard.

The version-bump invariants are owned by
`mvp.01-engine-core.06-command-dispatcher`; this task owns the
cache module that consumes them.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md`](./04-a-pathfinder-with-terrain-cost-plus-zoc.md)
- [`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../01-engine-core/06-command-dispatcher.md)

Inputs:
- Pathfinder API (`findPath`, `reachable`) from Task 4.
- `state.mapVersion` and `state.zocVersion` (additive fields on
  `GameState`, default `0`).

Outputs:
- `src/engine/pathfinder/cache.ts`
- API: `getOrCompute(key, fn): Result` — sole public entry; the
  internal `Map` is not exported.
- Cache flush on End-Day turn boundary wired into the turn
  reducer.

Owned Paths:
- `src/engine/pathfinder/cache.ts`

Dependencies:
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- Cache hits and misses return the same value on a fixture map
  (verified by a unit test).
- A command that bumps `mapVersion` invalidates entries that
  observed the previous version on the next lookup.
- A command that bumps `zocVersion` invalidates entries that
  observed the previous version on the next lookup.
- End-Day reducer flushes the cache; subsequent lookups recompute.
- Bench-harness Scenario C (AI bot match) shows AI turn ms with
  the cache enabled is at least **30 % faster** than with the
  cache disabled, on a 200×200 fixture.
- No floats, no `Math.random()`, no wall-clock reads — passes the
  determinism lint.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
