# Map Object Visit And Battle Initiation Commands

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement deterministic reducers for adventure-map object visits and
battle initiation. UI dialogs may decide which button the player
pressed, but accepted object interactions must enter the command log as
stable commands before any reward, guard battle, or pending encounter
state changes.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- `docs/architecture/wiki/screens/09-map-object-dialog/interactions.md`
- `docs/architecture/wiki/screens/20-mine-visit-dialog/interactions.md`
- `docs/architecture/wiki/screens/40-pre-battle-dialog/interactions.md`

Inputs:
- `AdventureState` map object, hero, mine, and pending battle state
- Map object and reward records from content-runtime registries
- `VISIT_MAP_OBJECT` and `INITIATE_BATTLE` payloads from
  `content-schema/schemas/command.schema.json`

Outputs:
- `src/engine/commands/map-object-commands.ts`
- `VISIT_MAP_OBJECT` reducer and semantic validator
- `INITIATE_BATTLE` reducer and semantic validator
- Pending-battle creation path consumed by `AUTO_RESOLVE_BATTLE` in Task 6

Owned Paths:
- `src/engine/commands/map-object-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.03-hero-movement
- mvp.05-adventure-map.04-resource-mine-capture-plus-daily-income
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `VISIT_MAP_OBJECT` validates hero position, object existence, visit
  state, ownership, one-shot flags, and content-defined requirements
- Rewards, visit flags, teleport effects, and follow-up dialogs are
  applied through stable IDs and deterministic events
- `INITIATE_BATTLE` validates attacker, defender or neutral stack,
  terrain context, and encounter eligibility before creating pending
  battle state
- Guard battles and hero-vs-hero encounters use the same pending-battle
  shape consumed by `AUTO_RESOLVE_BATTLE`
- Screens 09, 20, and 40 dispatch these commands through the shared
  command hook rather than mutating adventure state locally

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
