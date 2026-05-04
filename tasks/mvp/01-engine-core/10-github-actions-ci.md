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
- Steps: `npm install` → `npm run -ws type-check` → `npm run lint` → `npm run -ws test` (includes fuzz) → `npm run test:ui-smoke` → `npm run test:golden` → `npm run test:coverage` → `npm run test:replays` → `npm run bench:engine` (non-gating, posts PR comment)
- Badge in root `README.md` (CI status + coverage)
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
- Total CI runtime < 3 minutes (smoke + coverage + golden + replays
  steps each fit inside the existing budget; the non-gating
  `bench:engine` step runs in parallel and posts a PR comment with
  the per-metric delta against `main`)
- A deliberate UI binding-name typo causes the
  `npm run test:ui-smoke` step to fail per the contract owned by
  `mvp.02-tooling.01-ui-smoke-harness`
- A deliberate ruleset formula change without a paired golden re-
  bless causes the `npm run test:golden` step to fail per the
  contract owned by `mvp.01-engine-core.12-golden-state-suite`
- A deliberate untested module under `src/engine/` causes the
  `npm run test:coverage` step to fail per the threshold map owned
  by `mvp.02-tooling.02-coverage-gate`
- A deliberate regression of any fixed mechanics bug causes the
  `npm run test:replays` step to fail per the policy owned by
  `mvp.01-engine-core.13-replay-regression-suite`
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
