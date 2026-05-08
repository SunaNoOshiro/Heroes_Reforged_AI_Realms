# Implement fixed-point math library

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
All numeric values in `src/engine` use integers scaled by ×1000 (i.e.,
`1.5` becomes `1500`). Implement a `FixedPoint` type alias (`number`
branded) and arithmetic helpers: `fp(n)`, `fpAdd`, `fpSub`, `fpMul`,
`fpDiv`, `fpFloor`, `fpCeil`, `fpRound`. Never use `/` or `*` on raw
numbers in sim code without going through these helpers.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- None

Outputs:
- `src/engine/fixed-point.ts`
- All operations return integers (no fractional results leak through)
- `fpDiv(a, b)` truncates toward zero (match C behavior for cross-platform consistency)

Owned Paths:
- `src/engine/fixed-point.ts`

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `fpMul(1500, 1500)` returns `2250` (i.e., 1.5 × 1.5 = 2.25 → stored as 2250)
- No floating-point drift: `fpAdd(fpAdd(a, b), c) === fpAdd(a, fpAdd(b, c))` for all tested inputs
- ESLint rule from Task 5 catches any bare `*` or `/` on `FixedPoint` values

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
