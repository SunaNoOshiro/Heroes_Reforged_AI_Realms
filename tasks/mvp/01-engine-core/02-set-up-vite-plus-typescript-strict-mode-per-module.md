# Set up Vite + TypeScript strict mode per module

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Each implementation module gets its own `tsconfig.json` extending a
root `tsconfig.base.json` with `strict: true`,
`noUncheckedIndexedAccess: true`, and
`exactOptionalPropertyTypes: true`. Vite is configured for library mode
in `src/engine` and `src/rules`; app mode for `src/ui`.

This task is also the canonical owner of the test-runner choice
locked in
[`docs/planning/decision-log.md`](../../../docs/planning/decision-log.md)
DEC-003 — Vitest is the runner for `src/**/*.test.ts` once this task
lands. As part of this task the two existing `node:test` files
(`src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
and the `src/ui/__tests__/smoke.template.test.ts` template marker)
are migrated to the Vitest API in the same PR. Until this task is
done, those files continue to run via
`node --experimental-strip-types --test` per
[`testing-conventions.md` § 8](../../../docs/architecture/testing-conventions.md).
Wiring the mutation-test gate on top of the Vitest setup is owned by
[`mvp.02-tooling.06-mutation-test-gate`](../02-tooling/06-mutation-test-gate.md);
this task does not own Stryker.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Monorepo scaffold from Task 1

Outputs:
- `tsconfig.base.json` at root
- Per-module `tsconfig.json` files
- `vite.config.ts` in each module that needs a build target
- `vitest.config.ts` at root (locked test runner per DEC-003)
- `npm run -ws build` produces `.js` + `.d.ts` for all implementation modules
- Existing `*.test.ts` files using `node:test` migrated to the Vitest
  API; `npm test` rewired to invoke Vitest.

Owned Paths:
- `tsconfig.base.json`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.config.ts`
- `.js`
- `.d.ts`

Owned Paths (shared):
- `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
  (primary owner:
  `mvp.02-content-schemas.23-schema-migration-policy-and-example`;
  this task contributes only the `node:test` → Vitest API migration,
  preserving every assertion in the file's header contract).

Dependencies:
- mvp.01-engine-core.01-initialize-root-workspace-and-module-layout

Acceptance Criteria:
- `npm run -ws type-check` exits 0
- No `any` types in `src/engine` or `src/rules`
- Source maps generated for all implementation modules
- `vitest.config.ts` declares the per-module coverage threshold map
  pinned in
  [`docs/architecture/testing/coverage-policy.md`](../../../docs/architecture/testing/coverage-policy.md)
  under the canonical `coverage` block. The threshold values are
  contributed additively by `mvp.02-tooling.02-coverage-gate`; this
  task only ensures the config block exists with the c8 provider
  selected.
- `vitest.config.ts` `test.include` covers `src/**/*.test.ts` (and
  optionally `*.spec.ts` if both patterns are kept transitionally).
  After migration, no `src/**/*.test.ts` file imports `node:test`.
- `npm test` runs the migrated suite via Vitest; the previous
  `node --test` invocation under `npm test` is removed in the same
  PR. `testing-conventions.md` § 8 is updated to point at DEC-003 as
  the runner-choice source of truth.
- The `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
  file imports from `vitest` (e.g. `import { test, expect } from "vitest"`),
  uses `expect(...)` assertions, and continues to assert all four
  contract points listed in its header comment.
- The `src/ui/__tests__/smoke.template.test.ts` file remains a
  template marker and continues to be skipped by the runner via the
  same `smoke.template.*` exclusion rule already documented inside
  the file.
- Shared path
  `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
  is extended with additive scope only — runner-API migration only.
  This task must not rewrite the assertions or contract semantics;
  the primary owner remains
  `mvp.02-content-schemas.23-schema-migration-policy-and-example`
  as named in Owned Paths (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
