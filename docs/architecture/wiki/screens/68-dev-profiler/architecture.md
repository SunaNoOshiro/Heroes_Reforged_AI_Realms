# Screen 68 Architecture: Dev Profiler

System: diagnostics
Screen ID: dev-profiler
Visual Archetype: diagnostics-overlay
Curation Status: curated-pass-1

## Purpose
Developer-only profiling overlay. Read-only.

## Visual Direction
- Internal developer UI. No franchise art, no curated theme.

## Visual Composition
```mermaid
flowchart TD
  Root["Dev Profiler Overlay"]
  P0["FpsPanel"]
  Root --> P0
  P1["CpuBudgetPanel"]
  Root --> P1
  P2["AllocPanel"]
  Root --> P2
  P3["HeapPanel"]
  Root --> P3
  P4["AiComputePanel"]
  Root --> P4
  P5["PoolOccupancyPanel"]
  Root --> P5
  P6["AnimationCountPanel"]
  Root --> P6
```

## Build-Flag Gate
```mermaid
flowchart LR
  B0["Bundle build"] --> B1
  B1{"import.meta.env.DEV?"} -- yes --> B2["dynamic import: DevProfilerOverlay"]
  B1 -- no --> B3{"URL contains ?dev_profiler=1?"}
  B3 -- yes --> B2
  B3 -- no --> B4["screen tree-shaken"]
  B2 --> B5["mount under z-layer 9001 portal"]
  B4 --> B6["no overlay in PROD bundle"]
```

## Subscription Cadence
```mermaid
flowchart LR
  RAF["renderer rAF"] --> Fps["state.perf.fps"]
  RAF --> FrameMs["state.perf.frameMs"]
  Instr["per-system instrumentation"] --> Cpu["state.perf.cpuPerSystem"]
  GC["--expose-gc sampler"] --> Alloc["state.perf.allocPerFrame"]
  Heap["heap measurement (1 Hz)"] --> HeapState["state.perf.heap"]
  AiWorker["AI worker move-result message"] --> Ai["state.perf.aiCompute"]
  Pools["pool occupancy selectors"] --> PoolState["state.perf.pools"]
  Renderer["animation count"] --> Anim["state.perf.animations"]
  Fps --> Subs["overlay selectors"]
  FrameMs --> Subs
  Cpu --> Subs
  Alloc --> Subs
  HeapState --> Subs
  Ai --> Subs
  PoolState --> Subs
  Anim --> Subs
```

## Outgoing Transitions
- None. The overlay does not navigate. Hiding it returns input
  to the underlying layer.

## State Inputs
- fps -> state.perf.fps
- frameMs -> state.perf.frameMs
- cpuPerSystem -> state.perf.cpuPerSystem
- allocPerFrame -> state.perf.allocPerFrame
- heap -> state.perf.heap
- aiCompute -> state.perf.aiCompute
- poolOccupancy -> state.perf.pools
- activeAnimations -> state.perf.animations

## Implementation Contract
- Screen is dynamically imported only when
  `import.meta.env.DEV === true` or when
  `?dev_profiler=1` is present on the URL.
- Overlay reads diagnostics state; it never mutates gameplay
  state, never dispatches commands.
- Z-layer 9001; non-input-blocking; one above the
  `66-debug-overlay` so both can coexist.
- Localization keys live under `ui.dev-profiler.*`.
- Owning task:
  [`tasks/mvp/00-perf/04-profiling-overlay.md`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md).
- Source of every numeric ceiling shown in the overlay:
  [`docs/architecture/performance.md`](../../../performance.md).
