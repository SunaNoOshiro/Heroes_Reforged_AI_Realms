# Screen 68: Dev Profiler

## Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Description

Developer-only profiling overlay. Surfaces FPS, per-system CPU
samples, allocations / frame, JS heap usage, AI compute time plus
`nodesExpanded` for the last move, pool occupancy, and the active
animation count. Selectors only — no engine writes, no gameplay
commands, no save / replay surface.

Toggled with `Ctrl+Shift+P`. Gated behind `import.meta.env.DEV` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production bundles tree-shake the screen unless `?dev_profiler=1` is
present in the URL (QA / alpha-tester escape hatch).

This screen is the in-app counterpart to the bench harness owned by
[`tasks/mvp/00-perf/01-bench-harness.md`](../../../../../tasks/mvp/00-perf/01-bench-harness.md):
bench captures trends; the profiler localizes spikes to in-game
actions. Numeric ceilings rendered here trace to
[`performance.md` § 7](../../../performance.md#7-in-game-profiling-overlay).

## Visual Contract

- **Curation status:** `curated-pass-1`.
- **Visual direction:** internal developer UI; no franchise art, no
  curated theme. Dark-amber panel system, distinct from the dark-blue
  `66-debug-overlay` so both diagnostic overlays remain visually
  separable when co-displayed.
- **Z-Layer:** 9001 — one above the existing debug overlay (9000)
  per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- **Input policy:** non-input-blocking; read-only readouts only.
  Toggled via the hotkey `Ctrl+Shift+P` (W3C `KeyboardEvent.code`
  `Control+Shift+KeyP` per [`ui-hotkeys.md`](../../../ui-hotkeys.md)).
- [`mockup.html`](./mockup.html) contains visible UI only. Behaviour
  and timing live in [`interactions.md`](./interactions.md); selector
  shapes in [`data-contracts.md`](./data-contracts.md).

## Component Tree

- `DevProfilerOverlay`
  - `FpsPanel`
  - `CpuBudgetPanel`
  - `AllocPanel`
  - `HeapPanel`
  - `AiComputePanel`
  - `PoolOccupancyPanel`
  - `AnimationCountPanel`

## State Bindings

| Element | Bound to | Notes |
| --- | --- | --- |
| `fps` | `state.perf.fps` | Sliding-window frame rate; presentation only. |
| `frameMs` | `state.perf.frameMs` | Rolling-average ms / frame at the Reference tier. |
| `cpuPerSystem` | `state.perf.cpuPerSystem` | Map system → ms; matches [`performance.md` § 2](../../../performance.md#2-per-frame-cpu-budget). |
| `allocPerFrame` | `state.perf.allocPerFrame` | Bytes / frame; populated only when `--expose-gc` is available, else `null`. |
| `heap` | `state.perf.heap` | `{ used, total }` from `performance.measureUserAgentSpecificMemory()` or the DevTools heap API. |
| `aiCompute` | `state.perf.aiCompute` | `{ ms, nodesExpanded, depthReached }` for the last AI move; `null` until the first move completes. |
| `poolOccupancy` | `state.perf.pools` | Per-pool `{ name, used, capacity, growthCap }`; warn colour when at cap. |
| `activeAnimations` | `state.perf.animations` | `{ onScreen, total }` per [`performance.md` § 5](../../../performance.md#5-entity-ceilings). |
| `overlayVisible` | `state.perf.overlayVisible` | Toggled by the `Ctrl+Shift+P` action (`devProfiler.toggleVisibility`); default `false`. |

## Mechanics Mapping

- Selectors only. The overlay never dispatches gameplay or replay
  commands; it owns no save / replay surface.
- The only writable slice is `state.perf.overlayVisible`, set by the
  `local-ui` toggle action defined in [`interactions.md`](./interactions.md).

## Animation Contract

- No animations. Reduced-motion preserves every readout as static
  text.

## Acceptance Criteria

- [`mockup.html`](./mockup.html) contains every panel listed in the
  Component Tree.
- This spec lists every state binding under the `state.perf.*` slice.
- [`interactions.md`](./interactions.md) documents the toggle hotkey
  (`Ctrl+Shift+P`), the `import.meta.env.DEV` build-flag gate, and
  the `?dev_profiler=1` URL escape hatch.
- The overlay does not appear in production builds without the URL
  parameter.
- The overlay does not block input on layers below it.
- The overlay's own per-frame cost is **< 0.2 ms** at the Reference
  tier, verified by the bench harness with the overlay on vs off
  (Scenario A; see
  [`performance.md` § 7](../../../performance.md#7-in-game-profiling-overlay)
  and the owning task's Acceptance Criteria).

## AI Implementation Notes

- Screen slug: `dev-profiler`; system group: `diagnostics`; curation
  marker: `curated-pass-1`.
- Owning task: [`tasks/mvp/00-perf/04-profiling-overlay.md`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md).
- All readouts are state selectors; do not call into `src/engine`
  directly from the overlay.
- Build runtime components from this package contract; do not add
  panels that are not in the Component Tree.

---

## 🔍 Sync Check

- **UI: ✔** — Component Tree matches the seven `data-component` rects
  in [`mockup.html`](./mockup.html); State Bindings match
  [`data-contracts.md`](./data-contracts.md) § Runtime State Selectors
  and [`architecture.md`](./architecture.md) § State Inputs; toggle
  copy matches [`interactions.md`](./interactions.md) § Actions.
  Numeric ceiling references (`performance.md` §§ 2, 5, 7) resolve.
- **Schema: ✔** — The only schema consumed by the package
  ([`ui-component-registry.schema.json`](../../../../../content-schema/schemas/ui-component-registry.schema.json))
  resolves each Component-Tree entry to a runtime constructor via
  `componentId` + `module` + `exportName`. No other schema is
  referenced by this screen.
- **Tasks: ✔** — Owning task
  [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md)
  reads this file under `Read First`, pins the panel set, `< 0.2 ms`
  self-cost, and `?dev_profiler=1` escape hatch in its Acceptance
  Criteria, and lists the producer dependencies
  ([`mvp.06-renderer.08-presentation-loop-decoupled-from-sim`](../../../../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md),
  [`mvp.10-heuristic-ai.06-run-ai-in-web-worker`](../../../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md),
  [`mvp.00-perf.05-object-pools`](../../../../../tasks/mvp/00-perf/05-object-pools.md)).

## ⚠ Issues

- **Z-layer 9001 has no row in
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).**
  The contract pins Debug overlay = 9000 and Synchronizing overlay =
  9500 and forbids "new layer indices outside the Z-Stack Contract".
  Mirrored from sibling
  [`architecture.md`](./architecture.md#⚠-issues). Owner:
  [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md)
  must propose the row via the UI-shell owner. Skill did not edit
  `ui-technology-choice.md` (Hard Prohibition D).
- **`state.perf.*` slice is not registered in
  [`data-inventory.md`](../../../data-inventory.md).** Mirrored from
  sibling [`architecture.md`](./architecture.md#⚠-issues),
  [`data-contracts.md`](./data-contracts.md#⚠-issues), and
  [`interactions.md`](./interactions.md#⚠-issues); also flagged from
  [`performance.md` § 7 trailer](../../../performance.md). One
  in-memory / session row covers the whole dev-only slice, including
  the writable `overlayVisible` flag. Per CLAUDE.md root contract
  ("every persisted field is registered in `data-inventory.md`").
  Suggested values: domain=`perf`, owner=`mvp.00-perf.04-profiling-overlay`,
  medium=`in-memory`, retention=`session`, notes=`dev-only profiler
  readouts; gated by `import.meta.env.DEV` and `?dev_profiler=1`.
- **Hotkey registry entry pending.** No row in
  [`ui-hotkeys.md`](../../../ui-hotkeys.md) yet for the `Ctrl+Shift+P`
  toggle (id pattern `^(global|screen)\.[a-z0-9-]+(\.[a-z0-9-]+)*$`,
  `defaultBinding` in W3C `KeyboardEvent.code` form), and the
  per-screen `Hotkey` column mandated by
  [`ui-hotkeys.md` § Per-screen Hotkey Column](../../../ui-hotkeys.md#per-screen-hotkey-column)
  is missing from [`interactions.md`](./interactions.md). Owners:
  [`mvp.07-ui-shell.18-hotkey-registry`](../../../../../tasks/mvp/07-ui-shell/18-hotkey-registry.md)
  (registration; suggested id `screen.dev-profiler.toggle-overlay`,
  `defaultBinding: "Control+Shift+KeyP"`) and
  [`mvp.07-ui-shell.13-screen-package-contract-sweep`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  (the column).
- **Mockup readouts exceed typed state bindings.**
  [`mockup.html`](./mockup.html) shows sub-fields on `AiComputePanel`
  (`difficulty`, `wall-clock`, `watchdog`, `cache hits`,
  `searchBudget`, `last move`), `HeapPanel` (per-domain
  `textures / audio / sim / ui` breakdown), `AllocPanel` (`per turn`,
  `gc pause max`), and `AnimationCountPanel` (`spell VFX`) that the
  State Bindings table does not type. Mirrored from
  [`data-contracts.md` § Issues](./data-contracts.md#⚠-issues).
  Owner: [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md)
  must either extend the selector shapes or mark the mockup rows as
  illustrative. Skill did not invent new selector fields (Hard
  Prohibition B).
