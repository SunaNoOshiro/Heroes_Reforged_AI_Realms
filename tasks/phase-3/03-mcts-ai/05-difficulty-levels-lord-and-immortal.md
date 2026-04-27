# Difficulty Levels — Lord and Immortal

Status: planned

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
Add "Lord" and "Immortal" difficulty levels to the existing difficulty system. Both use MCTS. Immortal gets a larger node budget and wider beam search.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- Tasks 1–4, `10-heuristic-ai.md` Task 5

Outputs:
- Update `src/ai/bots/difficulty.ts`
- `DifficultyLevel`: add `"lord" | "immortal"`
- Lord: MCTS 500 nodes tactical, beam depth=2 width=5 strategic
- Immortal: MCTS 2000 nodes tactical, beam depth=3 width=10 strategic, no randomness

Owned Paths (shared):
- `src/ai/bots/difficulty.ts` (no exclusive output — this task additively extends the difficulty registry owned by `mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight`)

Dependencies:
- phase-3.03-mcts-ai.02-heuristic-evaluator-no-random-rollouts
- phase-3.03-mcts-ai.03-beam-search-for-strategic-layer
- phase-3.03-mcts-ai.04-wasm-hot-path-compilation-assemblyscript

Acceptance Criteria:
- Lord AI uses MCTS in tactical combat and beam search strategically
- Immortal AI never makes suboptimal moves (verified: always attacks when it can win)
- Both difficulties are deterministic (same seed → same game)
- Extends the existing difficulty module without breaking Pawn, Knight,
  or Grand Master difficulty assertions
- Shared path work is additive only: add Lord and Immortal entries
  without rewriting the primary difficulty contract owned by
  `mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight`

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
