# Upgrade Army Stack Command

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement creature upgrade reducers for single-stack and upgrade-all
flows. Upgrade rules come from creature records, town or hill-fort
capabilities, and ruleset cost tables; engine code must not branch on
first-party faction names.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/13-hill-fort/interactions.md`
- `docs/architecture/wiki/screens/24-town-screen/interactions.md`

Inputs:
- Creature upgrade paths from pack-loaded unit records
- Strategic resources and army containers from `AdventureState`
- `UPGRADE_ARMY_STACK` and `UPGRADE_ALL_ELIGIBLE_STACKS` payloads from
  `command.schema.json`

Outputs:
- `src/engine/commands/upgrade-army-stack.ts`
- `UPGRADE_ARMY_STACK` reducer and semantic validator
- `UPGRADE_ALL_ELIGIBLE_STACKS` reducer using stable slot order
- Tests for unaffordable upgrades, missing upgrade path, and
  deterministic upgrade-all ordering

Owned Paths:
- `src/engine/commands/upgrade-army-stack.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.04-faction-emberwild.01-emberwild-units-7-units-plus-upgrades
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `UPGRADE_ARMY_STACK` validates army ownership, stack ID, target unit
  compatibility, quantity, location capability, and resource cost
- `UPGRADE_ALL_ELIGIBLE_STACKS` evaluates eligible stacks in stable
  slot order and stops only on validator-approved affordability rules
- Upgraded stacks preserve count and replace creature ID through content
  IDs, not asset paths
- Resource deductions are integer-only and fail atomically when
  unaffordable
- Screen 13 and town upgrade affordances can dispatch live commands
  once this task is done

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
