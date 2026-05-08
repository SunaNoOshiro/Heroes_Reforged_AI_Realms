# Threat-Map BFS (Strategic Danger Gradients)

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
For each enemy hero on the adventure map, compute how many days it would take them to reach each tile. This creates a "threat gradient" — high threat near fast, strong enemy heroes; low threat far away or behind obstacles. The AI uses this map to decide whether to advance, defend, or flee.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `AdventureState` (adventure map)
- Enemy hero positions, army strengths, movement speeds
- `Pathfinder` (`03-map-system.md` Task 4)

Outputs:
- `src/ai/bots/threat-map.ts`
- `buildThreatMap(state: AdventureState, fromPlayerId: number): ThreatMap`
- `ThreatMap`: `{ getDanger(q, r): number }` where danger = 0 (no threat) to N (N enemy heroes can reach in 1–N days)
- Danger = 0 on own towns (garrison counts as defense, not threat)
- Enemy army strength weighted into danger value: a 100-Angel hero is more dangerous than a 10-Pikeman hero

Owned Paths:
- `src/ai/bots/threat-map.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- Tile adjacent to strong enemy hero has high danger value
- Tile behind mountains (impassable) is unreachable (danger = ∞)
- `buildThreatMap` completes in < 50ms on a 128×128 map
- Own heroes' positions are excluded from threat calculation
- BFS uses the shared pathfinder cache from
  `mvp.03-map-system.11-pathfinder-cache` rather than introducing
  a parallel cache. Cache hits skip pathfinder recomputation
  without changing returned values.
- Frontier nodes are drawn from the AI search-node pool owned by
  `mvp.00-perf.05-object-pools`. No per-frontier-step allocation
  measured by bench harness Scenario A.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
