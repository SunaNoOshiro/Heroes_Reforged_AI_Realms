# Resource Deficit Detector

Status: planned

Module: [Strategic AI Depth (M3)](../02-strategic-ai.md)

Description:
Analyze the AI's resource income vs upcoming build plans. Identify which resources are bottlenecks and adjust mine-capture priorities accordingly.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `AdventureState`, planned builds, current stockpile, daily income

Outputs:
- `src/ai/bots/resource-planner.ts`
- `getResourceDeficits(state, playerId, buildPlan): ResourceDeficit[]`
- `ResourceDeficit`: `{ resource, daysUntilAcquired, daysNeeded, urgency }`
- Adjusts `CAPTURE_MINE` want scores based on deficit urgency

Owned Paths:
- `src/ai/bots/resource-planner.ts`

Dependencies:
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization

Acceptance Criteria:
- AI with 0 wood and a Sawmill nearby scores `CAPTURE_MINE(sawmill)` very highly
- AI with surplus gold and no gold mines nearby does not chase distant gold mines
- Deficit calculation accounts for daily income, not just stockpile

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
