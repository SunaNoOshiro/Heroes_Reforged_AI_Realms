# Selector Purity Contract + Lint Rule

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land the ESLint rule (or equivalent) that enforces the selector
purity contract pinned in
[`docs/architecture/ui-state-contract.md` § Selector Purity](../../../docs/architecture/ui-state-contract.md#selector-purity).
Selectors live in `src/ui/` which the architecture marks as
"non-deterministic", but selector functions themselves MUST be pure
or M5 lockstep diverges silently between peers — the same `(state,
command-log)` triple has to produce the same selector output on
every client. The host doc declares the rule; this task lands the
machine-checkable enforcement (lint + sentinel test).

Read First:
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`

Inputs:
- The Selector Purity section of
  [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)

Outputs:
- `eslint-rules/no-impure-selectors.cjs` — banned-API rule covering
  `Math.random()`, `Date.now()`, `performance.now()`,
  `crypto.randomUUID()`, and `await` for files matching
  `src/**/selectors/**`
- `tests/selectors/purity.spec.ts` — sentinel test that runs each
  selector twice on identical input and asserts deep equality

Owned Paths:
- `eslint-rules/no-impure-selectors.cjs`
- `tests/selectors/purity.spec.ts`

Owned Paths (shared):
- `docs/architecture/ui-state-contract.md`

Dependencies:
- mvp.07-ui-shell.12-component-state-matrix

Acceptance Criteria:
- This task's edit to
  [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
  is additive: it adds enforcement notes to the existing § Selector
  Purity section rather than rewriting it. The primary owner of the
  host doc remains
  [`12-component-state-matrix.md`](./12-component-state-matrix.md);
  this task must not rewrite or repurpose unrelated sections.
- `eslint-rules/no-impure-selectors.cjs` flags any of the banned APIs
  inside files matching `src/**/selectors/**` and emits a localized
  message that cites the contract.
- `tests/selectors/purity.spec.ts` runs every exported selector twice
  on the same input and fails when results differ by deep equality.
- Until `src/ui/` lands, both files stand as scaffolds with at least
  one self-test demonstrating the rule fires correctly on a fixture
  selector that calls `Date.now()`.
- `npm run validate:tasks` passes.

Verify:
- npm run validate:tasks
- npm run validate

Estimated Time:
- 3 hours
