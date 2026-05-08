# Fire Catapult Command

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement catapult fire as a deterministic siege command. Target
selection, hit chance, wall damage, gate damage, and miss scatter all
come from ruleset/content records and named RNG streams.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/43-siege-combat/interactions.md`

Inputs:
- Siege state from Task 13
- Catapult and fortification constants from ruleset/content records
- `FIRE_CATAPULT` payload from `command.schema.json`

Outputs:
- `src/engine/commands/fire-catapult.ts`
- `FIRE_CATAPULT` reducer and semantic validator
- Deterministic damage-roll helper using named RNG streams

Owned Paths:
- `src/engine/commands/fire-catapult.ts`

Dependencies:
- phase-2.01-spells-artifacts.13-siege-state-machine
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `FIRE_CATAPULT` validates battle phase, acting side, target wall/gate
  ID, catapult availability, and per-round firing rules
- Damage and miss outcomes are deterministic for the same battle seed
  and command log
- Destroyed wall and gate segments update passability through the siege
  state machine
- Invalid targets return `ValidationError` and do not advance the
  catapult RNG stream
- Screen 43 dispatches the command through the shared command hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
