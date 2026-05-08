# Retaliation — Once Per Round, Nullification

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
After taking a melee attack, a defending stack retaliates (once per combat round). Some abilities remove the right to retaliate or grant additional retaliations.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleState` (Task 1)
- Damage formula (Task 3)

Outputs:
- `src/engine/retaliation.ts`
- `canRetaliate(state: BattleState, stackId: string): boolean`
- Applied in `BATTLE_ATTACK` command handler: attacker damages defender → if `canRetaliate`, defender retaliates
- Retaliation flag reset at start of each new round

Owned Paths:
- `src/engine/retaliation.ts`

Abilities affecting retaliation:
- `no_enemy_retaliation` (Swordsmen, Champions): defender cannot retaliate
- `unlimited_retaliation` (Griffins): retaliates every time
- Ranged attacks: never trigger retaliation (unless attacker is adjacent and has special ability)

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.03-damage-formula

Acceptance Criteria:
- Attacker strikes defender → defender retaliates if it has not yet retaliated this round
- Griffins retaliate against every attacker this round
- Swordsmen attack does not trigger retaliation
- Retaliation always uses melee attack (even for ranged units)
- Retaliation flag resets at start of next round
- **Simultaneous death**: a defender killed by the attacker's strike
  (HP drops to 0 from the incoming damage) does **not** retaliate;
  see [`docs/architecture/edge-case-policy.md` §2](../../../docs/architecture/edge-case-policy.md). `unlimited_retaliation` does not
  override death.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
