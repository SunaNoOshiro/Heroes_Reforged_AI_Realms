# Retreat And Surrender Commands

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement pre-battle retreat and in-battle surrender as deterministic
commands. These flows update battle outcome, hero status, army loss,
gold cost, and return-to-map state without UI-only shortcuts.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/40-pre-battle-dialog/interactions.md`
- `docs/architecture/wiki/screens/41-surrender-cost-dialog/interactions.md`

Inputs:
- Battle state from Tasks 1 and 8
- Adventure hero/army state from `mvp.05-adventure-map`
- Ruleset constants for surrender cost and retreat eligibility

Outputs:
- `src/engine/commands/battle-exit-commands.ts`
- `RETREAT_BEFORE_BATTLE` and `ACCEPT_BATTLE_SURRENDER` reducers
- Tests for retreat, surrender, and invalid battle phase

Owned Paths:
- `src/engine/commands/battle-exit-commands.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.08-battle-end-condition
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- Retreat is allowed only before tactical battle starts and records a
  deterministic retreat outcome
- Surrender validates gold cost, battle participant, and phase
- Surrender applies declared army-loss and hero-state rules through
  deterministic reducers
- Screens 40 and 41 dispatch these commands rather than inventing UI
  local battle exits

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
