# Engine Performance Profiling

Module: [Polish (M7)](../04-polish.md)

Description:
Profile deterministic engine hot paths after the MVP engine, map,
adventure, and tactical combat closures are merged. Keep fixes local to
state reducers, command dispatch, rules evaluation, and replay/hash
paths.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- MVP engine, map, adventure-loop, and tactical-combat modules
- Existing replay/fuzz and command-dispatch tests

Outputs:
- Engine performance report appended to `docs/planning/perf-baseline.md`
- Fixes for the top deterministic engine bottleneck found by profiling
- Before/after command-throughput and replay/hash timings in the report

Owned Paths (shared):
- `src/engine/` (no exclusive output — additive profiling-driven tweaks only; primary contracts are owned by the MVP engine-core, map, adventure, and tactical-combat tasks)
- `src/rules/` (additive only; rule contracts owned by `mvp.04-faction-emberwild.04-baseline-ruleset` and the tactical-combat formula tasks)
- `docs/planning/perf-baseline.md` (append-only profiling log shared with the other 05* profiling tasks)

Dependencies:
- module:mvp.01-engine-core
- module:mvp.03-map-system
- module:mvp.05-adventure-map
- module:mvp.09-tactical-combat

Acceptance Criteria:
- Profiles command dispatch, replay, state hashing, pathfinding, and
  combat reducer hot paths with representative saved scenarios
- Fix is additive to the existing deterministic contracts and must not
  rewrite reducer, rules, or replay contracts owned by the primary owner
  tasks for those modules
- No `Math.random()`, wall-clock timing, unordered iteration, or
  floating-point gameplay math is introduced on deterministic paths
- Before/after timings are recorded in `docs/planning/perf-baseline.md`
  with the scenario seed and content hash used for the run
- Command dispatch and replay behavior remain byte-identical before and
  after the optimization

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
