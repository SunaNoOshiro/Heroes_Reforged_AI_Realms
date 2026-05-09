# Performance

This file is the single source of truth for performance budgets,
hardware tiers, allocation policy, entity ceilings, and memory
ceilings. Every numeric target the renderer, engine, AI, or content
loader must meet lives here. Other docs link to this file rather
than restating the numbers.

The contracts below are enforced by the bench harness owned by
[`tasks/mvp/00-perf/01-bench-harness.md`](../../tasks/mvp/00-perf/01-bench-harness.md)
and the CI gates owned by
[`tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md`](../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md)
and
[`tasks/mvp/00-perf/03-memory-regression-gate.md`](../../tasks/mvp/00-perf/03-memory-regression-gate.md).
A change to any number in this doc must land together with a
baseline update in the bench harness.

---

## 1. Hardware Tiers

The renderer, engine, and AI all target the rows below. Tier names
are referenced verbatim from acceptance criteria in renderer / AI /
content tasks.

| Tier | Reference hardware | RAM | Browser context | FPS target (gameplay) | FPS target (UI) |
|---|---|---|---|---|---|
| **Reference** | NVIDIA GTX 1060 / Apple M1 | 16 GB | Desktop browser | 60 FPS on 200×200 map and 14-stack battle | 60 FPS |
| **Minimum-spec** | Intel HD 620 / Apple A12-class iGPU | 8 GB | Desktop browser | 30 FPS on 200×200 map and 14-stack battle | 60 FPS |
| **Mobile** *(deferred)* | Tablet-class | 4 GB | Mobile browser | declared, not implemented in M1 | declared, not implemented in M1 |

Mobile is **declared but deferred**. Runtime work for the mobile
tier is out of scope until a later milestone formally adopts the
row.

