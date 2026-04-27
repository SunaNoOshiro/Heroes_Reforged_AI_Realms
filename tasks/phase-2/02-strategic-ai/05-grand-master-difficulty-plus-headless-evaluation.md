# Grand Master Difficulty + Headless Evaluation

Status: planned

Module: [Strategic AI Depth (M3)](../02-strategic-ai.md)

Description:
Create "Grand Master" difficulty: full lookahead, no randomness, uses all strategic subsystems. Then validate it by running 100 headless Grand Master vs Knight games and measuring win rate.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- All AI modules

Outputs:
- `src/ai/bots/difficulty.ts` (extend from `10-heuristic-ai.md` Task 5)
- `DifficultyLevel`: add `"grand_master"`
- `src/ai/bots/__tests__/headless-eval.test.ts`
- Script: 100 games, Grand Master (player 1) vs Knight (player 2), random seeds
- Report: win rate, average game length, most common win condition

Owned Paths:
- `src/ai/bots/__tests__/headless-eval.test.ts`

Owned Paths (shared):
- `src/ai/bots/difficulty.ts`

Dependencies:
- phase-2.02-strategic-ai.01-resource-deficit-detector
- phase-2.02-strategic-ai.02-town-building-planner
- phase-2.02-strategic-ai.03-multi-hero-role-assignment
- phase-2.02-strategic-ai.04-long-horizon-path-planning-2-day-lookahead

Acceptance Criteria:
- Grand Master wins ≥ 70% of 100 headless games vs Knight
- Average game length < 60 turns (games don't stall)
- Test completes in < 60 seconds (headless, no rendering)
- Extends the existing difficulty module without breaking Pawn/Knight
  assertions from `mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight`
- Shared path work is additive only: add the Grand Master entry without
  rewriting the primary difficulty contract owned by
  `mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
