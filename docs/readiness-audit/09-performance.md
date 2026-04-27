# 9. PERFORMANCE

### Q: 164. What is the target FPS on minimum-spec hardware?

**Status:** ⚠ Partial

**Answer:**
The renderer targets **60 FPS** in all gameplay contexts (adventure map
pan/zoom, tactical battle with 14 unit stacks, building idle loops),
which is the de-facto minimum-spec FPS target. The reference baseline
hardware called out in the task acceptance criteria is a **mid-range
laptop (GTX 1060 / Apple M1 equivalent)** for a 128×128 map. There is
**no separately defined "minimum-spec" tier** with its own (e.g. 30 FPS)
target — the docs treat 60 FPS as the single bar.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:82-86](../architecture/renderer-technology-choice.md#L82-L86) — 60 FPS map + battle targets, 0.1 ms GPU headroom
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md:36](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md#L36) — 128×128 @ 60 fps on GTX 1060 / M1
- [tasks/mvp/06-renderer/04-camera-pan-zoom-clamp-to-map-bounds.md:31](../../tasks/mvp/06-renderer/04-camera-pan-zoom-clamp-to-map-bounds.md#L31) — pan ≥ 60 fps
- [tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md:36](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md#L36) — battle ≥ 60 fps
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:35](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L35) — 60 fps even when sim paused
- ❌ No explicit minimum-spec hardware spec (CPU/GPU floor, RAM floor, mobile-class device)

---

### Q: 165. What is the per-frame CPU budget, broken down by system?

**Status:** ❌ UNKNOWN

**Answer:**
No system-by-system per-frame CPU budget exists. The only quantitative
budget noted is **0.1 ms GPU time per frame** in the renderer choice
doc. Engine systems (sim step, AI tick, fog-of-war update, animation
timeline tick, input dispatch, snapshot diffing) have **no published
ms-budget split** of the 16.6 ms frame envelope.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:86](../architecture/renderer-technology-choice.md#L86) — 0.1 ms GPU only
- ❌ No `docs/architecture/performance.md` or per-system frame budget table
- ❌ No CPU breakdown in `tasks/mvp/01-engine-core/` or `tasks/mvp/06-renderer/`

---

### Q: 166. What is the GC budget, and is allocation per frame measured?

**Status:** ❌ UNKNOWN

**Answer:**
No GC/allocation budget is defined and there is no measurement
infrastructure planned. The repo states "memoize tile positions (no
recalculation per frame)" as a guideline, but does not quantify
acceptable bytes/frame, GC pause budget, or how allocations would be
counted in CI.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:94](../architecture/renderer-technology-choice.md#L94) — memoize tile positions (qualitative)
- ❌ No GC budget in any architecture doc
- ❌ No allocation-tracking task in `tasks/mvp/`

---

### Q: 167. Are object pools used for hot allocations?

**Status:** ❌ UNKNOWN

**Answer:**
No. The phrase "object pools" appears in the codebase only in the
**content/world** sense (a `World` schema field listing terrain object
pools for map generation), not in the **runtime/perf** sense (reusable
instance pools for vectors, snapshots, command objects, particle/VFX
nodes). No engine or renderer task references pooling for hot paths.

**Evidence:**
- [docs/architecture/content-platform.md:21](../architecture/content-platform.md#L21) — "object pools" = content concept
- [docs/architecture/schema-matrix.md:37](../architecture/schema-matrix.md#L37) — same content meaning
- ❌ No runtime pooling documented in renderer, engine, AI, or animation tasks

---

### Q: 168. What is the maximum entity count on the largest map?

**Status:** ⚠ Partial

**Answer:**
Map dimensions are bounded — the renderer must support **up to 200×200
hexes** on the adventure map and the tactical grid is **11×15**. Per-
town building counts are noted as **~10–30 quads**. However, **no
maximum is defined for**: heroes, armies, map objects (mines, mills,
artefacts), units in a stack, simultaneous active spells, or total
gameplay entities on the largest map.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:12](../architecture/renderer-technology-choice.md#L12) — 200×200 hexes
- [docs/architecture/renderer-technology-choice.md:14](../architecture/renderer-technology-choice.md#L14) — 11×15 tactical
- [docs/architecture/diagrams/22-building-loop.md:36](../architecture/diagrams/22-building-loop.md#L36) — ~10–30 quads/town
- [tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md:36](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md#L36) — 14 active stacks (battle)
- ❌ No documented adventure-map entity ceiling

---

### Q: 169. What is the maximum simultaneous animation count?

**Status:** ⚠ Partial

**Answer:**
Implicit caps only. In **battle**, up to **14 unit stacks × 5
frames/sprite** must animate at 60 FPS. In **towns**, **~10–30 building
loop quads** per town. Off-screen building animations are explicitly
**skipped** (viewport gate). On the **adventure map**, no maximum
simultaneous animation count is stated (heroes idle, mines idle, water
ambient, hero-walk path, spell VFX).

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:84](../architecture/renderer-technology-choice.md#L84) — 7 stacks × 5 frames in original line; renderer task pins 14 stacks
- [tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md:36](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md#L36) — 14 active stacks
- [docs/architecture/diagrams/22-building-loop.md:36-39](../architecture/diagrams/22-building-loop.md#L36-L39) — 10–30 quads, off-screen skip
- ❌ No global concurrent-animation ceiling for the adventure map

---

### Q: 170. How is map rendering culled — tile-based, viewport, BVH?

**Status:** ✔ Defined

**Answer:**
**Viewport-based frustum culling.** The renderer iterates only the hex
tiles whose axial→screen transform falls inside the current camera view
matrix; off-screen tiles, off-screen unit sprites, and off-screen
building animations are skipped. There is no BVH/quadtree — the hex
grid is uniform so a viewport range query is sufficient.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:93](../architecture/renderer-technology-choice.md#L93) — "Batch hex renders (frustum culling by viewport)"
- [docs/architecture/diagrams/22-building-loop.md:39](../architecture/diagrams/22-building-loop.md#L39) — off-screen buildings skip animation update
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md) — viewport-bounded layered rendering

---

### Q: 171. Are tiles batched into draw calls?

**Status:** ✔ Defined

**Answer:**
Yes. The renderer uses a single tile-atlas texture and **batches hex
renders** into per-layer draw calls (terrain layer, fog layer, object
layer, unit layer, UI layer). Building idle animations are noted to be
collapsible to **a single GPU draw call** when they share the atlas.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:56-67](../architecture/renderer-technology-choice.md#L56-L67) — layered rendering
- [docs/architecture/renderer-technology-choice.md:93](../architecture/renderer-technology-choice.md#L93) — batch hex renders
- [docs/architecture/diagrams/22-building-loop.md:37](../architecture/diagrams/22-building-loop.md#L37) — "1 GPU draw call possible"

---

### Q: 172. Is texture atlasing used, and how are atlases generated?

**Status:** ⚠ Partial

**Answer:**
Yes, atlases are first-class. The hex tile atlas is a **PNG sprite
sheet (512×512) with 32×32 hex tiles**, and unit sprite sheets ship
with **JSON metadata in TexturePacker-style format**. Towns use a
**single PNG with all buildings**.

What is **not specified**: the atlas-generation pipeline itself —
whether atlases are authored manually, packed by an offline tool
(TexturePacker/free-tex-packer), generated as part of the AI content
pipeline, or built at pack-publish time. There is no `atlas.json`
schema or generator task.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:71](../architecture/renderer-technology-choice.md#L71) — 512×512 / 32×32 atlas
- [tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md:8](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md#L8) — TexturePacker-style metadata
- [docs/architecture/diagrams/15-enter-town.md:40](../architecture/diagrams/15-enter-town.md#L40) — single town atlas PNG
- ❌ No atlas-generation tooling/pipeline doc or task

---

### Q: 173. What is the memory budget, total and per category?

**Status:** ⚠ Partial

**Answer:**
There are **eviction thresholds** (70 % / 90 % of "total used") in the
asset cache strategy, with tiers Pinned / Hot / Warm / Cold — but the
**absolute memory ceiling is not numerically defined** (no MB/GB
target), nor is there a per-category budget split (textures vs audio
vs sim state vs save snapshots vs UI).

**Evidence:**
- [docs/architecture/diagrams/17-cache-strategy.md:17-39](../architecture/diagrams/17-cache-strategy.md#L17-L39) — pressure thresholds + tiers, no absolute number
- ❌ No `memory-budget.md` or numeric budget per asset class

---

### Q: 174. How is memory leakage detected in CI?

**Status:** ❌ UNKNOWN

**Answer:**
No memory-leak detection in CI. The only relevant lifecycle assertion
is the renderer task requirement that "stopping the loop (page hide,
component unmount) does not leak the animation frame handle" — verified
manually, not by CI. There is no heap-snapshot diffing, no `--expose-gc`
test, no headless-browser memory regression gate.

**Evidence:**
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:36](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L36) — handle-leak acceptance criterion
- ❌ No CI workflow file or test that targets memory regressions

---

### Q: 175. Is there a profiling overlay, and how is it toggled?

**Status:** ❌ UNKNOWN

**Answer:**
No in-game profiling/HUD overlay (FPS, draw calls, ms/frame, heap
size, AI compute time) is specified. Acceptance criteria mention
"profiling shows zero calls into `src/engine` from the rAF callback",
but that refers to **external profilers** (devtools), not an in-app
overlay.

**Evidence:**
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:34](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L34) — uses external profiling
- ❌ No `ui.dev.profiler` screen / spec / hotkey

---

### Q: 176. Are large maps streamed or fully in memory?

**Status:** ⚠ Partial

**Answer:**
Maps are **fully in memory**. A 200×200 hex map is the upper bound and
fits comfortably as a typed-array tile store; streaming/chunking is
**not** part of the architecture. Asset *streaming* exists for
sprites/textures via the LRU cache, but tile data, fog masks, and
object placements are loaded whole. No map paging or region-based
swapping is documented.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:12](../architecture/renderer-technology-choice.md#L12) — single 200×200 grid
- [docs/architecture/diagrams/17-cache-strategy.md](../architecture/diagrams/17-cache-strategy.md) — cache is for *assets*, not map state
- ❌ No streaming/chunking task in `tasks/mvp/03-map-system/`

---

### Q: 177. What is the worst-case combat scenario benchmark?

**Status:** ⚠ Partial

**Answer:**
The implicit worst case is **14 unit stacks active on the 11×15
tactical grid at 60 FPS**, animating idle/attack/death frames from the
sprite atlas. There is no explicit benchmark for: many simultaneous AoE
spell VFX, full retaliation chains, summoned creature elementals
inflating stack count above 14, or longest deterministic battle
duration. No automated bench harness exists.

**Evidence:**
- [tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md:36](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md#L36) — 14-stack 60 fps acceptance
- ❌ No `bench/` or `benchmarks/` worst-case battle scenario

---

### Q: 178. Are AI computations time-sliced or run to completion?

**Status:** ✔ Defined

**Answer:**
**Run to completion in a Web Worker, with a 2-second hard timeout.**
All AI work is moved off the main thread; the worker computes a single
move and posts back. If it exceeds 2 s, it returns the **best move
found so far** (graceful timeout, not a hang). No explicit per-call
time-slicing inside the worker — the timeout is the slicing mechanism
from the UI's perspective.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:8](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L8) — ~200 ms typical
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:36-39](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L36-L39) — UI responsive, 2 s timeout returns best-so-far

---

### Q: 179. Is pathfinding cached, and how is the cache invalidated?

**Status:** ❌ UNKNOWN

**Answer:**
**Not cached.** The pathfinder exposes pure functions
(`findPath(...)` and `reachable(...)`) that recompute on every call;
the acceptance criterion is "< 5 ms on a 128×128 map" per call, so the
design relies on raw speed rather than memoization. There is no
documented cache layer, and therefore no invalidation strategy. The AI
threat-map BFS uses the pathfinder but does not store reusable path
data between turns.

**Evidence:**
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md:24-25](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md#L24-L25) — pure functions
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md:38](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md#L38) — < 5 ms target, no cache mentioned
- ❌ No `src/engine/path-cache.ts` planned or invalidation rules

---

## 🔍 Summary

### Missing Logic
- **No system-level per-frame CPU budget** (Q165). Engine, AI tick,
  fog-of-war, animation, and snapshot serialization share an undeclared
  16.6 ms envelope.
- **No GC / allocation budget**, no per-frame allocation measurement
  (Q166).
- **No runtime object pooling** for vectors, command objects, snapshot
  diffs, particles, AI search nodes (Q167).
- **No global entity ceilings** for adventure-map heroes / map objects
  / units / active spells (Q168, Q169).
- **No atlas-generation pipeline** — atlases are consumed but their
  origin is undefined (Q172).
- **No absolute memory ceiling** in MB/GB and no per-category split
  (Q173).
- **No memory-leak CI gate** and **no in-game profiling overlay**
  (Q174, Q175).
- **No worst-case combat benchmark suite** (Q177).
- **No pathfinder cache** and therefore no invalidation strategy (Q179).

### Risks
- **Performance cliffs are invisible until QA.** Without per-system
  budgets, profiling overlay, or CI memory gates, regressions land
  silently. By the time an AI move + animation tick + UI re-render
  collide on a 200×200 map, the only feedback is "feels janky".
- **Atlas pipeline drift.** Because atlas generation is unspecified,
  AI-generated content packs and hand-authored packs may produce
  differently sized/packed sprite sheets, breaking deterministic UV
  sampling.
- **AI worker timeout vs determinism.** A 2-second "best so far"
  timeout makes AI output a function of wall-clock CPU speed → two
  identically-seeded clients running on different hardware can produce
  different commands. This is a **direct multiplayer / replay risk**.
- **No memory ceiling on a long campaign.** With LRU thresholds
  expressed only as "% of total used", the actual peak is whatever the
  device permits — tablet OOM crashes will not be caught in CI.
- **Pathfinder hot-path.** `< 5 ms` per call sounds safe, but threat-
  map BFS calls it many times per AI turn on a 200×200 map; without
  caching, the worker timeout could be hit on slower devices.
- **Map fully in memory** caps real-world map size below the
  documented 200×200 on memory-constrained tablets.

### Improvements
1. Author **`docs/architecture/performance.md`** with: minimum-spec
   hardware tier, frame budget table per system, GC budget, memory
   budget per category (textures/audio/sim/save/UI), and atlas-
   generation pipeline.
2. Add an **in-game profiling overlay** (FPS, ms/frame, draw calls,
   heap, AI compute time) toggled by a hotkey — feeds both QA and
   player bug reports.
3. Add a **worst-case scenario benchmark harness** (`bench/`) covering:
   200×200 map full pan + zoom, 14-stack battle with AoE VFX,
   100-turn AI bot match. Publish ms/frame and allocations/turn as a
   trended metric.
4. Replace the **wall-clock AI timeout** with a deterministic
   *iteration / node-count* budget so MP determinism survives slow
   hardware.
5. Introduce a **path cache** keyed by (mapVersion, srcHex,
   mpBudget, zocVersion) and invalidated whenever the map mutates
   (terrain change spell, hero arrival/departure for ZoC). Even a
   per-turn cache flush is a big win.
6. Add a **CI memory regression gate** — headless run + heap snapshot
   diff between two known checkpoints (start of turn → end of AI turn).
7. Specify **object pooling** (or an explicit "we rely on V8 GC"
   decision with rationale) for renderer hot paths and AI search.
8. Specify the **atlas-generation pipeline** (TexturePacker CLI,
   free-tex-packer, custom packer) and pin it as part of the pack
   publish step.

### AI-Readiness
Score: **3/10**

Reason: Top-level renderer targets (60 FPS, viewport culling, batched
draws, atlas usage, AI in a Web Worker, asset cache tiers) are
documented well enough for an AI implementer to start. **Everything
else under "performance" is missing**: no CPU/memory/GC budgets, no
profiling tooling, no benchmark harness, no pooling story, no path
cache, no memory CI gate, no atlas pipeline, no minimum-spec definition,
and the only AI timeout is wall-clock — which silently breaks the
determinism guarantee that the rest of the architecture is built on.
An AI agent asked to "make it fast" or "fix a perf regression" today
has no concrete budget to compare against and no harness to validate
against, so it would either guess or refuse.
