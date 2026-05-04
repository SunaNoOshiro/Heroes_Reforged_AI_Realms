# Engine Throughput Benchmark

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Author a `vitest bench` benchmark file under
`src/engine/__tests__/throughput.bench.ts` that pins three engine-
isolated throughput targets: command dispatch ≥ 100 000 commands /
sec, state hash ≥ 50 MB / sec, replay loader ≥ 10 000 commands /
sec. Targets are measured against the canonical 1000-command fuzz
fixture and reported as median + p95 over 1 000 samples after a 200-
iteration warmup. CI runs the bench in **non-gating** mode (records
numbers, posts the delta as a PR comment) — flipped to gating only
after a stability window measures the noise envelope on shared CI
runners. The full SLO (targets, measurement method, tightening
policy) lives in
[`docs/architecture/testing/engine-throughput-slo.md`](../../../docs/architecture/testing/engine-throughput-slo.md).

This benchmark is engine-isolated; the broader perf-bench gate owned
by
[`tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md`](../00-perf/02-bench-baseline-and-ci-gate.md)
measures the engine + renderer + AI stack end-to-end. Both layers
ship; an engine regression surfaces in this bench first.

Read First:
- [`docs/architecture/testing/engine-throughput-slo.md`](../../../docs/architecture/testing/engine-throughput-slo.md)
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`docs/readiness-audit/15-testability.md`](../../../docs/readiness-audit/15-testability.md) § Q260

Inputs:
- Command dispatcher (`mvp.01-engine-core.06-command-dispatcher`)
- State serializer + xxh64 hash
  (`mvp.01-engine-core.07-state-serializer-plus-xxh64-hash`)
- Replay API (`mvp.01-engine-core.08-replay-api`)
- The 1000-command fuzz fixture pinned by
  `mvp.01-engine-core.09-fuzz-harness-1000-command-ai-vs-ai-determinism-test`

Outputs:
- `docs/architecture/testing/engine-throughput-slo.md` — three SLO
  targets, measurement method, tightening policy.
- `src/engine/__tests__/throughput.bench.ts` — `vitest bench` file
  measuring the three metrics.
- `package.json` script `bench:engine` invoking
  `vitest bench src/engine/__tests__/throughput.bench.ts`.
- Edit to `mvp.01-engine-core.10-github-actions-ci`'s acceptance
  criteria (additive only): non-gating bench step + PR-comment
  reporter behavior.

Owned Paths:
- `docs/architecture/testing/engine-throughput-slo.md`
- `src/engine/__tests__/throughput.bench.ts`

Owned Paths (shared):
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `bench:engine` script only).

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.08-replay-api

Acceptance Criteria:
- `npm run bench:engine` runs the three measured metrics and emits
  median + p95 to stdout.
- Two consecutive runs on the same hardware produce byte-identical
  fixture inputs and identical simulation traces; only the timing
  values may vary.
- A 5× regression on any of the three targets is flagged in the PR
  comment; CI does not fail (non-gating until the noise envelope
  measurement window completes).
- The SLO doc names exactly three targets, the measurement method,
  and the policy for tightening.
- Shared path (`package.json`) is extended with additive scope
  only. This task must not rewrite the existing scripts; the
  primary owner of `package.json` remains as named in Owned Paths
  (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
