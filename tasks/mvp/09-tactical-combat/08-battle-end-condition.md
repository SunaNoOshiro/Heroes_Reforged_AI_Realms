# Battle End Condition

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
The battle ends when one side has no living stacks, or the attacker hero flees. Survivors return to their hero; losses update the hero army.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleState`

Outputs:
- `src/engine/battle-end.ts`
- `checkBattleEnd(state: BattleState): BattleResult | null`
- `BattleResult`: `{ winner: "attacker" | "defender" | "retreat", survivingAttacker: ArmyStack[], survivingDefender: ArmyStack[] }`
- `BATTLE_RESOLVED` reducer path that applies battle outcome to
  `AdventureState`
- After battle: update hero armies in `AdventureState`, remove defeated hero

Owned Paths:
- `src/engine/battle-end.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order

Acceptance Criteria:
- Battle ends immediately when last defending stack is killed
- `BATTLE_RESOLVED` validates the battle ID, applies surviving stack
  counts to the winner, removes defeated heroes or neutral stacks, and
  clears pending battle state
- Surviving stacks return correct unit counts (casualties subtracted)
- Tie (both sides wipe each other out simultaneously) treated as defender wins

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
