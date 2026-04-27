# Heuristic Evaluator (No Random Rollouts)

Status: planned

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
The MCTS evaluator scores a `BattleState` without simulating to game end. Uses the existing heuristic evaluator from `10-heuristic-ai.md` Task 4 plus additional terminal state recognition.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- `BattleState`, existing heuristic evaluator

Outputs:
- `src/ai/bots/mcts/evaluator.ts`
- `evaluate(state: BattleState, forPlayerId: number): number` → score in [-1, 1]
- Terminal detection: if battle is already won/lost, return ±1
- Non-terminal: normalize heuristic score to [-1, 1] range

Owned Paths:
- `src/ai/bots/mcts/evaluator.ts`

Dependencies:
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring

Acceptance Criteria:
- Terminal win state returns 1.0
- Terminal loss state returns -1.0
- Evaluation is called < 500 times per MCTS run (node budget controls this)
- Evaluation produces same result for same input (deterministic)

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
