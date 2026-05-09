# Non-Functional Requirements (NFR) Matrix

> Numeric per-frame tier breakdown:
> [`performance.md`](./performance.md).

This is the single matrix of measurable non-functional targets. Each
row carries a numeric **target**, a **tolerance**, the **owning
module**, and the **harness that verifies the target**. Modules are
expected to add the relevant rows to their `Exit Criteria`; individual
tasks gate on the matching row in their `Acceptance Criteria` /
`Verify:` section.

The matrix is the canonical source. If a number changes, update this
file first; downstream task files reference rows by NFR ID.

---

## 1. Performance (frame-time, throughput)

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-PERF-01 | Adventure-map frame time at 200×200, Reference tier | ≤ 16.6 ms (60 FPS) | ≤ 33.3 ms for at most 1 frame in any 1-second window | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md) | `mvp.00-perf.02-bench-baseline-and-ci-gate` (Scenario A) |
| NFR-PERF-02 | Adventure-map frame time at 200×200, Minimum-spec tier | ≤ 33.3 ms (30 FPS) | ≤ 50 ms for at most 1 frame in any 1-second window | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md) | `mvp.00-perf.02-bench-baseline-and-ci-gate` (Scenario A, min-spec profile) |
| NFR-PERF-03 | Tactical-battle frame time at 14 stacks, Reference tier | ≤ 16.6 ms (60 FPS) | ≤ 33.3 ms for at most 1 frame in any 1-second window | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md), [`mvp.09-tactical-combat`](../../tasks/mvp/09-tactical-combat.md) | `mvp.00-perf.02-bench-baseline-and-ci-gate` (Scenario B) |
| NFR-PERF-04 | Engine reducer throughput, single-thread | ≥ 50 000 commands / sec at Reference tier | ≥ 25 000 / sec at Minimum-spec tier | [`mvp.01-engine-core`](../../tasks/mvp/01-engine-core.md) | `mvp.01-engine-core.14-engine-throughput-benchmark` |
| NFR-PERF-05 | Asset cache hit lookup | ≤ 1 ms p99 | ≤ 5 ms p99 during cold-cache warm-up | [`mvp.02b-asset-pipeline`](../../tasks/mvp/02b-asset-pipeline.md) | Asset-cache micro-benchmark (added as part of `mvp.00-perf.01-bench-harness`) |

## 2. Memory and allocations

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-MEM-01 | Total RAM ceiling, in-game, Reference tier | ≤ 1 500 MB | ≤ 1 800 MB (1-minute moving average) | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md), [`mvp.05-adventure-map`](../../tasks/mvp/05-adventure-map.md) | `mvp.00-perf.03-memory-regression-gate` |
| NFR-MEM-02 | Total RAM ceiling, in-game, Minimum-spec tier | ≤ 500 MB | ≤ 600 MB (1-minute moving average) | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md) | `mvp.00-perf.03-memory-regression-gate` (min-spec profile) |
| NFR-MEM-03 | Steady-state allocations per frame | ≤ 64 KB / frame at Reference tier | ≤ 128 KB / frame at Minimum-spec tier | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md), [`mvp.01-engine-core`](../../tasks/mvp/01-engine-core.md) | `mvp.00-perf.05-object-pools` (allocation guard) |
| NFR-MEM-04 | GC pause (single longest pause) | ≤ 4 ms at Reference tier | ≤ 8 ms at Minimum-spec tier | [`mvp.01-engine-core`](../../tasks/mvp/01-engine-core.md), [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md) | `mvp.00-perf.02-bench-baseline-and-ci-gate` (GC sampling) |

## 3. Latency (network, dispatcher, animations)

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-LAT-01 | Lockstep step latency, single-region 50 ms RTT | ≤ 100 ms p95 | ≤ 200 ms p99 | [`phase-3.01-multiplayer`](../../tasks/phase-3/01-multiplayer.md) | `phase-3.01-multiplayer.12-network-chaos-harness` (per-PR module-level chaos) |
| NFR-LAT-02 | Lockstep step latency, mixed-region 200 ms RTT | ≤ 350 ms p95 | ≤ 500 ms p99 | [`phase-3.01-multiplayer`](../../tasks/phase-3/01-multiplayer.md) | `phase-3.01-multiplayer.12-network-chaos-harness` (mixed-region scenario) |
| NFR-LAT-03 | Command dispatcher latency, single command | ≤ 0.5 ms p95 at Reference tier | ≤ 1.5 ms p95 at Minimum-spec tier | [`mvp.01-engine-core`](../../tasks/mvp/01-engine-core.md) | `mvp.01-engine-core.14-engine-throughput-benchmark` |
| NFR-LAT-04 | Optimistic-UI confirmation lag | ≤ 100 ms in single-player | ≤ 300 ms in multiplayer (M5) | [`mvp.07-ui-shell`](../../tasks/mvp/07-ui-shell.md) | UI smoke harness + `phase-3.01-multiplayer.12-network-chaos-harness` |

