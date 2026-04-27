# Tactics Phase Engine

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the pre-battle tactics phase as deterministic battle-state
commands. Stack placement is allowed only inside the deployment zone
granted by hero skills and ruleset values; starting battle freezes
placement and hands control to the initiative queue.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/45-tactics-phase/interactions.md`

Inputs:
- `BattleState` from Task 1
- Initiative queue from Task 2
- Hero tactics skill data from phase-2 skill systems when available
- `PLACE_TACTICS_STACK` and `START_BATTLE_AFTER_TACTICS` payloads from
  `command.schema.json`

Outputs:
- `src/engine/commands/tactics-phase-commands.ts`
- `PLACE_TACTICS_STACK` reducer and validator
- `START_BATTLE_AFTER_TACTICS` reducer and validator
- Deployment-zone helper that uses integer hex coordinates and stable
  side/slot ordering

Owned Paths:
- `src/engine/commands/tactics-phase-commands.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `PLACE_TACTICS_STACK` validates battle phase, stack ownership, legal
  deployment zone, passability, and no overlapping stacks
- Placement changes are deterministic and update only battle-state
  coordinates, never presentation-only drag data
- `START_BATTLE_AFTER_TACTICS` rejects unfinished or invalid deployment
  and otherwise transitions to the first initiative turn
- Replaying the same tactics command log produces byte-identical
  `BattleState`
- Screen 45 dispatches live commands once this task is done

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
