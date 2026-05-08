# Formula AST DSL (schema + evaluator)

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Implement the closed formula AST defined in
[`content-schema/schemas/formula.schema.json`](../../../content-schema/schemas/formula.schema.json)
as TypeScript runtime types plus a fixed-point integer evaluator. Every
numeric formula in the game (damage math, growth, spell effects,
auto-resolve power) is expressed as an AST — never as a string — and
evaluated through this single module. This closes the door on `eval`,
`new Function`, and string-based DSLs.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

The closed op vocabulary:
`const`, `var`, `add`, `sub`, `mul`, `divFloor`, `ratio`, `min`, `max`,
`clamp`, `neg`, `abs`. Adding a new op requires a schema change, a new
handler, and a CI-enforced discriminator update — no silent additions.

Inputs:
- `content-schema/schemas/formula.schema.json`
- Fixed-point math library from [`01-engine-core/04-implement-fixed-point-math-library.md`](../01-engine-core/04-implement-fixed-point-math-library.md)

Outputs:
- `src/rules/formula/types.ts` — discriminated union matching the schema
  exactly (one variant per op)
- `src/rules/formula/evaluator.ts` — `evalFormula(ast, scope): bigint`
  using fixed-point integer math; `ratio` returns `{num, den}` pairs
  where the caller explicitly folds them
- `src/rules/formula/validator.ts` — parse + Zod validate a JSON blob
  into the TS AST; reject unknown ops at load time
- Unit tests for every op including edge cases (divFloor by zero →
  throw `FormulaDivByZero`, clamp with min > max → throw
  `FormulaClampInvalid`, var lookup missing → throw
  `FormulaVarUnbound`)

Owned Paths:
- `src/rules/formula/types.ts`
- `src/rules/formula/evaluator.ts`
- `src/rules/formula/validator.ts`

Dependencies:
- mvp.02-content-schemas.06-ruleset-schema
- mvp.01-engine-core.04-implement-fixed-point-math-library

Acceptance Criteria:
- `evalFormula` is pure, deterministic, and float-free (only `bigint`
  and `number` where `Number.isSafeInteger` holds)
- An evaluator test file exercises every op at least twice
- Evaluating the damage AST from
  [`09-tactical-combat/03-damage-formula.md`](../09-tactical-combat/03-damage-formula.md)
  at ATK−DEF = 10 returns the integer pair `{num: 1500, den: 1000}`
  (i.e. ×1.5)
- `grep -rE "new Function|eval\\(" src/rules/` returns zero hits
- Every formula in `resources/packs/baseline-ruleset/ruleset.json`
  validates against `formula.schema.json`
- **Saturation policy (Q210).** Any intermediate result exceeding
  `MAX_INTERMEDIATE` (`Number.MAX_SAFE_INTEGER`) triggers
  `OverflowError` in dev builds; in prod builds the evaluator
  saturates to the documented cap and emits a warn-level telemetry
  counter. Never wraps. Constants live in `src/engine/constants.ts`;
  cross-cutting policy in
  [`docs/architecture/edge-cases-policy.md` § 6](../../../docs/architecture/edge-cases-policy.md#6-overflow--saturation-q210).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
