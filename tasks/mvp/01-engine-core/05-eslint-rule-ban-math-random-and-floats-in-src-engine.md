# ESLint rule — ban Math.random() and floats in deterministic-adjacent code

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Write a custom ESLint rule (or use `eslint-plugin-no-restricted-syntax`) that:
1. Bans `Math.random()` in any file under `src/engine/`, `src/rules/`,
   `src/content-runtime/`, or `src/content-schema/`
2. Warns on bare floating-point literals (e.g., `0.5`, `1.5`) in those
   modules
3. Enforces that division (`/`) on values typed as `FixedPoint` must go
   through `fpDiv`

The broader file glob covers every deterministic-adjacent path: a
formula evaluator producing `0.5` instead of an integer
numerator/denominator silently breaks the canonical-JSON contract;
content-runtime helpers reading numbers from packs could float-cast
on JSON parse; schema-side defaulting could introduce floats if
[`schema-defaults-policy.md`](../../../docs/architecture/schema-defaults-policy.md)
is not mechanically enforced.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- ESLint config at repo root

Outputs:
- Updated `.eslintrc` or `eslint.config.mjs` with file glob
  `src/{engine,rules,content-runtime,content-schema}/**/*.ts`
- `npm run lint` catches violations across every covered module

Owned Paths:
- `eslint.config.mjs`

Dependencies:
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
- mvp.01-engine-core.04-implement-fixed-point-math-library

Acceptance Criteria:
- Adding `Math.random()` to any file under `src/engine/`,
  `src/rules/`, `src/content-runtime/`, or `src/content-schema/`
  causes `npm run lint` to fail
- Adding `const x = 0.5` inside a sim function under any of those four
  paths causes a lint warning
- A fixture-based test asserts the rule fires on each of the four
  covered paths
- Existing code passes with zero violations

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
