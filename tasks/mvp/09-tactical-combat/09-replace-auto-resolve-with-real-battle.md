# Replace Auto-Resolve With Real Battle

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Wire tactical combat into the adventure-map encounter flow using
existing schema-backed commands. When two heroes meet, a real battle is
triggered instead of auto-resolve. This task must not introduce
non-canonical command kinds.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/38-combat-screen/data-contracts.md`

Inputs:
- `INITIATE_BATTLE` reducer from
  `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`
- Battle state initialization from tactical-combat tasks 1-8
- Combat screen/HUD bindings from
  `mvp.09-tactical-combat.11-combat-hud-overlay`

Outputs:
- `src/engine/commands/battle-transition.ts`
- Shared update to the adventure movement collision path so enemy
  encounters dispatch `INITIATE_BATTLE`
- Battle completion handler consuming canonical `BATTLE_RESOLVED`
  command output

Owned Paths:
- `src/engine/commands/battle-transition.ts`

Owned Paths (shared):
- `src/engine/commands/map-object-commands.ts`
- `src/engine/adventure-movement.ts`

Dependencies:
- mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.09-tactical-combat.03-damage-formula
- mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit
- mvp.09-tactical-combat.05-retaliation-once-per-round-nullification
- mvp.09-tactical-combat.06-morale-and-luck-rolls
- mvp.09-tactical-combat.07-unit-abilities-flying-double-strike-breath-no-retaliation
- mvp.09-tactical-combat.08-battle-end-condition

Acceptance Criteria:
- No `INIT_BATTLE` or `BATTLE_RESULT` command kind is introduced
- Enemy encounter uses `INITIATE_BATTLE`
- Moving hero onto enemy hero hex transitions to battle screen (not auto-resolve)
- After battle, winner continues on map; loser hero is removed (or retreats to nearest town)
- Game correctly returns to adventure map after battle ends
- Battle completion mutates adventure state only through deterministic
  reducer code
- Returning from battle restores adventure phase and updates armies using
  stable IDs
- Shared edits are additive only: extend the map-object command path
  owned by `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`
  and the movement collision behavior owned by
  `mvp.05-adventure-map.03-hero-movement`; do not rewrite their primary
  contracts
- Replay of movement -> battle -> resolution is byte-identical

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
