# Town Building Planner

Status: planned

Module: [Strategic AI Depth (M3)](../02-strategic-ai.md)

Description:
For each AI town, plan the optimal build order based on faction, current day, and resource availability. Output a prioritized queue of buildings to construct.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Town state, faction content pack, resource planner (Task 1)

Outputs:
- `src/ai/bots/building-planner.ts`
- `planBuildOrder(town, resources, faction, day): BuildingId[]`
- Priority rules (expressed as ordered goals, not hard-coded building
IDs — the planner reads the faction's building tree and tags from the
pack):
  1. Build the tagged `defense.tier1` building first (unlocks defensive
     structures)
  2. Build the `income.chain` to tier 2 by week 2
  3. Build the tier-7 dwelling as soon as its requirements are met
  4. Reach `magic.tier3` (mage guild level 3) by week 3

Owned Paths:
- `src/ai/bots/building-planner.ts`

Dependencies:
- phase-2.02-strategic-ai.01-resource-deficit-detector
- mvp.04-faction-emberwild.02-emberwild-town-building-tree

Acceptance Criteria:
- AI always builds the first defensive tier before any military
  dwelling
- AI builds the income chain before maxing out dwellings
- Build order is deterministic for the same inputs
- Planner never references a faction-specific building id directly —
  only building tags declared in the pack

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
