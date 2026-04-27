# Implementation Plan: 09 — Performance

> Derived from [docs/readiness-audit/09-performance.md](../readiness-audit/09-performance.md).
> The original audit file is **not** modified. This plan converts the
> documented gaps (❌ UNKNOWN, ⚠ Partial, Missing Logic, Risks) into
> concrete work items grounded in the existing M1 task tree under
> [tasks/mvp/01-engine-core/](../../tasks/mvp/01-engine-core/),
> [tasks/mvp/03-map-system/](../../tasks/mvp/03-map-system/),
> [tasks/mvp/06-renderer/](../../tasks/mvp/06-renderer/),
> [tasks/mvp/10-heuristic-ai/](../../tasks/mvp/10-heuristic-ai/),
> and the screen packages under
> [docs/architecture/wiki/screens/](../architecture/wiki/screens/).

---

## 1. Overview

This plan covers the performance gaps in the M1 architecture. The
audit confirms the **headline targets are sound**: 60 FPS on a
mid-range laptop / Apple M1 reference, viewport frustum culling,
batched per-layer hex draws, atlas-based sprite sampling, AI in a
Web Worker, and a tiered (Pinned / Hot / Warm / Cold) asset cache
are all defined across
[`docs/architecture/renderer-technology-choice.md`](../architecture/renderer-technology-choice.md),
the renderer task folder, and
[`docs/architecture/diagrams/17-cache-strategy.md`](../architecture/diagrams/17-cache-strategy.md).

What is missing is **almost every operational performance contract
underneath those headlines**:

- A minimum-spec hardware tier and its FPS target.
- A per-system per-frame CPU budget table.
- A GC / per-frame allocation budget and a measurement story.
- An object-pooling policy (or an explicit "we rely on V8 GC"
  decision with rationale).
- Global entity ceilings on the largest map (heroes, map objects,
  active spells, summoned units).
- An adventure-map concurrent-animation ceiling.
- An atlas-generation pipeline (the consumer side is pinned; the
  producer side is undefined).
- An absolute memory ceiling in MB and a per-category split
  (textures / audio / sim / saves / UI).
- A memory-leak CI gate.
- An in-game profiling overlay.
- A worst-case battle / map / AI benchmark harness.
- A pathfinder cache and invalidation rule.
- A **deterministic** AI compute budget (the wall-clock 2 s
  timeout silently breaks the determinism contract that
  [`docs/architecture/determinism.md`](../architecture/determinism.md)
  is built on).

**Overall readiness state:** 3 / 10 (per audit). Closing the items
below lifts this to 8–9 / 10, which is the threshold for letting
agents implement and regression-gate performance autonomously.

**In scope of this plan:**

- A new canonical doc `docs/architecture/performance.md` as the
  single source of truth for budgets and ceilings.
- New task files under
  [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/),
  [`tasks/mvp/10-heuristic-ai/`](../../tasks/mvp/10-heuristic-ai/),
  and a new `tasks/mvp/00-perf/` folder for cross-cutting work
  (bench harness, CI memory gate, profiling overlay).
- Extensions (not rewrites) to existing M1 tasks via owned-paths
  shared-extension semantics.
- A new dev-only screen package
  [`docs/architecture/wiki/screens/57-dev-profiler/`](../architecture/wiki/screens/57-dev-profiler/)
  for the in-game profiling overlay.

**Explicitly out of scope (deferred):**

- Mobile / tablet performance tier beyond declaring it as a
  separate row in the minimum-spec table; the runtime work for
  mobile lives in a later milestone.
- GPU-side instancing / geometry shaders beyond the existing
  batched-per-layer model — only added if a benchmark proves the
  current model misses 60 FPS.
- Streaming / chunking of map state. We document the decision
  ("fully in memory") and bound its impact via the entity-ceiling
  contract; chunking is deferred unless and until the bench
  harness shows a 200×200 map exceeding the memory ceiling.

---

## 2. Critical Fixes (Must Do First)

These six items unblock M1 exit to "performance-gated CI." Each
maps directly to a Missing Logic bullet in the audit summary.

### Issue: Wall-clock AI timeout breaks determinism

**Source:** Q178 (✔ for "AI off main thread", ⚠ for determinism);
Risks bullet 3.

**Problem:**
[`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:36-39`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L36-L39)
defines a **2-second wall-clock timeout** that returns the
"best move found so far". Two identically-seeded clients on
different hardware can therefore produce different commands, which
is a **direct violation** of the determinism contract in
[`docs/architecture/determinism.md`](../architecture/determinism.md)
and breaks save/replay round-trip plus multiplayer lockstep.

**Impact:**
- Multiplayer lockstep diverges between a fast host and a slow peer.
- Replays produced on a fast machine fail to reproduce on a slow
  machine.
- The fuzz-harness determinism gate (`mvp.01-engine-core.09-fuzz-harness`)
  becomes flaky on under-powered CI runners.
- Every other contract built on `stateHash` equality silently
  loses meaning during AI turns.

**Solution:**
Replace the wall-clock timeout with a **deterministic iteration /
node-count budget** that is a pure function of difficulty level
and game state size:

- AI workers stop when `nodesExpanded >= maxNodes(difficulty,
  mapDims)` or `searchDepth >= maxDepth(difficulty)`, whichever
  fires first.
- The wall-clock timer remains, **but only as a watchdog** that
  logs a warning if an AI move exceeds 2 s on the current machine
  — it never truncates the search. Instead, an over-budget
  difficulty level is a **bug** and is treated as such.
