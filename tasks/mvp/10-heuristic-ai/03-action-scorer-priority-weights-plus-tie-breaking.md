# Action Scorer — Priority Weights + Tie-Breaking

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Given the Want list, select the single best action for the AI hero and translate it into a Command. Handle tie-breaking with deterministic rules (never use `Math.random()` — use sorted comparison on hero IDs).

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 4 Per-Turn Budget Table, § 7 Decision Log
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `Want[]` from Task 2
- Current hero state (MP remaining, army strength)

Outputs:
- `src/ai/bots/action-scorer.ts`
- `selectAction(wants: Want[], hero: Hero, state: AdventureState): Command`
- If best want target is reachable this turn: move there + execute action
- If not reachable this turn: move as far along path as MP allows
- Tie-breaking: same score → prefer the want type that appears first in priority list above

Owned Paths:
- `src/ai/bots/action-scorer.ts`

Dependencies:
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc

Acceptance Criteria:
- Same input always produces same output (deterministic)
- Hero always makes progress toward its goal (never stands still unless no wants are actionable)
- `selectAction` never produces an invalid Command (use AI-side validation before dispatch)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
