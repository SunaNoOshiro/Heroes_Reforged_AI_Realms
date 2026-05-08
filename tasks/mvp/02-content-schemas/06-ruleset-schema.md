# Ruleset Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the data shape for a ruleset — the named constants and
formulas that govern game math. This is what makes the engine truly
data-driven: swap the ruleset JSON and you get different game feel.

All formulas are structured ASTs against
[`formula.schema.json`](../../../content-schema/schemas/formula.schema.json),
never free-form strings. Balance constants are integers (or paired
numerator/denominator integers for ratios) so no `eval()` or float
math is ever required.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Baseline corridor constants (`research/deep-research-report.md`,
  section "Corridor Constants")
- Canonical example: [`baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)

Outputs:
- `src/content-schema/ruleset.ts` exporting `RulesetSchema` and
  `Ruleset`

Owned Paths:
- `src/content-schema/ruleset.ts`

Reference:
- See [content-platform.md](../../../docs/architecture/content-platform.md)
  for pack and ruleset principles.
- Machine-readable schema file: [ruleset.schema.json](../../../content-schema/schemas/ruleset.schema.json)

Dependencies:
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- Parses the canonical baseline ruleset example without errors
- Rejects a ruleset missing required constants
  (`atkBonusPerPointNum`, `atkBonusPerPointDen`, `atkBonusCap`,
  `defReductionCap`, `moraleExtraTurnProbDen`, `fixedPointBasis`)
- Every entry under `formulas` is a valid formula AST node — any
  free-form string is rejected at schema validation time

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
