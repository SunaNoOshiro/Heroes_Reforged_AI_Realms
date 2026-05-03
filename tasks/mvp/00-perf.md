# Module: Performance Harness & Budgets (M1)

Cross-cutting performance work that converts the budgets pinned in
[`docs/architecture/performance.md`](../../docs/architecture/performance.md)
into enforced CI gates, in-app instrumentation, and reusable
infrastructure (object pools, profiling overlay).

This module exists because the performance contract spans the
engine, renderer, AI, and content layers; dropping the harness and
gates inside any one of those modules would couple them. The bench
harness is the single source of enforcement for every numeric
ceiling in `performance.md`.

Source plan:
[`docs/implementation-plans/09-performance-plan.md`](../../docs/implementation-plans/09-performance-plan.md).
Source audit:
[`docs/readiness-audit/09-performance.md`](../../docs/readiness-audit/09-performance.md).

**Milestone**: M1 — performance-gated CI exit
**Total Estimate**: ~22 hours
**Exit Criteria**: `npm run bench` runs Scenarios A/B/C/D
deterministically; CI fails on a > 10 % regression on any per-frame
metric or on a > 5 % heap-delta over the memory-churn cycle.

---

## Task Files

- [01-bench-harness.md](00-perf/01-bench-harness.md)
  🤖 Task 1: Bench harness — Scenarios A/B/C runtime (~6h)
- [02-bench-baseline-and-ci-gate.md](00-perf/02-bench-baseline-and-ci-gate.md)
  🤖 Task 2: Bench baseline + CI 10 % regression gate (~3h)
- [03-memory-regression-gate.md](00-perf/03-memory-regression-gate.md)
  🤖 Task 3: Memory-churn Scenario D + 5 % heap-delta gate (~4h)
- [04-profiling-overlay.md](00-perf/04-profiling-overlay.md)
  🧠 Task 4: In-game profiling overlay (Ctrl+Shift+P) (~4h)
- [05-object-pools.md](00-perf/05-object-pools.md)
  🧠 Task 5: Object pools (vectors, draw commands, AI nodes, VFX) (~5h)
