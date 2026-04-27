# Damage Formula — Integer AST against Baseline Ruleset

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the damage evaluator. The formula itself lives as a structured
integer AST in the baseline ruleset pack (see
`content-schema/schemas/formula.schema.json`). This task writes the
*evaluator* that runs that AST against a concrete attacker/defender
pair. The evaluator is deterministic and never uses floating-point math.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Attacker unit stats (`attack`, `damageMin`, `damageMax`, `stackSize`)
- Defender unit stats (`defense`, `currentHp`)
- Ruleset constants and named formulas loaded from the active ruleset
  pack
- RNG for damage roll (within min/max range) and luck roll

Outputs:
- `src/engine/damage.ts`
- `calculateDamage(attacker: UnitStack, defender: UnitStack, ruleset: Ruleset, rng: Rng, isRanged: boolean): DamageResult`
- `DamageResult`: `{ baseDamage, attackBonus, defenseMitigation, luckMultiplier, totalDamage, unitsKilled, remainingHp }`

Reference formula (expressed in the AST, baseline ruleset — values
come from [`baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)):

```
base             = stackSize × randBetween(attacker.damageMin, attacker.damageMax)
attackBonus      = clamp(attacker.attack − defender.defense, 0, atkBonusCap) × atkBonusPerPointPermille   // 1/20 → 50 per point
defenseMitigate  = clamp(defender.defense − attacker.attack, 0, defReductionCap) × defReductionPerPointPermille // 1/20 → 50 per point
withAttack       = base × (1000 + attackBonus) // 1000
withDefense      = withAttack × 1000 // (1000 + defenseMitigate)
luckMultiplier   = luckFires ? 2 : 1
total            = withDefense × luckMultiplier
```

Caps are expressed in **stat-differential points** (60 / 60), not
percent-of-base. All math is integer. The `×1000` scale is the
fixed-point basis used across the baseline ruleset. The evaluator
must refuse to interpret any operator that is not in the formula AST
enum.

Owned Paths:
- `src/engine/damage.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.04-faction-emberwild.04-baseline-ruleset
- mvp.02-content-schemas.12-formula-dsl

Acceptance Criteria:
- Stack of 20 of a T7 creature (ATK=30, DEF=30, dmg 50–50) vs equal
  defender (DEF=30): expected damage = 1 000, luck disabled
- At ATK−DEF=10 with baseline constants, attackBonus permille = 500
  → multiplier ×1.5 (exact integer fixed-point)
- At DEF−ATK=10 with baseline constants, defenseMitigate permille = 500
  → multiplier 1000/1500 ≈ ×0.667 (exact integer ratio)
- At ATK−DEF=80 the clamp pins the differential at 60 → permille 3000
  → multiplier ×4.00 (+300 %)
- Luck fires → damage exactly doubled for the same RNG seed
- Evaluator uses only the formula AST plus fixed-point integer
  arithmetic — no `Math.*` calls, no floats
- Swapping the ruleset pack for a different set of damage constants
  changes the output without any TypeScript change

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
