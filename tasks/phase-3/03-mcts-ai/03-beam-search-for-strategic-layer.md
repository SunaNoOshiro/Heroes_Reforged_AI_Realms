# Beam Search for Strategic Layer

Status: planned

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
Implement beam search for the adventure map (strategic) layer. Beam search explores the top-K most promising move sequences over a 1–3 day horizon, then picks the best.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- `AdventureState`, existing heuristic wants engine

Outputs:
- `src/ai/bots/mcts/beam-search.ts`
- `beamSearch(state: AdventureState, heroId: string, depth: number, beamWidth: number): Command[]`
- `depth`: 1, 2, or 3 days ahead
- `beamWidth`: 5 for "Lord", 10 for "Immortal"
- Each beam path evaluated with strategic heuristic (resource score + threat score + position score)

Owned Paths:
- `src/ai/bots/mcts/beam-search.ts`

Dependencies:
- phase-3.03-mcts-ai.01b-ucb1-search-loop-and-budgeted-runner
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking

Acceptance Criteria:
- Beam search with depth=2, width=5 completes in < 500ms per hero per turn
- Returns sequence of commands, not just a single action
- Deterministic: same state + seed → same plan

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
