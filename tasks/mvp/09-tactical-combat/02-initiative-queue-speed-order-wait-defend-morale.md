# Initiative Queue — Speed Order, Wait, Defend, Morale

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Manage the combat round's initiative queue. Each round: build queue from all living stacks by speed. A stack can WAIT (move to end of queue) or DEFEND (skip action, gain defense bonus). Morale-triggered extra moves insert a stack again later in the queue.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleState` (Task 1)

Outputs:
- `src/engine/battle-queue.ts`
- `buildRoundQueue(state: BattleState): string[]` — stack ids in initiative order
- `nextTurn(state: BattleState): BattleState` — advance to next stack in queue
- Commands to add to dispatcher:
  - `BATTLE_WAIT`: moves active stack to end of current round's queue
  - `BATTLE_DEFEND`: marks stack as defending (+defense bonus until next turn)

Owned Paths:
- `src/engine/battle-queue.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- Fastest stack acts first; slowest acts last
- WAIT correctly repositions stack to after the last non-waited stack
- DEFEND bonus is removed at the start of the stack's next action
- Morale-triggered extra move inserts stack immediately after current position in queue

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
