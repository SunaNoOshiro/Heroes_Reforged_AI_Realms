# Unit-Test Contract

Status: planned

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

Description:
Author the per-module unit-test contract that pins, for every
implementation module under `src/`, the dependency-injection seams
that module must expose, the canonical fakes that consume those
seams, and the rubric a reviewer applies when asking "is this module
well-tested?" Without a single shared contract, every test invents
its own mocking style and DI seams diverge between modules with no
rationale. The doc is a contract; the fakes themselves land
incrementally as each module first needs them.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/master-plan.md`](../../../docs/architecture/master-plan.md)
- [`docs/architecture/multi-engine-harness.md`](../../../docs/architecture/multi-engine-harness.md)

Inputs:
- Module breakdown in `master-plan.md`
- Existing per-module READMEs under `src/`

Outputs:
- `docs/architecture/testing/unit-test-contract.md` — per-module
  rubric. One subsection per module: `engine`, `rules`,
  `content-runtime`, `ai`, `net`, `persistence`, `ui`. Each
  subsection lists DI seams (interface name + responsibility),
  canonical fakes (file path + behavior), and the rubric (e.g. for
  `rules`: "every formula in `formula.schema.json` must have at
  least one unit test asserting evaluator output for one canonical
  input"). Includes a "Property testing" subsection that names the
  two anchor files owned by
  `mvp.02-tooling.04-property-based-testing`.
- One-line cross-reference under the module breakdown in
  `docs/architecture/master-plan.md`.

Owned Paths:
- `docs/architecture/testing/unit-test-contract.md`

Owned Paths (shared):
- `docs/architecture/master-plan.md` (primary owner:
  `mvp.00-core-architecture`; this task contributes the additive
  cross-reference line only).

Dependencies:
- None

Acceptance Criteria:
- `docs/architecture/testing/unit-test-contract.md` lists every
  implementation module from `master-plan.md` § "Important `src/`
  modules" exactly once.
- Each module subsection contains exactly three sections: DI seams,
  canonical fakes, rubric.
- The fake-file paths cited match the per-module `__tests__/fakes/`
  convention.
- The `master-plan.md` cross-reference has additive scope only. This
  task must not rewrite any existing master-plan section. The primary
  owner of `master-plan.md` remains as named in Owned Paths (shared)
  above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