- Difficulty tuning is performed against the bench harness
  (Critical Fix below) so the chosen `maxNodes` value sits
  comfortably under the target wall-clock budget on the
  minimum-spec tier.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
  — replace the wall-clock-timeout acceptance criterion with a
  `maxNodes`/`maxDepth` budget keyed by difficulty; demote
  wall-clock to a warn-only watchdog.
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)
  — declare per-difficulty `maxNodes` / `maxDepth` constants.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — extend the "What is deterministic" section to include AI
  search budgets, and explicitly forbid wall-clock-driven
  truncation in any engine code path.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add a `searchBudget: { maxNodes, maxDepth }` field to the AI
   worker's input message; remove the timeout-truncation branch.
2. Author the per-difficulty constants in
   `05-difficulty-levels-pawn-and-knight.md` and reference them
   from `06-run-ai-in-web-worker.md`.
3. Add a determinism unit test: same seed + state + budget on two
   different `setTimeout` rate simulations produces identical
   commands.
4. Add the bench-harness "AI bot match @ minimum-spec" scenario
   (see Critical Fix on bench harness below) to verify the chosen
   `maxNodes` stays under 2 s wall-clock on a slow runner.

**Dependencies:**
- Ride on top of the bench harness (Critical Fix below) for
  validation, but the contract change can land independently.

**Complexity:** M.

---

### Issue: No `docs/architecture/performance.md` (frame / memory / entity budgets)

**Source:** Q164 (⚠), Q165 (❌), Q166 (❌), Q168 (⚠), Q169 (⚠),
Q173 (⚠); Missing Logic bullets 1, 2, 4, 6.

**Problem:**
There is no canonical performance doc. Targets are scattered
across the renderer choice doc, individual task acceptance
criteria, and the cache-strategy diagram. The 16.6 ms frame
envelope has no per-system split (sim step, AI tick, fog-of-war
update, animation tick, snapshot diff, input dispatch, render),
and the asset cache has eviction tiers but no absolute MB ceiling
or per-category split. Adventure-map entity ceilings (heroes,
map objects, active spells, summoned units) are entirely
undeclared.

**Impact:**
- Every implementer reinvents a budget while writing a hot path.
- "Make it fast" / "fix a perf regression" prompts have no
  concrete number to compare against, which is exactly why the
  audit scored AI-Readiness 3 / 10.
- Long campaigns and tablet sessions hit OOM with no defined
  remediation.

**Solution:**
Author `docs/architecture/performance.md` as the single
source of truth, structured as four pinned tables plus rationale:

1. **Hardware tiers** — three rows:
   - **Reference:** GTX 1060 / Apple M1, 16 GB RAM, desktop browser.
     Target **60 FPS** on 200×200 map and 14-stack battle.
   - **Minimum-spec:** Intel HD 620 / Apple A12 (or equivalent),
     8 GB RAM, desktop browser. Target **30 FPS** on 200×200 map
     and 14-stack battle, **60 FPS** on UI screens.
   - **Mobile (deferred):** declared but no implementation in M1.

2. **Per-frame CPU budget** at 60 FPS reference (16.6 ms total):
   - `engine.commandDispatch + reducer step` — 2 ms
   - `engine.ai.tick` (off-thread, but main-thread message handling) — 0.5 ms
   - `engine.fogOfWar.update` — 0.5 ms
   - `engine.snapshotDiff + xxh64` — 1 ms
   - `engine.input.dispatch` — 0.5 ms
   - `renderer.cull + draw` — 4 ms (CPU side)
   - `renderer.animationTick` — 1 ms
   - `ui.react.render + reconcile` — 2 ms
   - `headroom` — 5 ms (uncategorized + spikes)

   At 30 FPS minimum-spec (33.3 ms), every line above is doubled
   except the headroom which becomes 10 ms.

3. **GC / allocation budget** — pinned numerical ceilings:
   - Steady-state allocations: **≤ 64 KB / frame** at reference.
   - Per-turn engine allocations (AI tick excluded): **≤ 256 KB / turn**.
   - GC pause budget: **no single GC pause > 4 ms** at reference.
   - Allocation tracking is enforced via the bench harness using
     `--expose-gc` + `performance.measureUserAgentSpecificMemory()`
     (Chromium) or the Devtools heap API in CI.

4. **Memory budget** (absolute ceiling and per-category split for
   reference tier; minimum-spec is **half** of every line):
   - Total: **1 GB** runtime peak (excludes the JS engine itself).
   - Textures / atlases: **400 MB**
   - Audio: **150 MB**
   - Sim state (incl. fog masks, tile arrays): **150 MB**
   - Save snapshots in memory (autosave staging): **50 MB**
   - UI / DOM / React: **100 MB**
   - Headroom: **150 MB**

5. **Entity ceilings** (largest map, 200×200):
   - Heroes (all players combined): **64**
   - Map objects (mines, mills, dwellings, artefacts, etc.): **2 048**
   - Units in any single stack: **999** (matches gameplay rule)
   - Active stacks in tactical battle: **14** (pinned in renderer task)
   - Simultaneously animating tiles outside battle: **256**
   - Active spells with persistent VFX: **32**
   - Summoned-creature elementals contributing to stack count: capped
     at **+7 stacks** (so battle never exceeds 21 stacks; renderer
     budget is recomputed to absorb +50 % over the documented 14).

The doc declares that **every number above is enforced by the bench
harness** — see the bench-harness Critical Fix below.

**Files to Update:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md)
  — replace the inline 60 FPS target with a single-line link to
  `performance.md`; the renderer doc keeps the rendering-specific
  rationale but defers the numbers to the canonical table.
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md)
  — link the 128×128 / 60 FPS acceptance criterion to the Reference
  tier in `performance.md`.
