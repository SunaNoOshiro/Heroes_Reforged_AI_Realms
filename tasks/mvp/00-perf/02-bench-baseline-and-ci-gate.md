# Bench baseline + CI 10 % regression gate

Module: [Performance Harness & Budgets (M1)](../00-perf.md)

Description:
Capture a checked-in performance baseline on the Reference tier
and gate every PR against a **10 % regression** on any per-frame
metric or summary value emitted by the bench harness.

Without this gate, the bench harness is informational only.
Coupling the gate to an explicit baseline file makes intentional
regressions visible — they require updating `bench/baseline.json`
in the same PR that introduces the slowdown, with reviewer
sign-off.

Read First:
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`tasks/mvp/00-perf/01-bench-harness.md`](./01-bench-harness.md)
- [`tasks/mvp/01-engine-core/10-github-actions-ci.md`](../01-engine-core/10-github-actions-ci.md)

Inputs:
- Bench harness (Task 1) and a clean run on the Reference tier.

Outputs:
- `bench/baseline.json` — per-scenario baseline values keyed by
  metric name. Format:
  `{ tier, scenarios: { <name>: { metrics: { <key>: { p50, p99 } } } } }`.
- `.github/workflows/perf.yml` — GitHub Actions workflow that:
  - Runs `npm run bench` on `main` and on `perf/**` branches.
  - Compares the new run against `bench/baseline.json`.
  - Fails the job on any metric where the new p50 or p99 exceeds
    the baseline by more than **10 %**.
  - Uploads the report JSON as an artifact for trend visibility.
  - Runs as **advisory** (does not block) on PRs to a non-main
    branch — block-on-fail kicks in for `main`.

Owned Paths:
- `bench/baseline.json`
- `.github/workflows/perf.yml`

Dependencies:
- mvp.00-perf.01-bench-harness

Acceptance Criteria:
- Captured baseline on the Reference tier (one machine, one
  pinned Node + Chromium version, documented in the workflow).
- `bench/baseline.json` is committed to the repo and reviewed as
  part of intentional perf changes.
- Workflow fails when a deliberate 15 % regression is introduced
  to any scenario (verified with a synthetic test branch).
- Workflow does **not** fail on noise within ±10 % of baseline.
- README has a perf-bench badge linking to the latest workflow
  run.

Verify:
- npm run validate
- npm run bench

Estimated Time:
- 3 hours
