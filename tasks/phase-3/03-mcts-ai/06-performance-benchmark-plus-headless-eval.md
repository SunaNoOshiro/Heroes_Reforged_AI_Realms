# Performance Benchmark + Headless Eval

Status: planned

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
Benchmark MCTS performance and run the head-to-head evaluation to confirm Lord beats Grand Master ≥ 60% of the time.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- Tasks 1–5

Outputs:
- `src/ai/bots/__tests__/mcts-eval.test.ts`
- Benchmark: 100 MCTS (500-node) tactical searches, report avg time
- Evaluation: 50 games Lord vs Grand Master (random seeds)

Owned Paths:
- `src/ai/bots/__tests__/mcts-eval.test.ts`

Dependencies:
- phase-3.03-mcts-ai.02-heuristic-evaluator-no-random-rollouts
- phase-3.03-mcts-ai.03-beam-search-for-strategic-layer
- phase-3.03-mcts-ai.04-wasm-hot-path-compilation-assemblyscript
- phase-3.03-mcts-ai.05-difficulty-levels-lord-and-immortal

Acceptance Criteria:
- MCTS search: < 50ms average per tactical move (with WASM)
- Lord wins ≥ 60% of 50 games vs Grand Master
- Test report: win rate, avg game length, any timeouts

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