- [tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md)
  — add a "and 30 FPS on minimum-spec" acceptance criterion.
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md)
  — add the per-frame budget envelope reference.
- [docs/architecture/diagrams/17-cache-strategy.md](../architecture/diagrams/17-cache-strategy.md)
  — replace the % thresholds with the absolute MB caps from
  `performance.md` (% remains as the eviction trigger but the
  meaning of "total used" is now pinned).

**New Files (if needed):**
- `docs/architecture/performance.md` — canonical perf doc.

**Implementation Steps:**
1. Author `docs/architecture/performance.md` with the four tables
   plus rationale.
2. Cross-link from `renderer-technology-choice.md`,
   `determinism.md`, `overview.md`, and the relevant renderer
   task files.
3. Add `performance.md` to the "Read first" list in
   [`CLAUDE.md`](../../CLAUDE.md) so AI implementers always pick
   it up.
4. Update the cache strategy diagram with absolute caps.

**Dependencies:** none — this is the foundation every other fix
references.

**Complexity:** L.

---

### Issue: No worst-case scenario benchmark harness

**Source:** Q177 (⚠); Improvements bullet 3; Risks bullet 1.

**Problem:**
There is no `bench/` or `benchmarks/` folder. The acceptance
criteria of individual renderer tasks ("128×128 @ 60 fps", "battle
≥ 60 fps") are tested manually. No artifact in the repo measures
ms/frame, allocations/frame, or memory peak as a trended metric.

**Impact:**
- Performance regressions land silently — the only feedback is
  "feels janky" during QA.
- Without a harness, every other budget in `performance.md` is
  aspirational rather than enforced.
- The deterministic AI budget cannot be tuned without a
  reproducible AI-vs-AI scenario.

**Solution:**
Add a new task module `tasks/mvp/00-perf/` and an associated
`bench/` runtime folder. The harness exposes three pinned
scenarios:

- **Scenario A — adventure-map stress:** 200×200 generated map,
  scripted camera pan at constant velocity for 30 s, full pan +
  zoom-in + zoom-out cycle. Measures CPU ms/frame, GPU ms/frame,
  allocations/frame, peak heap.
- **Scenario B — tactical battle stress:** 14 unit stacks
  (worst-case mix per balance task), AoE spell cast on turn 3,
  full retaliation chain, run for 50 turns or until victory.
  Measures combat-specific ms/frame and animation count peak.
- **Scenario C — AI bot match:** 100-turn AI-vs-AI on the
  random-map-generator template, two `Knight`-difficulty
  workers. Measures ms/AI-move and total wall-clock to verify the
  deterministic node-budget choice.

Each scenario is run by a headless harness script and emits a
JSON report under `bench/results/`. The harness is invoked by a
new `npm run bench` command and a CI workflow that compares the
report against a checked-in baseline; **a > 10 % regression on any
metric fails CI**.

**Files to Update:**
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
  — cross-link to Scenario C; share fixtures.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add the perf-bench job (gated, runs on `main` and on
  `perf/**` branches; advisory on PRs).
- [docs/architecture/performance.md](../architecture/performance.md)
  — declare the harness as the enforcement mechanism for every
  number in the doc.

**New Files (if needed):**
- `tasks/mvp/00-perf/01-bench-harness.md` — owned paths:
  `bench/`, `bench/scenarios/`, `bench/runner.ts`,
  `bench/results/.gitkeep`. Dependencies:
  `mvp.06-renderer.08-presentation-loop-decoupled-from-sim`,
  `mvp.10-heuristic-ai.06-run-ai-in-web-worker`,
  `mvp.03-map-system.09-random-map-generator-deterministic-runner`.
- `tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md` — owned
  paths: `bench/baseline.json`, `.github/workflows/perf.yml`.

**Implementation Steps:**
1. Author the two new task files.
2. Implement the three scenarios as deterministic seeded fixtures
   so bench results are byte-stable across runs on the same
   hardware tier.
3. Capture a baseline on the reference tier and check it in.
4. Wire the CI job to compare new runs against the baseline with
   a 10 % regression gate.
5. Add a "trend" badge to the README pointing at the latest
   bench artifact.

**Dependencies:**
- Performance doc Critical Fix above (so the harness has numbers
  to enforce).
- Deterministic AI budget Critical Fix above (so Scenario C is
  reproducible).

**Complexity:** L.

---

### Issue: Pathfinder has no cache, no invalidation strategy

**Source:** Q179 (❌); Missing Logic bullet 9; Risks bullet 5.

**Problem:**
[`tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md`](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md)
exposes pure `findPath(...)` and `reachable(...)` and aims for
`< 5 ms / call` on 128×128. The AI threat-map BFS in
[`tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md`](../../tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md)
calls into the pathfinder many times per AI turn. On a 200×200
map with a slow CPU, repeated cold calls can blow the AI budget.

**Impact:**
- AI turns hit the watchdog warning on minimum-spec hardware.
- Hover-to-show-path UX on the adventure map (recomputed every
  hover frame) is the obvious user-visible regression vector.

**Solution:**
Add a per-turn pathfinder cache keyed by
`(mapVersion, srcHex, mpBudget, zocVersion)`. The cache is a
plain `Map<key, Result>`; lookups are O(1). Invalidation is
**explicit**, not time-based:

- Any command that mutates terrain (terraform spell, bridge
  built) bumps `mapVersion`.
- Any hero arrival/departure on a tile bumps `zocVersion`.
- The cache is **flushed at every End-Day turn boundary** as a
  belt-and-braces guard.

Cache effects on determinism are **zero** — `findPath` is pure,
so cache hits return the same value as cache misses. The cache
is therefore safe to ship in the engine layer rather than only
in AI code.

**Files to Update:**
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md)
  — add an "Optional cache" section declaring the key shape, the
  `mapVersion` / `zocVersion` invariants, and the flush-on-End-Day
  rule.
