# Asset Loader Canary

Module: [Asset Pipeline (M0/M1)](../02b-asset-pipeline.md)

Description:
Per-cluster canary task that **reserves the asset-loader contract**
and asserts the closed refusal codes fire on each escape-vector
fixture. Closes Plan 32 § PI-4 (Doctrine canary tasks per cluster)
for the asset loader cluster.

The canary runs one descriptor from
[`tests/security/escape-vectors/`](../../../tests/security/escape-vectors/)
through a stub loader and asserts the matching closed refusal code
from
[`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md).
Failing loudly here means a schema change that desyncs from the
loader can be caught before any pack actually fails to load.

Read First:
- [`docs/architecture/asset-loading.md`](../../../docs/architecture/asset-loading.md)
- [`docs/architecture/sandbox-model.md`](../../../docs/architecture/sandbox-model.md)
- [`docs/architecture/pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)
- [`tests/security/escape-vectors/README.md`](../../../tests/security/escape-vectors/README.md)
- [`tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md`](./17-binary-asset-validators.md)
- [`docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md`](../../../docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md)
  § PI-4

Inputs:
- Escape-vector fixture descriptors under
  `tests/security/escape-vectors/`.
- Closed refusal-code surface in
  [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md).

Outputs:
- A canary test under
  `src/content-runtime/__tests__/asset-loader-canary.test.ts`
  (reserved today; populated when the runtime cluster lands).

Owned Paths:
- `src/content-runtime/__tests__/asset-loader-canary.test.ts`
  (reserved path)

Owned Paths (shared):
- `tests/security/escape-vectors/` — primary owner is the
  security-tests escape-vectors corpus
  ([`tasks/mvp/00-core-architecture/22-05-security-tests-escape-vectors-corpus.md`](../00-core-architecture/22-05-security-tests-escape-vectors-corpus.md));
  this canary treats one descriptor per cluster as an
  additive-extension reference and must not rewrite or remove
  fixtures.

Dependencies:
- mvp.02b-asset-pipeline.17-binary-asset-validators

Acceptance Criteria:
- A canary test exists in this task's owned path (reserved today,
  populated when the runtime cluster lands).
- The canary runs at least one
  `tests/security/escape-vectors/` fixture descriptor through the
  stub loader and asserts the matching closed refusal code from
  `pack-error-codes.md`.
- `validate:tasks` passes; the task is registered in
  `tasks/task-registry.json`.
- When the loader contract is changed in a way that breaks the
  canary, this test must fail before any pack-load surface is
  affected.

Owned Paths (shared) acceptance:
- The escape-vectors corpus is **owned by**
  `mvp.00-core-architecture.22-05-security-tests-escape-vectors-corpus`
  (the primary contract). This canary is **additive**: it
  references one descriptor per cluster; this task must not
  rewrite or remove any existing fixture.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
