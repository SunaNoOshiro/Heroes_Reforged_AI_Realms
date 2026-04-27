# ESLint rule — ban Math.random() and floats in `src/engine`

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Write a custom ESLint rule (or use `eslint-plugin-no-restricted-syntax`) that:
1. Bans `Math.random()` in any file under `src/engine/` or `src/rules/`
2. Warns on bare floating-point literals (e.g., `0.5`, `1.5`) in those modules
3. Enforces that division (`/`) on values typed as `FixedPoint` must go through `fpDiv`

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- ESLint config at repo root

Outputs:
- Updated `.eslintrc` or `eslint.config.mjs`
- `npm run lint` catches violations in the deterministic core modules

Owned Paths:
- `eslint.config.mjs`

Dependencies:
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
- mvp.01-engine-core.04-implement-fixed-point-math-library

Acceptance Criteria:
- Adding `Math.random()` to any file in `src/engine` causes `npm run lint` to fail
- Adding `const x = 0.5` inside a sim function causes a lint warning
- Existing code passes with zero violations

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
