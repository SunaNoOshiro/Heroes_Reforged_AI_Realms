# Engine Throughput SLO

Pinned throughput targets for the deterministic engine, measured by
[`tasks/mvp/01-engine-core/14-engine-throughput-benchmark.md`](../../../tasks/mvp/01-engine-core/14-engine-throughput-benchmark.md)
through `npm run test:bench:engine`. The bench step is **non-gating** on
PRs (records numbers and posts the delta as a PR comment); CI may flip
to gating only after a stability window proves microbenchmark noise on
shared CI runners is bounded.

The targets are deliberately conservative: they catch a 5× regression
without chasing single-percent variance. They do **not** replace the
broader perf-bench gate owned by
[`tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md`](../../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md);
that gate measures end-to-end frame ms across the renderer + engine
+ AI stack. The engine SLO here measures the engine in isolation so a
regression caused inside `src/engine/` is attributable.

## Targets

| Metric | Target | Measurement |
|---|---|---|
| Command dispatch throughput | ≥ 100 000 commands / sec | Node 20, single-thread, cold start, the canonical 1000-command fuzz fixture replayed 100×. |
| State hash throughput | ≥ 50 MB / sec | Hashing canonical-JSON output of the canonical `GameState` fixture. |
| Replay loader throughput | ≥ 10 000 commands / sec | Loading the 1000-command fixture log + replaying through `replay(seed, log)`. |

The bench file is `src/engine/__tests__/throughput.bench.ts`,
authored under `vitest bench` (no extra dependency beyond the Vitest
already pinned by
[`tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md`](../../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)).

## Measurement Method

- Hardware tier: the same M1 / Linux / Windows tiers pinned in
  [`performance.md` § 1](../performance.md). The published targets
  apply to Node 20 running on the M1 reference machine; CI emits
  per-tier numbers without changing the target.
- Warmup: 200 iterations before measurement, discarded.
- Sample size: 1 000 measured iterations per metric.
- Reported value: median of 1 000 samples; the PR comment surfaces
  median + p95.
- Determinism: every bench run uses a pinned seed and the same
  fixture, so two consecutive runs on the same hardware produce the
  same trace (the timing values may vary; the simulation must not).

## Tightening Policy

Targets are forward-only: once raised, they cannot be lowered without
an audit update. New entries follow the same shape: target value,
measurement method, fixture identifier, hardware tier.

## What This SLO Does Not Cover

- AI move latency. Owned by the AI compute budget in
  [`determinism.md` § AI Compute Budget`](../determinism.md#ai-compute-budget)
  and Scenario C of
  [`tasks/mvp/00-perf/01-bench-harness.md`](../../../tasks/mvp/00-perf/01-bench-harness.md).
- Renderer frame time. Owned by Scenario A of the perf-bench harness.
- Save / replay disk I/O. Saves are gzipped through `pako` at level 6
  per
  [`determinism.md` § Save Artifact Byte Determinism`](../determinism.md#save-artifact-byte-determinism);
  disk-side throughput is measured by
  [`tasks/mvp/08-persistence/`](../../../tasks/mvp/08-persistence/),
  not by this SLO.

## Why Non-Gating At First

Microbenchmarks on shared CI runners are noisy. Gating on a 100k
commands / sec target before the noise envelope is measured produces
flaky CI that erodes trust in the gate itself. The plan is:

1. Land the bench file and the PR-comment reporter (this task).
2. Collect numbers across at least 100 PRs.
3. Compute the noise envelope (p95 of the run-to-run delta).
4. Set the gate at `target × (1 − envelope)` once envelope < 5 %.
5. Until then, regressions surface as PR comments and reviewers
   judge them by eye.

This staged rollout matches the perf-bench gate's own progression
([`tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md`](../../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md))
and avoids the trap of "the bench is gated but everyone retries until
it passes."
