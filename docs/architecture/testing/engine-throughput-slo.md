# Engine Throughput SLO

Pinned throughput targets for the deterministic engine, measured in
isolation so any regression caused inside `src/engine/` is
attributable. Targets are deliberately conservative — they catch a
5× regression without chasing single-percent variance.

> Companion specs:
>
> - [`performance.md § 1`](../performance.md#1-hardware-tiers) —
>   canonical hardware tiers cited below.
> - [`determinism.md § AI Compute Budget`](../determinism.md#ai-compute-budget)
>   — out-of-scope counterpart for AI move latency.
> - [`determinism.md § Save Artifact Byte Determinism`](../determinism.md#save-artifact-byte-determinism)
>   — out-of-scope counterpart for save / replay disk I/O.
>
> Owning task:
> [`mvp.01-engine-core.14-engine-throughput-benchmark`](../../../tasks/mvp/01-engine-core/14-engine-throughput-benchmark.md)
> — authors `src/engine/__tests__/throughput.bench.ts` and runs
> `npm run test:bench:engine`.

The bench step is **non-gating** on PRs: it records numbers and
posts the delta as a PR comment. CI flips to gating only after a
stability window proves microbenchmark noise on shared CI runners is
bounded (see § 5).

This SLO does **not** replace the broader perf-bench gate owned by
[`mvp.00-perf.02-bench-baseline-and-ci-gate`](../../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md);
that gate measures end-to-end frame ms across the renderer + engine
+ AI stack. Both layers ship; an engine regression surfaces here
first.

---

## 1. Targets

| Metric | Target | Measurement |
|---|---|---|
| Command dispatch throughput | ≥ 100 000 commands / sec | Node 20, single-thread, cold start, the canonical 1000-command fuzz fixture replayed 100×. |
| State hash throughput | ≥ 50 MB / sec | Hashing canonical-JSON output of the canonical `GameState` fixture. |
| Replay loader throughput | ≥ 10 000 commands / sec | Loading the 1000-command fixture log + replaying through `replay(seed, log)`. |

The bench file is `src/engine/__tests__/throughput.bench.ts`,
authored under `vitest bench` (no extra dependency beyond the Vitest
already pinned by
[`mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`](../../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)).

---

## 2. Measurement Method

- **Hardware tier.** Published targets apply to **Node 20 on the
  Reference tier** (Apple M1) per
  [`performance.md § 1`](../performance.md#1-hardware-tiers). CI
  emits per-tier numbers for the Minimum-spec row without changing
  the target.
- **Warmup.** 200 iterations before measurement, discarded.
- **Sample size.** 1 000 measured iterations per metric.
- **Reported value.** Median of 1 000 samples; the PR comment
  surfaces median + p95.
- **Determinism.** Every bench run uses a pinned seed and the
  canonical 1000-command fuzz fixture, so two consecutive runs on
  the same hardware produce identical simulation traces. Timing
  values may vary; the simulation must not.

---

## 3. Tightening Policy

Targets are **forward-only**: once raised, they cannot be lowered
without an audit update. New entries follow the same shape: target
value, measurement method, fixture identifier, hardware tier.

---

## 4. Out of Scope

The engine SLO does not cover:

- **AI move latency.** Owned by the AI compute budget in
  [`determinism.md § AI Compute Budget`](../determinism.md#ai-compute-budget)
  and Scenario C of
  [`mvp.00-perf.01-bench-harness`](../../../tasks/mvp/00-perf/01-bench-harness.md).
- **Renderer frame time.** Owned by Scenario A of the perf-bench
  harness.
- **Save / replay disk I/O.** Saves are gzipped through `pako` at
  level 6 per
  [`determinism.md § Save Artifact Byte Determinism`](../determinism.md#save-artifact-byte-determinism);
  disk-side throughput is measured by
  [`tasks/mvp/08-persistence/`](../../../tasks/mvp/08-persistence/),
  not by this SLO.

---

## 5. Why Non-Gating At First

Microbenchmarks on shared CI runners are noisy. Gating on a 100k
commands / sec target before the noise envelope is measured produces
flaky CI that erodes trust in the gate itself. The staged rollout:

1. Land the bench file and the PR-comment reporter (this task).
2. Collect numbers across at least 100 PRs.
3. Compute the noise envelope (p95 of the run-to-run delta).
4. Set the gate at `target × (1 − envelope)` once envelope < 5 %.
5. Until then, regressions surface as PR comments and reviewers
   judge them by eye.

This staged rollout matches the perf-bench gate's own progression
([`mvp.00-perf.02-bench-baseline-and-ci-gate`](../../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md))
and avoids the trap of "the bench is gated but everyone retries
until it passes."

---

## 🔍 Sync Check

- **UI: ✔** — Doc makes no UI-surface claims; nothing to cross-check
  against `wiki/screens/*`.
- **Schema: ✔** — No schema is owned or referenced by this doc; the
  three throughput targets are runtime invariants enforced by the
  bench harness, not schema-validated record shapes.
- **Tasks: ✔** — Every linked task file exists in
  [`tasks/task-registry.json`](../../../tasks/task-registry.json):
  [`14-engine-throughput-benchmark`](../../../tasks/mvp/01-engine-core/14-engine-throughput-benchmark.md)
  reciprocally cites this doc in its Read First and Outputs;
  [`02-set-up-vite-plus-typescript-strict-mode-per-module`](../../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md),
  [`02-bench-baseline-and-ci-gate`](../../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md),
  and
  [`01-bench-harness`](../../../tasks/mvp/00-perf/01-bench-harness.md)
  exist and are linked consistently. `npm run test:bench:engine` is
  wired in `package.json` exactly as named here. Sibling arch doc
  [`performance.md`](../performance.md) defines the tiers cited in
  § 2.

## ⚠ Issues

- **`performance.md` Related Files block has no back-reference to
  this SLO.** [`performance.md`](../performance.md) "Related Files"
  lists `renderer-technology-choice.md`, `determinism.md`,
  `diagrams/17-cache-strategy.md`, and `atlas-pipeline.md` but not
  the testing SLO that cites it. Non-blocking, but discoverability
  suffers. Owner: a future arch-doc sync pass (or the maintainer of
  `performance.md`); per Hard Prohibition D, no edit was made to
  the sibling file. Suggested addition under Related Files:
  `engine-throughput-slo.md` (relative path
  `./testing/engine-throughput-slo.md` from `performance.md`) —
  engine-isolated throughput targets and PR-comment reporter.
- **Hardware-tier wording realigned with canonical names.** The
  original cited "M1 / Linux / Windows tiers pinned in performance.md
  § 1", but `performance.md § 1` uses the canonical tier names
  **Reference / Minimum-spec / Mobile (deferred)** — there is no
  `Linux` or `Windows` row. The rewrite cites the canonical names
  (Reference = Apple M1; Minimum-spec for per-tier CI emission).
  Meaning is preserved (targets are pinned to the Reference machine;
  CI emits per-tier numbers); only the tier vocabulary was changed
  to match the cited source. Surfaced rather than silent because
  the original wording could be read as a CI matrix claim, not a
  hardware-tier claim.
- **Two stray-backtick typos in original anchor links fixed.** The
  original rendered the `determinism.md § AI Compute Budget` and
  `§ Save Artifact Byte Determinism` link texts with a stray
  trailing backtick before the closing `]`, producing a malformed
  inline-code span inside the link label. The rewrite uses
  balanced backticks; link targets are unchanged.
