# Long-Horizon Path Planning (2-Day Lookahead)

Module: [Strategic AI Depth (M3)](../02-strategic-ai.md)

Description:
Instead of greedy single-turn planning, simulate the next 2 days to find the sequence of moves that maximizes total value. This prevents the AI from getting stuck in local optima (e.g., going for a nearby mine that a faster enemy will steal).

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Current `AdventureState` (AI's view)
- Wants engine output

Outputs:
- `src/ai/bots/lookahead.ts`
- `planNextTwoTurns(state, heroId, wants): Command[]`
- Simple minimax over 2 AI turns with heuristic evaluation (not full game tree search)
- Prune: only expand top-3 wants per turn

Owned Paths:
- `src/ai/bots/lookahead.ts`

Dependencies:
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking

Acceptance Criteria:
- AI does not move toward a mine that an enemy will reach first (avoids wasted MP)
- Lookahead completes in < 200ms per hero
- Planning output is deterministic for same seed

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
