# AI Performance Profiling

Module: [Polish (M7)](../04-polish.md)

Description:
Profile heuristic, strategic, and MCTS AI after those subsystems are
implemented. Keep improvements inside AI evaluation, worker scheduling,
search-budget handling, and benchmark harnesses.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- MVP heuristic AI module
- Phase-2 strategic AI module
- Phase-3 MCTS AI module and headless benchmark

Outputs:
- AI performance report appended to `docs/planning/perf-baseline.md`
- Fixes for the top AI bottleneck found by profiling
- Before/after decision-time and worker utilization numbers

Owned Paths (shared):
- `src/ai/` (no exclusive output — additive profiling-driven tweaks only; AI primitives are owned by `mvp.10-heuristic-ai.*`, `phase-2.02-strategic-ai.*`, and `phase-3.03-mcts-ai.*`)
- `src/rules/` (additive only; rule contracts owned by the MVP rules and tactical-combat tasks)
- `docs/planning/perf-baseline.md` (append-only profiling log shared with the other 05* profiling tasks)

Dependencies:
- module:mvp.10-heuristic-ai
- module:phase-2.02-strategic-ai
- module:phase-3.03-mcts-ai

Acceptance Criteria:
- Profiles strategic turn planning, tactical evaluation, MCTS search,
  and AI worker message boundaries with deterministic seeds
- Fix is additive to AI strategy/search contracts and must not rewrite
  contracts owned by the primary owner tasks for heuristic AI,
  strategic AI, or MCTS
- AI work stays off the main thread where the worker boundary already
  owns that behavior
- Difficulty presets keep their deterministic budget semantics after
  the optimization
- Before/after decision-time and worker utilization numbers are
  recorded in `docs/planning/perf-baseline.md`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