The renderer's frame-time degradation table
([`renderer-technology-choice.md` § Frame-Time Budget &amp; Degradation](./renderer-technology-choice.md#frame-time-budget--degradation))
expresses the per-frame adaptive policy *within* a tier. The tier
table above pins the hardware envelope; degradation is the in-tier
fallback when a single device underperforms.

---

## 2. Per-Frame CPU Budget

At the **Reference** tier, the 16.6 ms frame envelope splits as
follows:

| System | Budget (ms) |
|---|---|
| `engine.commandDispatch` + reducer step | 2.0 |
| `engine.ai.tick` (off-thread; main-thread message handling only) | 0.5 |
| `engine.fogOfWar.update` | 0.5 |
| `engine.snapshotDiff` + xxh64 | 1.0 |
| `engine.input.dispatch` | 0.5 |
| `renderer.cull` + `renderer.draw` (CPU side) | 4.0 |
| `renderer.animationTick` | 1.0 |
| `ui.react.render` + reconcile | 2.0 |
| Headroom (uncategorized + spikes) | 5.1 |
| **Total** | **16.6** |

At the **Minimum-spec** tier (33.3 ms envelope), every line above
is **doubled** except headroom, which becomes **10.2 ms**.

Bench-harness scenarios A and B
([`tasks/mvp/00-perf/01-bench-harness.md`](../../tasks/mvp/00-perf/01-bench-harness.md))
emit per-system CPU samples and compare them to this table. Any
system that exceeds its budget on the trended baseline by **> 10 %**
fails CI.

---

## 3. GC and Allocation Budget

The engine targets the JavaScript GC to prevent perceptible pauses
during gameplay.

- Steady-state allocations: **≤ 64 KB / frame** at the Reference
  tier (excluding the AI worker, which runs off-thread).
- Per-turn engine allocations (excluding the AI tick): **≤ 256 KB /
  turn**.
- GC pause budget: **no single GC pause > 4 ms** at the Reference
  tier. A pause longer than 4 ms is a bench-harness failure.

Allocation tracking in CI uses `--expose-gc` plus
`performance.measureUserAgentSpecificMemory` on Chromium runners,
or the equivalent DevTools heap-profile API where available. The
exact wiring lives in
[`tasks/mvp/00-perf/01-bench-harness.md`](../../tasks/mvp/00-perf/01-bench-harness.md).

### Allocation Policy

Two rules apply across the engine, renderer, and AI.

1. **Allocate freely in cold paths.** Game-state mutation, save,
   load, and screen transitions are cold paths. The 256 KB / turn
   budget covers them; do not pool primitives in cold paths.
2. **Pool the following in hot paths.** Hot paths run every frame
   or every AI move and must use freelists from
   `src/engine/pool/`:
   - **Hex-coordinate vectors** — the renderer per-frame culling
     pass produces thousands per frame.
   - **Sprite draw-command objects** — one per visible animated
     tile.
   - **AI search nodes** — threat-map BFS frontier nodes.
   - **Particle / VFX nodes** — pool sized to "Active spells with
     persistent VFX" × 16 (see entity ceilings below).

Each pool has a fixed initial capacity and a growth limit. Growth
past the limit is a **bench-harness failure**, not a silent
allocation. Pools are created at engine init and never freed.

The pool primitive and the four pool kinds above are owned by
[`tasks/mvp/00-perf/05-object-pools.md`](../../tasks/mvp/00-perf/05-object-pools.md).

---

## 4. Memory Budget

Absolute peak memory at the **Reference** tier is **1 GB** runtime
(excluding the JavaScript engine itself). The minimum-spec tier
caps every category at **half** of the reference value (total
**500 MB**).

| Category | Reference (MB) | Minimum-spec (MB) |
|---|---:|---:|
| Textures / atlases | 400 | 200 |
| Audio | 150 | 75 |
| Sim state (incl. fog masks, tile arrays) | 150 | 75 |
| Save snapshots in memory (autosave staging) | 50 | 25 |
| UI / DOM / React | 100 | 50 |
| Headroom | 150 | 75 |
| **Total** | **1 000** | **500** |

The asset cache eviction tiers are pinned in
[`docs/architecture/diagrams/17-cache-strategy.md`](./diagrams/17-cache-strategy.md).
The percentage thresholds in that diagram trigger eviction; the
**meaning** of "total used" is the sum of the categories above.

### Map Memory: In-Memory vs Streaming

M1 ships with **maps fully in memory**, bounded by the entity-
ceiling table below. The minimum-spec memory ceiling (500 MB total)
is the binding constraint; a 200×200 map with the documented
entity ceilings fits well under that ceiling on the trended bench
baseline.

Streaming / chunking is **deferred** until either:

- the bench harness shows a 200×200 map exceeding the minimum-spec
  memory ceiling on representative content, or
- a mobile / tablet tier is formally adopted in section 1 above.

If streaming is added later, it is a **content-runtime change**,
not an engine change — `src/content-runtime/` would gain a
region-paged tile loader, while the engine would continue to see
`GameState.worldMap` as a complete typed-array layer (per
[`tasks/mvp/03-map-system/03-layered-tile-storage.md`](../../tasks/mvp/03-map-system/03-layered-tile-storage.md)).

---

## 5. Entity Ceilings

These ceilings are enforced on the largest supported map (200×200)
and on the worst-case battle. Pack content that exceeds any
ceiling fails the bench harness.

| Entity | Ceiling |
|---|---:|
| Heroes (all players combined) | 64 |
| Map objects (mines, mills, dwellings, artefacts, …) | 2 048 |
| Units in any single stack | 999 |
| Active stacks in tactical battle (base) | 14 |
| Summoned-creature elementals contributing extra stacks | +7 |
| Active stacks in tactical battle (with summons) | 21 |
| Adventure-map active animations (any tick this frame, on-screen + off-screen) | 256 |
| Adventure-map on-screen active animations (subset advancing frames this frame) | 128 |
| Active spells with persistent VFX | 32 |
| Simultaneously animating tiles outside battle | 256 |

Notes:

- Off-screen adventure-map animations are time-stepped
  opportunistically per
  [`docs/architecture/diagrams/22-building-loop.md`](./diagrams/22-building-loop.md)
  and skip frame-advance entirely when over budget.
- The 14-stack base battle ceiling is pinned in
  [`tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md`](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md)
  and the renderer's per-frame budget is computed to absorb
  +50 % to support summons (21 stacks).

---

## 6. AI Compute Budget

The per-difficulty search-budget table (`maxNodes`, `maxDepth`,
`wallClockHardMs`) is owned by
[`ai-contract.md` § 4](./ai-contract.md#4-per-turn-budget-table).
Read that table for the constants; do not duplicate them here.

AI search budgets are **deterministic**: identical seed + state +
budget on two machines must produce identical commands. The
deterministic contract is:

- AI workers stop when `nodesExpanded >= maxNodes` or
  `searchDepth >= maxDepth`, whichever fires first.
- The wall-clock hard timeout (`wallClockHardMs` in the table)
  fires the cancellation path; on fire, the worker returns a valid
  `Command` (best-found if any scored, otherwise the per-difficulty
  no-action fallback). The chosen `Command` is logged once and
  replays bit-identically from the log without re-running the
  search.
- An over-budget difficulty level is a **bug** in the implementing
  task ([Pawn / Knight](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md),
  Grand Master / Lord / Immortal — see ai-contract.md § 4
  Implementing tasks). Tune the difficulty constants in the
  ai-contract table until the bench-harness Scenario C AI-vs-AI
  run keeps every move under its `wallClockHardMs` on the
  Minimum-spec tier.

This rule is part of the determinism contract; see
[`docs/architecture/determinism.md`](./determinism.md) and
[`ai-contract.md` § 6 (AI Determinism Under Wall-Clock Budgets)](./ai-contract.md#6-parallelism).

---

## 7. In-Game Profiling Overlay

The dev-only profiling overlay (screen package
[`docs/architecture/wiki/screens/68-dev-profiler/`](./wiki/screens/68-dev-profiler/),
task
[`tasks/mvp/00-perf/04-profiling-overlay.md`](../../tasks/mvp/00-perf/04-profiling-overlay.md))
is the in-app counterpart to the bench harness. The overlay reads
selectors only and never writes engine state. It is gated behind
a build flag; production builds may opt in via URL parameter for
QA / alpha testers.

The overlay surfaces:

- FPS (rolling-average ms / frame).
- Per-system CPU samples from section 2.
- Allocations / frame (when `--expose-gc` is available) and JS
  heap used / total.
- AI compute time and `nodesExpanded` for the last move.
- Active animation count, active spell count, and pool occupancy
  for each pool in section 3.

The overlay's own per-frame cost must be **< 0.2 ms** at the
Reference tier and is itself bench-harness-tracked.

---

## 8. Enforcement

Every number in this file is enforced by the bench harness:

- **Scenario A — adventure-map stress:** validates per-frame CPU
  table (section 2), allocation budget (section 3), entity
  ceilings (section 5), pool growth caps (section 3 allocation
  policy).
- **Scenario B — tactical battle stress:** validates the renderer
  budget at 14 stacks (and at 21 stacks with summons).
- **Scenario C — AI bot match:** validates the deterministic AI
  budget (section 6) and the pathfinder cache contract.
- **Scenario D — memory churn:** validates the memory ceiling
  (section 4) with a +5 % heap-delta gate over a 50-cycle screen
  walk.

Bench-harness sources:

- [`tasks/mvp/00-perf/01-bench-harness.md`](../../tasks/mvp/00-perf/01-bench-harness.md)
- [`tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md`](../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md)
- [`tasks/mvp/00-perf/03-memory-regression-gate.md`](../../tasks/mvp/00-perf/03-memory-regression-gate.md)

---

## Related Files

- [`docs/architecture/renderer-technology-choice.md`](./renderer-technology-choice.md)
  — frame-time degradation policy (in-tier).
- [`docs/architecture/determinism.md`](./determinism.md)
  — AI compute budget is part of the determinism contract.
- [`docs/architecture/diagrams/17-cache-strategy.md`](./diagrams/17-cache-strategy.md)
  — asset-cache eviction triggers atop the memory ceiling above.
- [`docs/architecture/atlas-pipeline.md`](./atlas-pipeline.md)
  — atlas-generation pipeline that feeds the texture-memory
  category.
  — the audit that motivated this doc.
