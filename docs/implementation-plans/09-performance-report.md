# Implementation Report: 09 — Performance

> Companion to
> [`docs/implementation-plans/09-performance-plan.md`](./09-performance-plan.md).
> The plan was applied verbatim. Where the plan was ambiguous,
> existing repo patterns were preferred and assumptions are listed
> at the bottom.

## Summary

All six Critical Fixes and four System Improvements from the plan
landed. `npm run validate` passes:

- `validate:links`, `validate:contracts`, `validate:cross-refs`,
  `validate:commands`, `validate:tasks`, `validate:arch`,
  `validate:ui-components`, `validate:animation-budgets`,
  `validate:enums` — all green.
- `npm run generate:task-registry` produces 333 tasks across 25
  modules (was 326 across 24 modules).

## 1. Updated Files

### Architecture docs

- [CLAUDE.md](../../CLAUDE.md)
  Added `performance.md` and `atlas-pipeline.md` to the "Read
  first" list (renumbered subsequent entries).
- [docs/architecture/determinism.md](../architecture/determinism.md)
  Added "AI Compute Budget" section (deterministic `searchBudget`,
  watchdog-only wall clock, ban on wall-clock-driven AI
  truncation) and "Pathfinder Cache Invariants" section
  (`mapVersion` / `zocVersion` keys, explicit invalidation,
  End-Day flush). Extended the "Forbidden in Deterministic Paths"
  list with the wall-clock-AI-truncation ban.
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md)
  "Performance Targets" subsection now defers numeric per-tier
  FPS targets, CPU budget, allocation budget, memory ceilings,
  and entity ceilings to `performance.md`. "Related Files"
  updated.
- [docs/architecture/diagrams/17-cache-strategy.md](../architecture/diagrams/17-cache-strategy.md)
  Anchored the % thresholds to the per-category absolute MB caps
  in `performance.md` § 4. Reference and Minimum-spec totals
  documented.
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md)
  Stage 6 now declares AI output is per-frame; atlases are
  produced at the pack-publish step using the same packer as
  first-party packs.
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  Added "Atlas Generation" section linking to
  `atlas-pipeline.md`.

### Schemas

- [content-schema/schemas/game-state.schema.json](../../content-schema/schemas/game-state.schema.json)
  Additive `mapVersion: integer` and `zocVersion: integer`
  fields with `minimum: 0`, declared in `required`.
- [content-schema/examples/game-state.example.json](../../content-schema/examples/game-state.example.json)
  Added `"mapVersion": 0` and `"zocVersion": 0` so the example
  validates against the updated schema.

### UI component registry

- [content-schema/examples/ui-component-registry.example.json](../../content-schema/examples/ui-component-registry.example.json)
  Added 8 new `debug`-tagged components used by
  `68-dev-profiler`: `AiComputePanel`, `AllocPanel`,
  `AnimationCountPanel`, `CpuBudgetPanel`, `DevProfilerOverlay`,
  `FpsPanel`, `HeapPanel`, `PoolOccupancyPanel`.

### Existing tasks (extension)

- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
  Replaced wall-clock timeout with `searchBudget`; demoted
  wall-clock to a warn-only watchdog; expanded message contracts
  with `nodesExpanded` / `searchDepthReached`; added determinism
  acceptance criterion.
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)
  Declared per-difficulty `maxNodes` / `maxDepth` constants and
  `searchBudgetFor(difficulty, mapDims)` API; added bench
  harness Scenario C cross-check.
- [tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md](../../tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md)
  Added pathfinder-cache and AI-search-node-pool consumption
  acceptance criteria.
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md)
  Added "Optional cache" section pinning the cache-key shape,
  `mapVersion` / `zocVersion` invariants, and End-Day flush rule.
- [tasks/mvp/03-map-system/03-layered-tile-storage.md](../../tasks/mvp/03-map-system/03-layered-tile-storage.md)
  Linked the in-memory map decision to `performance.md`.
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  Declared the `mapVersion` / `zocVersion` increment invariants
  per command kind.
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
  Added `searchBudget` determinism case and shared fixtures with
  bench Scenario C.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  Added the perf-bench job and the memory-gate job; declared
  `Owned Paths (shared)` for `perf.yml` and `memory.yml` with
  primary owners and additive contract.
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md)
  Added adventure-map animation ceilings (256 total / 128
  on-screen) and renderer-side pool acceptance criteria.
- [tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md)
  Added 30 FPS Minimum-spec criterion and 21-stack budget for
  summons.
- [tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md)
  Linked the metadata schema to the new atlas-pipeline task.
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md)
  Promoted the no-handle-leak check to Scenario D and linked the
  per-frame budget envelope.

### Implementation log

- [docs/planning/implementation-log.md](../planning/implementation-log.md)
  Added a "Performance Plan Implementation (2026-05-03)" section
  summarising the changes.

## 2. New Files

### Architecture docs

- [docs/architecture/performance.md](../architecture/performance.md)
  Canonical performance doc: hardware tiers, per-frame CPU
  budget, GC budget, allocation policy, memory budget, entity
  ceilings, AI compute budget, profiling-overlay reference,
  enforcement contract.
- [docs/architecture/atlas-pipeline.md](../architecture/atlas-pipeline.md)
  Atlas-generation pipeline pinning `free-tex-packer-cli`,
  deterministic invocation, input layout, output layout, AI
  pipeline integration, publish-step ordering.

