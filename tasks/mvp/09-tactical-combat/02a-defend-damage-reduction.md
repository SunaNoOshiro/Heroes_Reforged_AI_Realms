# DEFEND Damage Reduction — Fixed-Point Formula

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the DEFEND command. When a stack defends, incoming damage while the DEFENDING flag is set is reduced by a locked constant `defendDamageReductionPermille = 250` (25% reduction). The reduction is calculated deterministically using fixed-point integer math: `damageAfterDefend = damage × (1000 - 250) // 1000 = damage × 750 // 1000`.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`research/deep-research-report.md`](../../../research/deep-research-report.md) (Section 5, combat math constants)

Inputs:
- Defending stack's DEF stat
- Ruleset constants (defend reduction factor, caps)
- Damage before defense (from task 09-03)

Outputs:
- `src/engine/defend.ts`
- `applyDefend(damage: number, defenseValue: number, ruleset: Ruleset): number`
- Reduction factor: `-25 %` (reduced damage multiplier = 0.75 = 750 permille)

Reference Formula (Fixed-Point Integer):
```
defenseReduction = 250 permille (locked: 25% damage reduction)
damageAfterDefend = damage × (1000 - defenseReduction) // 1000
                  = damage × 750 // 1000
```

Worked example (must hold as a unit test):
- `damage = 100` → `damageAfterDefend = 75`
- `damage = 7`   → `damageAfterDefend = 5`  (integer-floor division)
- `damage = 0`   → `damageAfterDefend = 0`

This formula is locked for MVP. Any future DEF-scaled variant lands as
a separate task and a new ruleset constant; it does not modify
`defendDamageReductionPermille`.

Ruleset Constants (locked for MVP):
```json
{
  "defendDamageReductionPermille": 250
}
```

When a DEFEND stack takes damage:
1. Normal damage is calculated (task 09-03)
2. DEFEND flag is checked in `canApplyDefend(stack)`
3. If defending: `damageAfterDefend = damage × 750 // 1000`
4. DEFEND flag is reset next round

Owned Paths:
- `src/engine/defend.ts`
- Ruleset constant update through the shared ruleset path below

Owned Paths (shared):
- `resources/packs/baseline-ruleset/ruleset.json`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.03-damage-formula

Acceptance Criteria:
- Stack with DEFEND flag takes damage 100 → effective damage 75
- DEFEND flag is cleared after defending (not permanent)
- Non-defending stack takes full damage (100 → 100)
- Formula uses only integer arithmetic, no floats
- Defend + luck can both apply to the same attack (luck multiplies after defend)
  - Base 100 → defend 75 → luck (×2) → 150 total
  - Exact integer calculation
- Shared path work is additive only: add defend constants without
  rewriting the primary baseline ruleset contract owned by
  `mvp.04-faction-emberwild.04-baseline-ruleset`

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
