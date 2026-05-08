# Combine Artifacts Command

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Promote combination artifact creation from passive detection into an
explicit deterministic command. Detection still reports eligible sets;
`COMBINE_ARTIFACTS` consumes the selected components, creates the
result artifact, and places or equips it through paper-doll rules.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/52-artifact-combine-dialog/interactions.md`

Inputs:
- Combo detection from Task 6
- Artifact paper-doll and backpack rules from Task 5
- `COMBINE_ARTIFACTS` payload from `command.schema.json`

Outputs:
- `src/engine/commands/combine-artifacts.ts`
- `COMBINE_ARTIFACTS` reducer and semantic validator
- Tests for missing component, duplicate component, blocked result slot,
  and replay-stable result artifact ID

Owned Paths:
- `src/engine/commands/combine-artifacts.ts`

Dependencies:
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system
- phase-2.01-spells-artifacts.06-combination-artifacts-detect-set-apply-bonus
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `COMBINE_ARTIFACTS` validates hero ownership, component ownership,
  unique component IDs, recipe eligibility, and result destination
- Components are removed exactly once and cannot remain equipped after
  the result is created
- Result artifact ID is stable under replay and never derives from
  localized labels or asset paths
- Combo bonuses are recalculated through the existing computed-stats
  path after the reducer succeeds
- Screen 52 dispatches a live command once this task is done

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
