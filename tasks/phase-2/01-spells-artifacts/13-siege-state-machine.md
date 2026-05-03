# Siege State Machine

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Model siege-specific battle state without hard-coding a single town or
faction. Wall segments, gate state, moat penalties, towers, and defender
spell restrictions are declared through content and ruleset records,
then applied by deterministic battle reducers.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/43-siege-combat/interactions.md`

Inputs:
- `BattleState` from `mvp.09-tactical-combat`
- Town fortification and siege constants from the active ruleset pack
- Wall, gate, moat, and tower records from content-runtime registries

Outputs:
- `src/engine/siege-state.ts`
- Siege extension on `BattleState` for wall HP, gate state, moat cells,
  tower cooldowns, and defender spell-only-mode state
- `BATTLE_RESOLVED` siege variant integration for breached or intact
  town outcomes

Owned Paths:
- `src/engine/siege-state.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.08-battle-end-condition
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs

Acceptance Criteria:
- All siege values come from `ruleset.siege.*` (wall HP, gate HP, moat
  damage / passability, tower damage / shots-per-round, drawbridge
  default rounds). Schema:
  [`ruleset.schema.json` §`siege`](../../../content-schema/schemas/ruleset.schema.json);
  baseline values:
  [`baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json).
  Values land as **placeholders** pending a balance-pass task.
- Siege battle initialization creates wall, gate, moat, and tower state
  from content IDs and ruleset values
- Moat damage and passability rules apply when stacks enter moat cells
  through normal movement commands
- Tower auto-fire uses deterministic initiative/round timing and emits
  battle events for animation without using wall-clock time
- Defender hero spell-only-mode is enforced while siege constraints
  require it, then lifted by declared breach conditions
- `BATTLE_RESOLVED` records siege outcome data needed by town ownership,
  repair, and replay flows

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
