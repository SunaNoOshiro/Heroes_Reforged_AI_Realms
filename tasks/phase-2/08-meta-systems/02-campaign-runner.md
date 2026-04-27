# Campaign Runner

Status: planned

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement campaign scenario-chain execution. The runner starts missions,
applies selected bonuses, persists campaign progress, and carries over
only the hero/artifact/resource fields allowed by the campaign record.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- `docs/architecture/wiki/screens/04-campaign-narrative/interactions.md`

Inputs:
- Campaign graph registry from Task 1
- Scenario loading and save format
- Hero carry-over policy from campaign schema

Outputs:
- `src/persistence/campaign-progress.ts`
- `src/engine/campaign-runner.ts`
- `START_CAMPAIGN_MISSION` command bridge or app-level launcher

Owned Paths:
- `src/persistence/campaign-progress.ts`
- `src/engine/campaign-runner.ts`

Dependencies:
- phase-2.08-meta-systems.01-campaign-graph-schema
- mvp.08-persistence.02-log-only-save-format

Acceptance Criteria:
- Starting a mission pins scenario ID, campaign ID, selected bonus, seed,
  and content hashes
- Carry-over applies only fields declared by content
- Completed missions unlock the next campaign node deterministically
- Screen 04 never launches scenarios by bypassing the runner

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
