# Performance Benchmark + Headless Eval

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
Benchmark MCTS performance and run the head-to-head evaluation to confirm Lord beats Grand Master ≥ 60% of the time.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 8 BotProvider
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- Tasks 1–5

Outputs:
- `src/ai/bots/__tests__/mcts-eval.test.ts` — the perf-benchmark half
  remains owned by this task; the evaluation half consumes the shared
  tournament harness owned by
  `phase-2.10-ai-tournament-harness.01-ai-tournament-harness`. The
  test imports `tournament(...)` and supplies
  `{aiA: lord, aiB: grand_master, gamesPerMatch: 50}` instead of
  authoring its own bracket loop.
- Benchmark: 100 MCTS (500-node) tactical searches, report avg time
- Evaluation: 50 games Lord vs Grand Master (random seeds), result
  emitted as a
  [`TournamentResult`](../../../content-schema/schemas/tournament-result.schema.json).

Owned Paths:
- `src/ai/bots/__tests__/mcts-eval.test.ts`

Dependencies:
- phase-3.03-mcts-ai.02-heuristic-evaluator-no-random-rollouts
- phase-3.03-mcts-ai.03-beam-search-for-strategic-layer
- phase-3.03-mcts-ai.04-wasm-hot-path-compilation-assemblyscript
- phase-3.03-mcts-ai.05-difficulty-levels-lord-and-immortal
- phase-2.10-ai-tournament-harness.01-ai-tournament-harness

Acceptance Criteria:
- MCTS search: < 50ms average per tactical move (with WASM)
- Lord wins ≥ 60% of 50 games vs Grand Master, verified
  continuously by the bench harness owned by
  [`tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md`](../../mvp/10-heuristic-ai/11-ai-bench-harness.md)
  using the `BotProvider` interface (provider id `"mcts"`
  added by this task / Task 5)
- Test report: win rate, avg game length, any timeouts

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