- [tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md](../../tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md)
  — declare that the threat-map BFS uses the shared cache via the
  pathfinder API; do **not** introduce a parallel cache.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — note that memoization of pure pathfinder results is
  determinism-safe and document the invalidation rule.

**New Files (if needed):**
- `tasks/mvp/03-map-system/11-pathfinder-cache.md` — owned paths:
  `src/engine/pathfinder/cache.ts`. Dependencies:
  `mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc`,
  `mvp.01-engine-core.06-command-dispatcher` (for the
  `mapVersion` / `zocVersion` increments).

**Implementation Steps:**
1. Author the new task file with the cache contract.
2. Add `mapVersion` and `zocVersion` to the `GameState` schema
   (additive; default 0).
3. Wire the relevant command reducers to bump these versions.
4. Implement the cache; expose only `getOrCompute(key, fn)`.
5. Add a unit test: cache hits and misses return the same value
   on a fixture map; flushing invalidates as expected.
6. Add a bench-harness measurement: AI turn ms with cache vs
   without on a 200×200 fixture; regression-gate the with-cache
   number.

**Dependencies:**
- Critical Fix on bench harness for the regression measurement.

**Complexity:** M.

---

### Issue: Atlas-generation pipeline is undefined

**Source:** Q172 (⚠); Missing Logic bullet 5; Risks bullet 2.

