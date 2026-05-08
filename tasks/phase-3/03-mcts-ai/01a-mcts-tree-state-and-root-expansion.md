# MCTS Tree State + Root Expansion

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
Define the deterministic tree node model and root expansion logic for
the tactical-combat MCTS path. This task stops before UCB1 search and
backpropagation so the tree shape can be validated in isolation.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- `BattleState`
- legal action generator from the tactical-combat layer

Outputs:
- `src/ai/bots/mcts/tree.ts`
- `createRoot(state: BattleState): SearchNode`
- `expandNode(node): SearchNode[]`
- tree node shape: `{ state, action, children, visits, totalValue }`

Owned Paths:
- `src/ai/bots/mcts/tree.ts`

Dependencies:
- module:mvp.09-tactical-combat

Acceptance Criteria:
- Root expansion enumerates every legal action exactly once
- Child nodes preserve deterministic action ordering
- Search-node state is serializable for debug snapshots
- No evaluation policy is hard-coded into the tree model

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
