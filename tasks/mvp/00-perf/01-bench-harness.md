# Bench harness — Scenarios A/B/C runtime

Status: planned

Module: [Performance Harness & Budgets (M1)](../00-perf.md)

Description:
Build the headless performance bench harness that enforces every
numerical contract in
[`docs/architecture/performance.md`](../../../docs/architecture/performance.md).
Three pinned scenarios run from a single `npm run bench` entry
point and emit JSON reports under `bench/results/`.

- **Scenario A — adventure-map stress.** 200×200 generated map,
  scripted camera pan at constant velocity for 30 s, full pan +
  zoom-in + zoom-out cycle. Measures CPU ms/frame per system,
  GPU ms/frame, allocations/frame, peak heap, active animation
  count.
- **Scenario B — tactical battle stress.** 14 unit stacks
  (worst-case mix from balance task), AoE spell cast on turn 3,
  full retaliation chain, run for 50 turns or until victory.
  Measures combat-specific ms/frame and animation-count peak.
  Adds a 21-stack run to validate the summons absorbed budget.
- **Scenario C — AI bot match.** 100-turn AI-vs-AI on the random
  map generator template, two `Knight`-difficulty workers with
  the deterministic `searchBudget`. Measures ms/AI-move and
  total wall-clock to verify the chosen `maxNodes` keeps moves
  under 2 s on Minimum-spec.

Each scenario uses deterministic seeded fixtures so bench results
are byte-stable across runs on the same hardware tier. All three
scenarios share fixtures with the fuzz harness where useful (see
`mvp.01-engine-core.09-fuzz-harness-1000-command-ai-vs-ai-determinism-test`).

Read First:
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/implementation-plans/09-performance-plan.md`](../../../docs/implementation-plans/09-performance-plan.md)

Inputs:
- Engine reducer + replay API
  (`mvp.01-engine-core.06-command-dispatcher`,
  `mvp.01-engine-core.08-replay-api`).
- Renderer presentation loop
  (`mvp.06-renderer.08-presentation-loop-decoupled-from-sim`).
- AI worker with deterministic `searchBudget`
  (`mvp.10-heuristic-ai.06-run-ai-in-web-worker`).
- Random map generator
  (`mvp.03-map-system.09-random-map-generator-deterministic-runner`).

Outputs:
- `bench/runner.ts` — entry point invoked by `npm run bench`.
- `bench/scenarios/adventure-map-stress.ts` — Scenario A.
- `bench/scenarios/battle-stress.ts` — Scenario B.
- `bench/scenarios/ai-bot-match.ts` — Scenario C.
- `bench/results/.gitkeep` — placeholder for per-run JSON
  reports (gitignored except the keepfile).
- `npm run bench` script wired in `package.json`.
- Per-scenario JSON report shape:
  `{ scenario, tier, frames: { ms, allocBytes, animCount }[], summary, hash }`.

Owned Paths:
- `bench/runner.ts`
- `bench/scenarios/`
- `bench/results/.gitkeep`

Dependencies:
- mvp.06-renderer.08-presentation-loop-decoupled-from-sim
- mvp.10-heuristic-ai.06-run-ai-in-web-worker
- mvp.03-map-system.09-random-map-generator-deterministic-runner

Acceptance Criteria:
- `npm run bench` runs all three scenarios headless and writes
  JSON reports under `bench/results/<scenario>-<timestamp>.json`.
- Two consecutive runs on the same hardware produce byte-identical
  fixture inputs and identical `summary.hash` values (the
  measurement values may vary; the simulation trace must not).
- Scenario A asserts on-screen active animation count ≤ 128 and
  total active animation count ≤ 256 per
  [`performance.md` § 5](../../../docs/architecture/performance.md#5-entity-ceilings).
- Scenario A asserts pool growth past the configured caps fails
  the run (consumed by `mvp.00-perf.05-object-pools`).
- Scenario B validates 14-stack and 21-stack (with summons) frame
  budgets.
- Scenario C asserts identical `Command` output across two runs
  with the same seed and `searchBudget`, and that no AI move
  exceeds the watchdog wall-clock budget on the Minimum-spec
  emulation profile.
- Per-system CPU samples are emitted for every line of
  [`performance.md` § 2](../../../docs/architecture/performance.md#2-per-frame-cpu-budget).

Verify:
- npm run validate
- npm run bench

Estimated Time:
- 6 hours