**Problem:**
The renderer consumes a 512×512 / 32×32 hex atlas and TexturePacker-
style sprite metadata (per
[`docs/architecture/renderer-technology-choice.md:71`](../architecture/renderer-technology-choice.md#L71)
and
[`tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md:8`](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md#L8)).
The **producer side is undocumented**: which tool packs the
atlas, what the input file layout is, where the metadata schema
lives, and whether the AI content pipeline produces atlases
itself or feeds individual frames into the same packer.

**Impact:**
- AI-generated content packs and hand-authored packs can produce
  differently sized / packed sprite sheets, breaking deterministic
  UV sampling.
- Every pack author re-invents a folder convention and a packer
  invocation.
- The pack-publish step is missing a load-bearing artifact, so
  pack hashes (consumed by the load gates in
  [`docs/architecture/diagrams/25-load-flow.md`](../architecture/diagrams/25-load-flow.md))
  are not reproducible across machines.

**Solution:**
Pin **`free-tex-packer-cli`** (Apache-2.0, scriptable, deterministic
given fixed input ordering) as the canonical atlas packer. Define
the input layout, metadata schema, and publish-step invocation:

- **Input layout:** packs ship raw frames under
  `<pack>/sprites/<entityId>/<frame>.png` and an
  `<pack>/atlas-manifest.json` listing every entity to be packed.
- **Output:** the publish step writes
  `<pack>/atlases/<entityId>.png` and
  `<pack>/atlases/<entityId>.atlas.json` (TexturePacker-compatible
  format). Both are content-addressed and contribute to the pack
  hash.
- **Determinism:** input file ordering is sorted lexicographically,
  the packer is invoked with a pinned `--seed`, and the resulting
  atlas bytes are byte-identical across machines for the same
  inputs. This is verified by a CI job.
- **AI content pipeline:** AI-generated frames are written into
  the same `sprites/` layout and packed by the same tool — the AI
  pipeline never produces atlases directly.

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — add an "Atlas generation" section.
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md)
  — declare that AI output is at the per-frame level; atlases
  are produced by the publish step, not the AI step.
- [tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md)
  — link the metadata schema to the new task below.
- [content-schema/](../../content-schema/) — add an `atlas.schema.json`
  for the metadata shape.

**New Files (if needed):**
- `docs/architecture/atlas-pipeline.md` — canonical pipeline doc
  (input layout, packer invocation, determinism contract,
  pack-publish step ordering).
- `tasks/mvp/06-renderer/09-atlas-pipeline.md` — owned paths:
  `tools/atlas/`, `tools/atlas/pack.ts`, `content-schema/atlas.schema.json`.
  Dependencies:
  `mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform`,
  `mvp.06-renderer.06-sprite-sheet-loader-plus-frame-animation`.

**Implementation Steps:**
1. Author `docs/architecture/atlas-pipeline.md`.
2. Author `09-atlas-pipeline.md` with acceptance criteria
   including byte-equal output on two CI machines for an identical
   input fixture.
3. Add the `atlas.schema.json` and a CI fixture `packs/example/`
   with a known-good atlas.
4. Add `npm run pack:build` and wire it into the pack-publish
   step.
5. Add a unit test that packs the fixture and asserts byte-equal
   PNG and JSON outputs.

**Dependencies:** none — can land in parallel with most other fixes.

**Complexity:** M.

---

### Issue: No memory-leak CI gate

**Source:** Q174 (❌); Missing Logic bullet 7; Risks bullet 4.

**Problem:**
The only memory-related acceptance criterion is the per-task
"stopping the loop does not leak the animation frame handle" line
in
[`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:36`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L36),
verified manually. There is no headless heap-snapshot diff, no
`--expose-gc` test, and no per-PR memory regression gate. Long
campaigns and tablet sessions can OOM with no CI signal.

**Impact:**
- A leak introduced by, e.g., an event-listener that is never
  unbound on screen change can ship undetected for weeks.
- Memory regressions become user-visible only at QA time, when
  they are already in `main`.

**Solution:**
Add a CI memory gate as a third bench-harness scenario (Scenario D
— **memory churn**):

- Headless run that opens main menu → adventure map → enters
  battle → returns to map → enters town → exits to main menu.
  Repeats the cycle 50 times.
- Captures a heap snapshot before and after the cycle.
- Asserts the post-cycle heap is within **+5 %** of the pre-cycle
  heap (i.e. no growing leak).
- Asserts no detached DOM nodes accumulate (Chromium DevTools API).
- A **> 5 %** delta fails CI.

This scenario lives alongside the bench-harness scenarios from
the bench Critical Fix.

**Files to Update:**
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md)
  — promote the "no animation-frame handle leak" line to an
  automated assertion in Scenario D.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add the memory-gate job alongside the perf-bench job.

**New Files (if needed):**
- `tasks/mvp/00-perf/03-memory-regression-gate.md` — owned paths:
  `bench/scenarios/memory-churn.ts`, `.github/workflows/memory.yml`.
  Dependencies: `mvp.00-perf.01-bench-harness`.

**Implementation Steps:**
1. Author `03-memory-regression-gate.md`.
2. Implement Scenario D inside the bench harness.
3. Capture a baseline heap snapshot on the reference tier and
   check in the +5 % delta as the gate.
4. Wire to the CI workflow.

**Dependencies:**
- Bench harness Critical Fix (this scenario reuses the runner).

**Complexity:** M.

---

## 3. System Improvements

Grouped by system. None of these block M1 closed-alpha exit, but
each removes ambiguity an AI implementer would otherwise have to
guess at.

### UI / Screens

#### Issue: No in-game profiling overlay

**Source:** Q175 (❌); Improvements bullet 2.

**Problem:**
No in-app profiling/HUD overlay is specified. Developers and QA
must rely on browser devtools, which is unavailable to playtesters
filing bug reports.

**Impact:**
- "Feels janky" bug reports cannot include FPS / ms-per-frame /
  AI compute time data.
- The bench harness reports trends but cannot localize spikes to
  a specific in-game action without an overlay correlating
  player actions to ms-per-frame.

**Solution:**
Add a dev-only profiling overlay screen package toggled by
`Ctrl+Shift+P`. The overlay shows: FPS (ms/frame rolling avg),
draw-call count, allocations/frame (when `--expose-gc` is
available), JS heap used / total, and AI compute time for the
last move. The overlay reads selectors only — no engine writes.
The overlay is gated behind a build flag so it does not ship in
release bundles by default but **can** be enabled in production
builds via a URL parameter for QA / alpha testers.

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
  — add the new screen package to the "Dev tools" group.
- [docs/architecture/performance.md](../architecture/performance.md)
  — declare the overlay as the in-app counterpart to the bench
  harness.

**New Files (if needed):**
- `docs/architecture/wiki/screens/57-dev-profiler/` — full
  five-file screen package (`mockup.html`, `spec.md`,
  `interactions.md`, `data-contracts.md`, `architecture.md`)
  per the package contract in
  [`docs/architecture/wiki/README.md`](../architecture/wiki/README.md).
- `tasks/mvp/00-perf/04-profiling-overlay.md` — owned paths:
  `src/ui/dev/profiler/`. Dependencies:
  `mvp.06-renderer.08-presentation-loop-decoupled-from-sim`.

**Implementation Steps:**
1. Author the screen package.
2. Author the task file with hotkey, selector list, and the
   build-flag / URL-parameter gate.
3. Add the overlay implementation; verify it adds < 0.2 ms/frame
   at reference tier (its own perf is bench-harness-tracked).
4. Run `npm run generate:wiki` to refresh the wiki index.

**Dependencies:** none.

**Complexity:** M.

---

### Data Contracts

#### Issue: Adventure-map concurrent-animation ceiling

**Source:** Q169 (⚠); Missing Logic bullet 3 (entity ceilings).

**Problem:**
Battle and town anim ceilings are pinned (14 stacks × 5 frames in
battle; 10–30 quads / town). The adventure map has **no concurrent
animation ceiling** — heroes idle, mines idle, water ambient,
hero-walk path, spell VFX all stack with no upper bound.

**Impact:**
- A pathological 200×200 map with hundreds of mines + heroes can
  blow the renderer.animationTick budget silently.
- The bench harness has no number to enforce.

**Solution:**
Add an "Adventure-map animation budget" line to the entity-
ceiling table in `performance.md`:

- **Active animations** (any tick this frame, on-screen and
  off-screen combined): ≤ **256**.
- **On-screen active animations** (subset that actually advances
  frames this frame): ≤ **128**.
- Off-screen animations are time-stepped opportunistically (per
  [`docs/architecture/diagrams/22-building-loop.md:39`](../architecture/diagrams/22-building-loop.md#L39))
  and skip frame-advance entirely when over budget.

The ceilings are enforced by the bench harness (Scenario A) and
documented in the renderer task.

**Files to Update:**
- [docs/architecture/performance.md](../architecture/performance.md)
  — extend table 5 ("Entity ceilings") with the two animation
  rows above.
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md)
  — add the on-screen / off-screen animation-count acceptance
  criteria.
- [docs/architecture/diagrams/22-building-loop.md](../architecture/diagrams/22-building-loop.md)
  — link to the adventure-map row.

**New Files (if needed):** none.

**Implementation Steps:**
1. Update the table.
2. Add the renderer acceptance criterion.
3. Add a Scenario A sub-assertion in the bench harness.

**Dependencies:**
- Performance doc Critical Fix.
- Bench harness Critical Fix (for enforcement).

**Complexity:** S.

---

### Schemas

#### Issue: `mapVersion` and `zocVersion` are not in `GameState`

**Source:** Q179 cache fix (above) requires schema fields that
do not yet exist.

**Problem:**
The pathfinder cache key requires `mapVersion` and `zocVersion`
fields on `GameState`. Today, `GameState` does not track either.
Adding them after the cache lands forces a save-format migration;
adding them first is additive.

**Impact:**
- Without these fields, the cache cannot be implemented safely.
- Without an upfront schema change, the cache is forced to scan
  the world to detect changes, which defeats its purpose.

**Solution:**
Add both fields as additive `number` fields with default `0` in
the canonical `GameState` schema. Bump command reducers
(terraform-effect, hero-move, hero-spawn / hero-defeat) to
increment the appropriate counter on every state mutation that
affects path validity.

**Files to Update:**
- [content-schema/](../../content-schema/) — extend the
  `GameState` schema with `mapVersion: number` and
  `zocVersion: number`.
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  — declare the version-bump invariant per affected command kind.
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md)
  — link to the new fields.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add the two fields to the schema as additive defaults.
2. Update the command dispatcher contract.
3. Add a unit test: the increments fire deterministically on a
   fixture command sequence.
4. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:** none.

**Complexity:** S.

---

### Architecture

#### Issue: Object-pooling policy is undeclared

**Source:** Q167 (❌); Improvements bullet 7.

**Problem:**
"Object pools" appears only in the **content** sense (a `World`
schema field). No runtime pool exists for vectors, command
objects, snapshot diffs, particles, or AI search nodes. There is
also no explicit decision **not** to pool, with rationale.

**Impact:**
- Implementers either reinvent ad-hoc pools (inconsistency) or
  allocate freely on hot paths (allocations/frame ceiling missed).
- The audit specifically calls out this gap as a risk for hitting
  the GC pause budget.

**Solution:**
Add an "Allocation policy" section to `performance.md` with two
explicit rules:

1. **Allocate freely** in cold paths (game-state mutation, save,
   load, screen transitions). The 256 KB / turn budget covers
   this.
2. **Pool the following** in hot paths:
   - Hex-coordinate vectors (the renderer per-frame culling pass
     creates thousands).
   - Sprite draw-command objects (one per visible animated tile).
   - AI search nodes (threat-map BFS frontier).
   - Particle / VFX nodes (pool sized to the
     "Active spells with persistent VFX" ceiling × 16).

Each pool is a plain freelist with a fixed initial capacity and
a growth limit; growth past the limit is a **bench-harness
failure**, not a silent allocation. Pools are created at engine
init and never freed.

**Files to Update:**
- [docs/architecture/performance.md](../architecture/performance.md)
  — add the "Allocation policy" section.
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md)
  — declare the renderer-side pools as an acceptance criterion.