### Schemas

- [content-schema/schemas/atlas.schema.json](../../content-schema/schemas/atlas.schema.json)
  Atlas-manifest schema (`packId`, `packerOptions` with pinned
  `seed` / `maxPageSize` / `padding`, per-entity `frameSourcesGlob`).

### Task module

- [tasks/mvp/00-perf.md](../../tasks/mvp/00-perf.md)
  Module index — 5 task files, M1 milestone.
- [tasks/mvp/00-perf/01-bench-harness.md](../../tasks/mvp/00-perf/01-bench-harness.md)
  Scenarios A/B/C runtime; owned paths under `bench/`.
- [tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md](../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md)
  Baseline file + workflow + 10 % regression gate.
- [tasks/mvp/00-perf/03-memory-regression-gate.md](../../tasks/mvp/00-perf/03-memory-regression-gate.md)
  Scenario D + 5 % heap-delta gate.
- [tasks/mvp/00-perf/04-profiling-overlay.md](../../tasks/mvp/00-perf/04-profiling-overlay.md)
  Ctrl+Shift+P overlay; build-flag + URL-parameter gate.
- [tasks/mvp/00-perf/05-object-pools.md](../../tasks/mvp/00-perf/05-object-pools.md)
  Vector / draw-command / AI-node / VFX-node pools.

### New task files in existing modules

- [tasks/mvp/03-map-system/11-pathfinder-cache.md](../../tasks/mvp/03-map-system/11-pathfinder-cache.md)
  Per-turn pathfinder cache; `getOrCompute(key, fn)` API;
  version-keyed invalidation; End-Day flush.
- [tasks/mvp/06-renderer/09-atlas-pipeline.md](../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
  `tools/atlas/pack.ts` + pinned `free-tex-packer-cli`
  invocation; byte-equal CI fixture.

### Screen package

- [docs/architecture/wiki/screens/68-dev-profiler/](../architecture/wiki/screens/68-dev-profiler/)
  Five-file package: `mockup.html`, `spec.md`, `interactions.md`,
  `data-contracts.md`, `architecture.md`. Registered under the
  `diagnostics` group in
  [`screens/index.json`](../architecture/wiki/screens/index.json).

## 3. Assumptions

- ⚠️ Assumption: The plan literally specified
  `docs/architecture/wiki/screens/57-dev-profiler/`, but
  `57-high-scores/` already exists (numbering is sequential and
  immutable per the existing wiki layout). Used the next
  available number `68-dev-profiler/` instead. The plan also
  said to add it to a "Dev tools" group, but the existing
  `screens/index.json` has no such group; placed it in the
  existing `diagnostics` group alongside `66-debug-overlay` and
  `67-animation-debug-overlay`.
- ⚠️ Assumption: The plan said the new task module index file
  should be `tasks/mvp/00-perf/_module.md`, but the existing
  convention (visible in
  [`tasks/mvp/00-core-architecture.md`](../../tasks/mvp/00-core-architecture.md),
  [`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md),
  etc.) is to put the module index file at
  `tasks/mvp/<module-name>.md` as a sibling to the
  `tasks/mvp/<module-name>/` directory. Followed the existing
  convention; created `tasks/mvp/00-perf.md`.
- ⚠️ Assumption: The plan wrote the new schema path as
  `content-schema/atlas.schema.json` (top level), but the
  existing convention is that all schemas live under
  `content-schema/schemas/`. Placed the schema at
  `content-schema/schemas/atlas.schema.json` and updated all
  references accordingly.
- ⚠️ Assumption: The plan said the perf-bench / memory-gate
  jobs should land "alongside the perf-bench job" in
  `.github/workflows/perf.yml` and `.github/workflows/memory.yml`.
  The existing `mvp.01-engine-core.10-github-actions-ci` task
  did not own those workflow paths. Treated those workflow
  paths as `Owned Paths (shared)` on the CI task with primary
  ownership held by the new `00-perf` tasks
  (02-bench-baseline-and-ci-gate, 03-memory-regression-gate),
  and added the additive / rewrite-guard / primary-owner lines
  required by `validate:tasks`.
- ⚠️ Assumption: Per-difficulty AI search-budget constants
  (`pawn`: `maxNodes 4 000`, `maxDepth 3`; `knight`: `maxNodes
  16 000`, `maxDepth 5`) are placeholders for the difficulty
  task. The exact numbers are tuned against bench-harness
  Scenario C on the Minimum-spec emulation profile; the plan
  did not pin specific values, so these are the simplest
  defaults that match the audit's intent (Knight ≈ 4× Pawn) and
  fit the 2 s wall-clock watchdog target.
- ⚠️ Assumption: The pathfinder-cache task's regression gate
  uses "AI turn ms ≥ 30 % faster with cache" as the
  bench-harness pass criterion. The plan called for a
  regression-gate measurement but did not pin a percentage;
  30 % is a conservative threshold that should be easily
  cleared by an O(1) cache hit replacing repeated A* runs.

## 4. Blockers

None. Every Critical Fix and System Improvement landed; full
validation passes.

---

## Verification

- `npm run generate:task-registry` — wrote 333 tasks and 25
  modules.
- `npm run validate` — all sub-commands green.
- `npm run tasks:show -- mvp.00-perf.01-bench-harness` — task
  registered and discoverable.
