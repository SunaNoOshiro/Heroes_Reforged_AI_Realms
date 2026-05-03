# Screen 68: Dev Profiler

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Developer-only profiling overlay. Surfaces FPS, per-system CPU
samples, allocations/frame, JS heap usage, AI compute time and
`nodesExpanded` for the last move, and pool occupancy. The
overlay reads selectors only — no engine writes. Toggled with
`Ctrl+Shift+P`. Gated behind `import.meta.env.DEV` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production bundles tree-shake the screen unless
`?dev_profiler=1` is present in the URL (QA / alpha-tester
escape hatch).

This screen is the in-app counterpart to the bench harness owned
by [`tasks/mvp/00-perf/01-bench-harness.md`](../../../../../tasks/mvp/00-perf/01-bench-harness.md).
Bench captures trends; the profiler localizes spikes to in-game
actions.

### Visual Direction
- Internal developer UI. No franchise art, no curated theme; uses
  a dark-amber panel system distinct from the existing debug
  overlay (which is dark-blue), so the two overlays are visually
  separable when both are active.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 9001 per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract)
  — one above the existing debug overlay so both can coexist.
- Non-input-blocking overlay. Read-only readouts only.
  Toggleable via hotkey (`Ctrl+Shift+P`).
- `mockup.html` contains visible UI only. Behaviour and timing
  live in `interactions.md`.

### Component Tree
- DevProfilerOverlay
  - FpsPanel
  - CpuBudgetPanel
  - AllocPanel
  - HeapPanel
  - AiComputePanel
  - PoolOccupancyPanel
  - AnimationCountPanel

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| fps | state.perf.fps | Sliding-window frame rate; UI presentation only. |
| frameMs | state.perf.frameMs | Rolling-average ms / frame at the Reference tier. |
| cpuPerSystem | state.perf.cpuPerSystem | Map of system → ms (matches [`performance.md` § 2](../../../performance.md#2-per-frame-cpu-budget)). |
| allocPerFrame | state.perf.allocPerFrame | Bytes allocated per frame; only populated when `--expose-gc` is available. |
| heap | state.perf.heap | `{ used, total }` from `performance.measureUserAgentSpecificMemory()` or DevTools heap API. |
| aiCompute | state.perf.aiCompute | `{ ms, nodesExpanded, depthReached }` for the last AI move. |
| poolOccupancy | state.perf.pools | Per-pool `{ name, used, capacity, growthCap }`. |
| activeAnimations | state.perf.animations | `{ onScreen, total }` per [`performance.md` § 5](../../../performance.md#5-entity-ceilings). |

### Mechanics Mapping
- The overlay reads diagnostic state only. It never dispatches
  gameplay or replay commands.
- The overlay is a presentation-only consumer; no save/replay
  state is owned here.

### Animation Contract
- No animations. Reduced-motion preserves all readouts as static
  text.

### Acceptance Criteria
- Mockup contains every panel listed in the Component Tree.
- Spec lists every state binding under the `state.perf.*` slice.
- Interactions document the toggle hotkey
  (`Ctrl+Shift+P`), the `import.meta.env.DEV` build-flag gate,
  and the `?dev_profiler=1` URL-parameter escape hatch.
- The overlay does not appear in production builds without the
  URL parameter.
- The overlay does not block input on layers below it.
- Overlay's own per-frame cost is **< 0.2 ms** at the Reference
  tier, verified by the bench harness with the overlay on/off.

### AI Implementation Notes
- Screen slug: `dev-profiler`; system group: `diagnostics`;
  curation marker: `curated-pass-1`.
- Owning task:
  [`tasks/mvp/00-perf/04-profiling-overlay.md`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md).
- All readouts are state selectors; do not call into `src/engine`
  directly from the overlay.
- Build runtime components from this package contract; do not add
  panels not listed in the Component Tree.