- [tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md](../../tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md)
  — declare the AI-search-node pool.

**New Files (if needed):**
- `tasks/mvp/00-perf/05-object-pools.md` — owned paths:
  `src/engine/pool/`. Dependencies:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`.

**Implementation Steps:**
1. Author the performance.md section.
2. Author the task file with the four pool kinds and their
   capacity / growth contracts.
3. Implement the pool primitive.
4. Migrate the renderer culling pass and AI BFS to use pools.
5. Add a bench-harness assertion: pool growth past the configured
   cap fails the run.

**Dependencies:**
- Performance doc Critical Fix.
- Bench harness Critical Fix (for enforcement).

**Complexity:** L.

---

#### Issue: Map streaming policy is implicit

**Source:** Q176 (⚠); Risks bullet 6.

**Problem:**
Maps are fully in memory, with no streaming / chunking. This is a
defensible choice for desktop but goes unstated, so an implementer
on tablet hardware may invent a streaming layer ad-hoc.

**Impact:**
- Tablet OOM on a 200×200 map without recourse.
- Inconsistent decisions across implementers if the assumption is
  not pinned.

**Solution:**
Document the decision. `performance.md` declares:

- M1 ships with **maps fully in memory**, bounded by the entity-
  ceiling table.
- The minimum-spec memory ceiling (500 MB total per the halved
  reference tier) is the binding constraint; 200×200 maps fit
  with headroom under that constraint.
- Streaming is **deferred** until either (a) the bench harness
  shows a 200×200 map exceeding the minimum-spec memory ceiling
  on representative content, or (b) a mobile / tablet target is
  formally added to the hardware-tier table.
- If streaming is added later, it is a **content-runtime change**,
  not an engine change — `src/content-runtime/` gains a
  region-paged tile loader; the engine continues to see
  `GameState.tiles` as a complete typed array.

**Files to Update:**
- [docs/architecture/performance.md](../architecture/performance.md)
  — add the "Map memory: in-memory vs streaming" subsection.
- [tasks/mvp/03-map-system/03-layered-tile-storage.md](../../tasks/mvp/03-map-system/03-layered-tile-storage.md)
  — link the in-memory decision.

**New Files (if needed):** none.

**Implementation Steps:**
1. Add the subsection.
2. Cross-link from the layered-tile-storage task.

**Dependencies:**
- Performance doc Critical Fix.

**Complexity:** S.

---

### Tasks

#### Issue: New `tasks/mvp/00-perf/` module is undeclared

**Source:** Aggregation of multiple Critical Fixes above.

**Problem:**
Several Critical Fixes introduce a new task module (`00-perf/`)
that does not yet exist in
[`tasks/mvp/`](../../tasks/mvp/) or in the task registry.
Without a module index file, `npm run tasks:next` will not pick
up the new tasks.

**Impact:**
- New tasks are invisible to the task-registry generator.
- The validation in `npm run validate:tasks` flags orphaned task
  files.

**Solution:**
Create the module folder and an `_module.md` (or whatever the
existing convention is — match `tasks/mvp/01-engine-core/` and
`tasks/mvp/06-renderer/`). Register the module in the
task-registry source list.

**Files to Update:**
- [tasks/task-registry.json](../../tasks/task-registry.json) —
  regenerate via `npm run generate:task-registry` once the
  module exists.
- [docs/planning/implementation-log.md](../planning/implementation-log.md)
  — log the new module.

**New Files (if needed):**
- `tasks/mvp/00-perf/_module.md` — module description (matching
  the existing module-file convention).
- The five task files declared in Critical Fixes above
  (`01-bench-harness.md`, `02-bench-baseline-and-ci-gate.md`,
  `03-memory-regression-gate.md`, `04-profiling-overlay.md`,
  `05-object-pools.md`).

**Implementation Steps:**
1. Create `tasks/mvp/00-perf/_module.md`.
2. Add the five task files declared above.
3. Run `npm run generate:task-registry`.
4. Run `npm run validate:tasks` and fix any reported issues.

**Dependencies:**
- Each individual Critical Fix that owns a task file in this
  module.

**Complexity:** S (the wrapper); the contained tasks carry the
real complexity declared per-issue.

---

## 4. Suggested Task Breakdown

Convert the issues above into discrete work items. Items prefixed
**[NEW]** are new task files; **[EXT]** items extend an existing
task file via shared owned-paths semantics; **[DOC]** items update
architecture docs only; **[SCREEN]** items are new screen
packages.

- [ ] **[DOC]** Author `docs/architecture/performance.md`
  (hardware tiers, per-frame CPU budget, GC budget, memory
  budget, entity ceilings, allocation policy, map-memory
  decision).
- [ ] **[DOC]** Author `docs/architecture/atlas-pipeline.md`
  (input layout, packer, determinism contract, publish step).
- [ ] **[DOC]** Update [`CLAUDE.md`](../../CLAUDE.md)
  "Read first" list to include `performance.md` and
  `atlas-pipeline.md`.
- [ ] **[DOC]** Update
  [`docs/architecture/determinism.md`](../architecture/determinism.md)
  to forbid wall-clock-driven AI truncation and to document the
  pathfinder-cache invariants.
- [ ] **[DOC]** Update
  [`docs/architecture/renderer-technology-choice.md`](../architecture/renderer-technology-choice.md)
  to defer numeric targets to `performance.md`.
- [ ] **[DOC]** Update
  [`docs/architecture/diagrams/17-cache-strategy.md`](../architecture/diagrams/17-cache-strategy.md)
  with absolute MB caps.
- [ ] **[DOC]** Update
  [`docs/architecture/ai-generation-pipeline.md`](../architecture/ai-generation-pipeline.md)
  to declare AI output as per-frame; atlases produced at publish.
- [ ] **[DOC]** Update
  [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md)
  with an "Atlas generation" section.
- [ ] **[EXT]** `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`
  — replace wall-clock timeout with `searchBudget`; demote
  timer to a warn-only watchdog.
- [ ] **[EXT]** `tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md`
  — declare per-difficulty `maxNodes` / `maxDepth` constants.
- [ ] **[EXT]** `tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md`
  — consume the shared pathfinder cache; use the AI-search-node
  pool.
- [ ] **[EXT]** `tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md`
  — add the cache contract and invalidation rule.
- [ ] **[EXT]** `tasks/mvp/03-map-system/03-layered-tile-storage.md`
  — link the in-memory decision.
- [ ] **[EXT]** `tasks/mvp/01-engine-core/06-command-dispatcher.md`
  — declare `mapVersion` / `zocVersion` increment invariants.
- [ ] **[EXT]** `tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`
  — share fixtures with bench Scenario C; add a `searchBudget`
  determinism case.
- [ ] **[EXT]** `tasks/mvp/01-engine-core/10-github-actions-ci.md`
  — add the perf-bench job and the memory-gate job.
- [ ] **[EXT]** `tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md`
  — add adventure-map animation ceilings; declare renderer-side
  pools.
- [ ] **[EXT]** `tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md`
  — add 30 FPS minimum-spec criterion.
- [ ] **[EXT]** `tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md`
  — link metadata schema to atlas pipeline task.
- [ ] **[EXT]** `tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`
  — link per-frame budget envelope; promote handle-leak check
  to Scenario D.
- [ ] **[EXT]** `content-schema/` — add `mapVersion`,
  `zocVersion` to `GameState`; add `atlas.schema.json`.
- [ ] **[NEW]** `tasks/mvp/00-perf/_module.md` (module index).
- [ ] **[NEW]** `tasks/mvp/00-perf/01-bench-harness.md` (Scenarios
  A/B/C runtime).
- [ ] **[NEW]** `tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md`
  (baseline file + workflow + 10 % regression gate).
- [ ] **[NEW]** `tasks/mvp/00-perf/03-memory-regression-gate.md`
  (Scenario D + 5 % heap-delta gate).
- [ ] **[NEW]** `tasks/mvp/00-perf/04-profiling-overlay.md`
  (Ctrl+Shift+P overlay, build-flag + URL-parameter gate).
- [ ] **[NEW]** `tasks/mvp/00-perf/05-object-pools.md` (vectors,
  draw commands, AI search nodes, VFX nodes).
- [ ] **[NEW]** `tasks/mvp/03-map-system/11-pathfinder-cache.md`
  (per-turn cache, version-keyed invalidation, End-Day flush).
- [ ] **[NEW]** `tasks/mvp/06-renderer/09-atlas-pipeline.md`
  (free-tex-packer-cli, deterministic invocation, byte-equal
  output).
- [ ] **[SCREEN]**
  `docs/architecture/wiki/screens/57-dev-profiler/` — full
  five-file screen package; add to
  [`docs/architecture/wiki/screens/index.json`](../architecture/wiki/screens/index.json)
  under "Dev tools".

---

## 5. Execution Order

Land in this order. Each step's prerequisites are listed in its
issue's "Dependencies" line; the order below honors them.

1. **[DOC]** Author `docs/architecture/performance.md` — every
   subsequent fix references it.
2. **[EXT]** Schema additions (`mapVersion`, `zocVersion`) to
   `GameState` and command-dispatcher invariants — additive,
   unblocks pathfinder cache.
3. **[NEW]** `tasks/mvp/00-perf/_module.md` — registers the new
   module so subsequent task files validate.
4. **[NEW]** `00-perf/01-bench-harness.md` (Scenarios A/B/C) —
   foundation for every numeric enforcement.
5. **[NEW]** `00-perf/02-bench-baseline-and-ci-gate.md` —
   captures a baseline once the harness exists.
6. **[EXT]** Replace wall-clock AI timeout with `searchBudget`
   in `06-run-ai-in-web-worker.md` and add per-difficulty
   constants in `05-difficulty-levels-pawn-and-knight.md` —
   uses Scenario C to validate.
7. **[NEW]** `03-map-system/11-pathfinder-cache.md` and the
   `[EXT]` updates in `04-a-pathfinder-with-terrain-cost-plus-zoc.md`
   and `01-threat-map-bfs-strategic-danger-gradients.md` —
   regression-gated by Scenario C.
8. **[NEW]** `00-perf/05-object-pools.md` and renderer / AI
   `[EXT]` updates that consume the pools — gated by Scenario A
   pool-growth assertion.
9. **[NEW]** `00-perf/03-memory-regression-gate.md` (Scenario D)
   — gated by the bench harness.
10. **[DOC + NEW]** Atlas pipeline (`atlas-pipeline.md`,
    `06-renderer/09-atlas-pipeline.md`) — independent track,
    can run in parallel with steps 4–9.
11. **[SCREEN + NEW]** `57-dev-profiler/` screen package and
    `00-perf/04-profiling-overlay.md` — independent of bench
    harness; can run in parallel with steps 4–9.
12. **[DOC]** Cross-cutting doc updates (renderer-technology-
    choice, cache-strategy diagram, determinism, pack-contract,
    ai-generation-pipeline, CLAUDE.md "Read first" list,
    implementation log). Land last so they reference final
    contracts.

---

## 6. Risks if Not Implemented

- **AI determinism quietly breaks.** The wall-clock timeout
  remains and multiplayer / replay diverge silently between
  fast and slow machines. The fuzz-harness gate becomes flaky
  on CI, and the entire determinism story (the central pillar of
  the architecture) loses its meaning during AI turns. **Highest
  blast radius per line of code.**
- **No frame budget table.** Every implementer reinvents a
  per-system ms allowance. Hot-path regressions land silently
  because there is nothing to compare against.
- **No bench harness.** Every other budget in this plan is
  aspirational. Performance regressions become QA-time discoveries.
- **No memory-leak gate.** Long-session and tablet OOMs ship to
  alpha testers undetected.
- **No profiling overlay.** Bug reports cannot include FPS /
  ms-per-frame / AI compute time. QA cannot localize spikes
  without devtools.
- **No pathfinder cache.** AI turns hit the watchdog warning on
  minimum-spec; hover-to-show-path UX stutters on the adventure
  map.
- **No atlas pipeline.** AI-generated and hand-authored packs
  produce differently-packed sprite sheets, breaking deterministic
  UV sampling and pack hashes.
- **No object-pooling policy.** Hot paths allocate freely; the
  GC budget is missed on minimum-spec hardware.
- **No entity ceilings.** A pathological 200×200 map with hundreds
  of mines / heroes blows the renderer.animationTick budget with
  no documented limit.
- **No memory ceiling.** LRU thresholds remain "% of total used"
  with no absolute cap; tablet OOM crashes will not be caught in
  CI.
- **Map-streaming decision implicit.** A future tablet implementer
  invents a streaming layer ad-hoc, fragmenting the engine
  contract.

---

## 7. AI Implementation Readiness

**Score: 3 / 10** (matches the audit; closing every Critical Fix
in section 2 lifts this to 8 / 10; closing the System Improvements
in section 3 lifts it to 9 / 10).

**Rationale:**

The performance story today has a coherent **headline** — 60 FPS
target, viewport frustum culling, batched per-layer hex draws,
atlas-based sprite sampling, AI in a Web Worker, tiered asset
cache — that an AI implementer can build the renderer task tree
against. But the moment a task asks "is this fast enough?" or
"did I regress something?", there is no answer. The audit's
3 / 10 score reflects that almost every operational performance
contract is missing.

What blocks autonomous execution today is, in order of severity:

1. **A determinism violation hidden inside an AI performance
   knob** — the wall-clock 2 s timeout. This single line of
   contract silently breaks every multiplayer / replay
   guarantee the rest of the architecture is built on. It must
   land first.
2. **No canonical performance doc** — every other fix
   references one.
3. **No bench harness** — every numeric ceiling is
   aspirational without it.
4. **No pathfinder cache** — the AI budget is unenforceable on
   slower hardware without it.
5. **No atlas pipeline** — pack hashes are not reproducible
   across machines without it.
6. **No memory-leak gate** — long-session leaks ship to
   alpha undetected.

Landing the six Critical Fixes in section 2 removes that
authority gap and gives an AI agent concrete numbers to compare
against and a reproducible harness to validate against. The
System Improvements close the remaining ambiguities.
