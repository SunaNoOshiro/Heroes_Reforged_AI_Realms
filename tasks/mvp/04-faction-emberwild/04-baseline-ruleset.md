# Baseline Ruleset JSON (Formula AST)

Status: planned

Module: [Faction — Emberwild (M1)](../04-faction-emberwild.md)

Description:
Author the baseline ruleset as integer constants plus structured
formula ASTs (see
[`formula.schema.json`](../../../content-schema/schemas/formula.schema.json)).
No formulas are stored as strings; the combat math is expressed via the
closed `op` vocabulary (`add`, `sub`, `mul`, `divFloor`, `ratio`,
`min`, `max`, `clamp`, `neg`, `abs`).

This is the hardest task in this module. The formula AST must match the
fixed-point damage formula documented in
[`09-tactical-combat/03-damage-formula.md`](../09-tactical-combat/03-damage-formula.md).

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Canonical example in [`content-schema/examples/records/rulesets/baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json) — this is the SSOT for values
- Baseline stat corridors in [`research/deep-research-report.md`](../../../research/deep-research-report.md)
- Ruleset schema (`02-content-schemas.md` Task 6)
- Formula DSL task (`02-content-schemas/12-formula-dsl.md`)

Outputs:
- `resources/packs/baseline-ruleset/ruleset.json` — byte-for-byte
  equivalent to the example record (same constants, same formula AST)

Key constants (integer numerator/denominator pairs, stat-differential
**points** for caps — not percent-of-base):

- `atkBonusPerPointNum = 1`, `atkBonusPerPointDen = 20` (+5 % damage
  per ATK−DEF point)
- `defReductionPerPointNum = 1`, `defReductionPerPointDen = 20` (−5 %
  damage per DEF−ATK point)
- `atkBonusCap = 60` (clamp ATK−DEF to 60 points → +300 % max)
- `defReductionCap = 60` (clamp DEF−ATK to 60 points → ×0.25 floor)
- `fixedPointBasis = 1000`
- `moraleExtraTurnProbNum = 1`, `moraleExtraTurnProbDen = 24`
- `moralePenaltyMissProbNum = 1`, `moralePenaltyMissProbDen = 24`
- `moraleMax = 3`
- `luckDoubleProbNum = 1`, `luckDoubleProbDen = 24`
- `luckMax = 3`
- `autoResolveAttackerAdvantageNum = 105`,
  `autoResolveAttackerAdvantageDen = 100`

Key formulas (as formula AST):

- `attackBonus` — `clamp(ATK−DEF, 0, atkBonusCap) × ratio(atkBonusPerPointNum, atkBonusPerPointDen)`
- `defenseMitigation` — `clamp(DEF−ATK, 0, defReductionCap) × ratio(defReductionPerPointNum, defReductionPerPointDen)`
- Add `growth.weekly` when the runtime task lands.

Owned Paths:
- `resources/packs/baseline-ruleset/ruleset.json`

Dependencies:
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- Ruleset validates against `ruleset.schema.json`
- Every formula validates against `formula.schema.json` — no strings
- Evaluating `attackBonus` at ATK−DEF = 10 returns the rational
  `{num: 500, den: 1000}` (permille 500 → ×1.5 attacker-side)
- Evaluating `defenseMitigation` at DEF−ATK = 10 returns
  `{num: 500, den: 1000}` (permille 500 → ×0.667 defender-side)
- Evaluating `attackBonus` at ATK−DEF = 80 clamps to 60 → permille
  3000 → ×4.00 (+300 %)
- Output is byte-identical to [`baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)
- No `new Function`, no `eval`, no runtime string parsing

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
