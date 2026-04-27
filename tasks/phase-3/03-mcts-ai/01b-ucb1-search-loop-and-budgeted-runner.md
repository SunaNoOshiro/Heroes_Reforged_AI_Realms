# UCB1 Search Loop + Budgeted Runner

Status: planned

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
Build the generic MCTS search loop on top of the tree model from Task
1a. The runner accepts an evaluator callback so the search logic stays
independent of any specific scoring implementation.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- Search tree utilities from Task 1a
- evaluator callback signature `(state, forPlayerId) => score`

Outputs:
- `src/ai/bots/mcts/mcts-core.ts`
- `runMCTS(state: BattleState, budget: number, eval: Evaluator): Action`
- UCB1 selection and backpropagation utilities
- budget presets for "Lord" and "Immortal"

Owned Paths:
- `src/ai/bots/mcts/mcts-core.ts`

Dependencies:
- phase-3.03-mcts-ai.01a-mcts-tree-state-and-root-expansion

Acceptance Criteria:
- Given the same state, evaluator, and budget, `runMCTS` always returns
  the same action
- UCB1 formula matches the reference implementation
- Backpropagation updates visits and totalValue consistently across the
  selected path
- 500-node search completes in < 100ms before any WASM optimization

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
