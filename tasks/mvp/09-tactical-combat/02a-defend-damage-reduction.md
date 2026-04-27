# DEFEND Damage Reduction — Fixed-Point Formula

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the DEFEND command. When a stack defends, incoming damage this round is reduced by a fixed percentage (formula TBD based on DEF stat). The reduction is calculated deterministically using fixed-point integer math.

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
defenseReduction = 250 permille (25 % damage reduction)
// Alternative: scale with DEF stat
// defensePenalty = clamp(defenseValue * 10, 0, defendCap)
// defenseReduction = defensePenalty * defendReductionPerPoint
damageAfterDefend = damage × (1000 - defenseReduction) // 1000
```

The first implementation uses a fixed 25 % reduction (simplest for MVP). If DEF scaling is added later, it must match the cap in the ruleset.

Ruleset Constants (to be added):
```json
{
  "defendDamageReductionPermille": 250,
  "defendCapDEF": 40
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
