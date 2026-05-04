# Coverage Gate

Status: planned

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

Description:
Adopt `vitest --coverage` (c8 backend, already bundled with Vitest)
and pin per-module thresholds — engine ≥ 90 %, rules ≥ 90 %,
content-runtime ≥ 80 %, persistence ≥ 80 %, net ≥ 80 %, ai ≥ 70 %,
ui smoke-only — in `vitest.config.ts`. CI fails on any threshold
violation; the gate sits between `npm test` and the determinism fuzz
step inside
[`tasks/mvp/01-engine-core/10-github-actions-ci.md`](../01-engine-core/10-github-actions-ci.md).

Read First:
- [`docs/architecture/testing/coverage-policy.md`](../../../docs/architecture/testing/coverage-policy.md)
- [`docs/readiness-audit/15-testability.md`](../../../docs/readiness-audit/15-testability.md) § Q259

Inputs:
- `vitest.config.ts` pinned by
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`

Outputs:
- `docs/architecture/testing/coverage-policy.md` — per-module
  threshold table, exclusion rules, tightening policy, and per-module
  rationale.
- `package.json` script `test:coverage` invoking
  `vitest run --coverage`.
- `vitest.config.ts` patch declaring the per-module threshold map
  under the canonical `coverage` block.
- README badge wired by `mvp.01-engine-core.10-github-actions-ci`
  consumes `coverage/summary.json`.

Owned Paths:
- `docs/architecture/testing/coverage-policy.md`

Owned Paths (shared):
- `vitest.config.ts` (primary owner:
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`;
  this task contributes the `coverage` threshold block only).
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `test:coverage` script only).
- `README.md` (primary owner:
  `mvp.01-engine-core.10-github-actions-ci`; this task contributes
  the coverage badge URL only).

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `npm run test:coverage` runs with the c8 provider and emits
  `coverage/summary.json`.
- Threshold map in `vitest.config.ts` matches the table in
  `docs/architecture/testing/coverage-policy.md` line-for-line.
- A deliberate untested module file (zero callers) under
  `src/engine/` causes `npm run test:coverage` to fail with the
  threshold-violation message.
- README coverage badge resolves to a non-404 endpoint after the
  badge URL lands.
- Shared paths (`vitest.config.ts`, `package.json`, `README.md`) are
  extended with additive scope only. This task must not rewrite the
  existing config, scripts, or README structure, and must not
  collapse the existing test or build scripts into the coverage
  runner. The primary owner of each shared path remains as named in
  Owned Paths (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
