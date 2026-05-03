# GitHub Actions CI

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Set up CI that runs on every push and PR: lint, type-check, unit tests, and the fuzz harness. Fail the PR if any step fails. Add a badge to the root README.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- All prior tasks merged

Outputs:
- `.github/workflows/ci.yml`
- Steps: `npm install` → `npm run -ws type-check` → `npm run lint` → `npm run -ws test` (includes fuzz)
- Badge in root `README.md`
- **Perf-bench job** (advisory on PRs, blocking on `main` and
  `perf/**` branches) — wired by
  `mvp.00-perf.02-bench-baseline-and-ci-gate` via
  `.github/workflows/perf.yml`.
- **Memory-gate job** (blocking) — wired by
  `mvp.00-perf.03-memory-regression-gate` via
  `.github/workflows/memory.yml`.
- Both perf jobs share the bench harness from
  `mvp.00-perf.01-bench-harness`.

Owned Paths:
- `.github/workflows/ci.yml`
- `README.md`

Owned Paths (shared):
- `.github/workflows/perf.yml` (primary owner:
  `mvp.00-perf.02-bench-baseline-and-ci-gate`).
- `.github/workflows/memory.yml` (primary owner:
  `mvp.00-perf.03-memory-regression-gate`).

Dependencies:
- mvp.01-engine-core.09-fuzz-harness-1000-command-ai-vs-ai-determinism-test

Acceptance Criteria:
- CI passes on `main` after all M0 tasks are merged
- A deliberate `Math.random()` injection causes CI to fail at the lint step
- A deliberate state-mutation bug causes CI to fail at the fuzz step
- Total CI runtime < 3 minutes
- The shared paths `.github/workflows/perf.yml` and
  `.github/workflows/memory.yml` are **additive** workflow files;
  they coexist with `.github/workflows/ci.yml` and must not
  rewrite or merge into it. The primary owner of `perf.yml` is
  `mvp.00-perf.02-bench-baseline-and-ci-gate`; the primary owner
  of `memory.yml` is `mvp.00-perf.03-memory-regression-gate`.
  This task only references those workflows; it does not author
  their gate logic.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