## 4. Capacity (entity ceilings)

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-CAP-01 | Maximum strategic-map dimensions | 200 × 200 hex | none — hard cap | [`mvp.03-map-system`](../../tasks/mvp/03-map-system.md) | Schema constraint in `world.schema.json`; bench Scenario A |
| NFR-CAP-02 | Maximum heroes (all players combined) | 64 | none — hard cap | [`mvp.05-adventure-map`](../../tasks/mvp/05-adventure-map.md) | Engine fuzz harness; matches `performance.md` § 5 |
| NFR-CAP-03 | Maximum units in any single stack | 999 | none — hard cap | [`mvp.09-tactical-combat`](../../tasks/mvp/09-tactical-combat.md) | Schema constraint; engine fuzz harness |
| NFR-CAP-04 | Maximum active stacks in tactical battle | 14 base, 21 with summons | none — hard cap | [`mvp.09-tactical-combat`](../../tasks/mvp/09-tactical-combat.md) | Schema constraint; bench Scenario B |
| NFR-CAP-05 | Maximum adventure-map active animations (visible + invisible) | 256 total / 128 advancing per frame | over-budget animations are time-stepped opportunistically | [`mvp.06-renderer`](../../tasks/mvp/06-renderer.md) | Bench Scenario A; renderer animation budget validator |

## 5. Startup, save/load, cold-start

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-START-01 | Cold-start time (browser → main menu) | ≤ 5 s on Reference tier, ≤ 10 s on Minimum-spec tier | ≤ 8 s / ≤ 15 s on first-ever load (cold cache) | [`mvp.07-ui-shell`](../../tasks/mvp/07-ui-shell.md) | UI smoke harness `cold-start.smoke.test.ts` (planned) |
| NFR-START-02 | Save-game write latency (Reference tier) | ≤ 250 ms p95 | ≤ 500 ms p95 with quota pressure | [`mvp.08-persistence`](../../tasks/mvp/08-persistence.md) | Persistence smoke + storage-policy tests |
| NFR-START-03 | Load-game time (Reference tier) | ≤ 1 s p95 | ≤ 2 s p95 with full-replay reconstruction | [`mvp.08-persistence`](../../tasks/mvp/08-persistence.md) | Replay regression suite (`mvp.01-engine-core.13-replay-regression-suite`) |
| NFR-START-04 | Pack hot-reload settle time | ≤ 500 ms in dev | ≤ 1 s with large pack (≥ 100 records) | [`mvp.02b-asset-pipeline`](../../tasks/mvp/02b-asset-pipeline.md) | [`hot-reload-flow.md`](./hot-reload-flow.md) reference scenario |

## 6. AI compute

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-AI-01 | AI move time, heuristic difficulty (Reference tier) | ≤ 500 ms per move | ≤ 1 000 ms p99 | [`mvp.10-heuristic-ai`](../../tasks/mvp/10-heuristic-ai.md) | AI tournament harness; bench Scenario C |
| NFR-AI-02 | AI move time, MCTS difficulty (Reference tier) | ≤ 2 000 ms per move | ≤ 3 000 ms p99 (watchdog warning) | [`phase-3.03-mcts-ai`](../../tasks/phase-3/03-mcts-ai.md) | AI tournament harness; bench Scenario C |
| NFR-AI-03 | AI worker isolation | All AI compute runs in a Web Worker; no main-thread block > 4 ms | none — hard contract | [`mvp.10-heuristic-ai`](../../tasks/mvp/10-heuristic-ai.md), [`phase-3.03-mcts-ai`](../../tasks/phase-3/03-mcts-ai.md) | UI smoke harness (main-thread frame-time guard) |

## 7. CI / build

| ID | Metric | Target | Tolerance | Owning module | Verified by |
|---|---|---|---|---|---|
| NFR-CI-01 | `npm run validate` wall-clock time, GitHub Actions `ubuntu-24.04` | ≤ 3 minutes | ≤ 5 minutes p95 | [`mvp.01-engine-core.10-github-actions-ci`](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) | `.github/workflows/validate.yml` `timeout-minutes: 5` |
| NFR-CI-02 | `npm test` wall-clock time | ≤ 1 minute | ≤ 3 minutes p95 | [`mvp.01-engine-core`](../../tasks/mvp/01-engine-core.md) | CI step timing report |

---

## How to use this matrix

- **Module index files** must reference any NFR row in their owning
  module's "Exit Criteria" section (see T9 in the source plan).
- **Task files** that ship a benchmark or guard the gate cite the NFR
  ID in their `Acceptance Criteria` (e.g.
  `Holds NFR-PERF-01 within tolerance on the Scenario-A profile`).
- **The numeric source of truth** for per-frame budgets and tier
  ceilings is [`performance.md`](./performance.md). This matrix
  pulls those numbers into a per-NFR view; if the two diverge, the
  numeric file wins and this matrix must be updated.

## Adding a new NFR

1. Pick the next ID in the appropriate section (`NFR-<KIND>-NN`).
2. Provide all six columns: metric, target, tolerance, owning
   module, and harness.
3. Update the owning module's `Exit Criteria` to cite the new row.
4. If the harness does not yet exist, scaffold a perf-benchmark task
   under that module following the canonical task shape.
5. Run `npm run validate` to confirm cross-references resolve.

## Verified by

- This file is grep-checked for `TBD` / `TODO` / `FIXME` by
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  (T1 grep gate). Every row above must commit to a numeric target.
- The owning-module column is a path; broken links fail
  `npm run validate:links`.
