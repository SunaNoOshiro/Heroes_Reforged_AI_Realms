# Wants Engine — Strategic Action Prioritization

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
The AI's decision-making center. Given current game state and threat map, generates a prioritized list of "wants" (desired actions) for each AI hero.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 1 Input View
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Projected `AdventureView` from
  [`07-ai-player-view-projection.md`](./07-ai-player-view-projection.md)
  (the wants engine reads the view, not raw `AdventureState`;
  `SCOUT_FOG` operates over fog-stripped tiles by construction)
- `ThreatMap` (Task 1)

Outputs:
- `src/ai/bots/wants-engine.ts`
- `generateWants(state, threat, heroId): Want[]`
- `Want` types (in rough priority order):
  - `RECRUIT_UNITS`: towns with available units and resources
  - `BUILD_UPGRADE`: next best building to construct
  - `CAPTURE_MINE`: nearest unowned mine weighted by resource deficit
  - `SCOUT_FOG`: explore hidden areas near neutral zones
  - `ATTACK_HERO`: if AI hero can win with > 60% probability
  - `DEFEND_TOWN`: if own town is threatened (danger > threshold)
  - `PICK_RESOURCE`: loose resource objects on map
  - `PATROL`: idle wants when no other goal is actionable

Each Want has a `score: number` and `target: HexCoord | string`.

Owned Paths:
- `src/ai/bots/wants-engine.ts`

Dependencies:
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.05-adventure-map.03-hero-movement
- mvp.05-adventure-map.04-resource-mine-capture-plus-daily-income
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.05-adventure-map.06-auto-resolve-combat
- mvp.05-adventure-map.07-victory-defeat-conditions

Acceptance Criteria:
- AI with low gold and a Gold Mine nearby always scores `CAPTURE_MINE` highly
- AI hero next to a weak enemy always scores `ATTACK_HERO` (when it can win)
- AI with endangered town scores `DEFEND_TOWN` above scouting
- Zero division or NaN in scores is a bug — assert clean scores

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
