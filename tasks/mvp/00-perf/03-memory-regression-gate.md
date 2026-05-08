# Memory-churn Scenario D + 5 % heap-delta gate

Module: [Performance Harness & Budgets (M1)](../00-perf.md)

Description:
Add **Scenario D — memory churn** to the bench harness and gate CI
on the post-cycle heap delta. This catches event-listener leaks,
stale animation-frame handles, detached DOM nodes, and any other
growth that survives a screen-transition cycle.

The scenario opens main menu → adventure map → enters battle →
returns to map → enters town → exits to main menu, repeated **50
times** under a headless browser. A heap snapshot is captured
before and after the cycle.

Gates:
- Post-cycle heap is within **+5 %** of the pre-cycle heap.
- Detached DOM node count does not grow across the cycle.
- A breach of either gate fails the workflow.

This is the in-CI counterpart to the per-task "no animation-frame
handle leak" line in
[`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../06-renderer/08-presentation-loop-decoupled-from-sim.md);
that line is now an automated assertion, not a manual check.

Read First:
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`tasks/mvp/00-perf/01-bench-harness.md`](./01-bench-harness.md)
- [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../06-renderer/08-presentation-loop-decoupled-from-sim.md)

Inputs:
- Bench harness runner (Task 1).
- React UI shell + screen router so the cycle has real screen
  transitions to walk.

Outputs:
- `bench/scenarios/memory-churn.ts` — Scenario D implementation.
- `.github/workflows/memory.yml` — workflow that runs Scenario D
  alongside the perf workflow and gates on the +5 % heap delta.
- Baseline heap snapshot reference value committed to
  `bench/baseline.json` under
  `scenarios.memory-churn.metrics.heapDelta`.

Owned Paths:
- `bench/scenarios/memory-churn.ts`
- `.github/workflows/memory.yml`

Dependencies:
- mvp.00-perf.01-bench-harness

Acceptance Criteria:
- Scenario D completes 50 cycles of the screen-transition walk in
  a headless Chromium runner.
- Workflow fails when post-cycle heap exceeds pre-cycle by
  > 5 %.
- Workflow fails when detached-DOM-node count grows across the
  cycle (verified via `Memory.getAllTimeSamplingProfile` /
  `Performance.getDetachedDomNodes` or equivalent).
- A deliberately-leaky branch (forget to unbind a listener)
  produces a failing workflow run.
- The pre-existing manual "no animation-frame handle leak" line
  in
  [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../06-renderer/08-presentation-loop-decoupled-from-sim.md)
  is automated by this scenario.

Verify:
- npm run validate
- npm run bench

Estimated Time:
- 4 hours
