# Screen 68: Dev Profiler
## Data Contracts

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `ui-component-registry.schema.json` | Resolves the overlay's `data-component` ids (`DevProfilerOverlay`, `FpsPanel`, `CpuBudgetPanel`, `AllocPanel`, `HeapPanel`, `AiComputePanel`, `PoolOccupancyPanel`, `AnimationCountPanel`) to runtime constructors via `componentId` + `module` + `exportName`. | [`content-schema/schemas/ui-component-registry.schema.json`](../../../../../content-schema/schemas/ui-component-registry.schema.json) |

### Runtime State Selectors

| UI element | Selector | Shape / notes |
| --- | --- | --- |
| `fps` | `state.perf.fps` | Sliding-window frame rate (1 Hz refresh). |
| `frameMs` | `state.perf.frameMs` | Rolling-average ms / frame at the Reference tier. |
| `cpuPerSystem` | `state.perf.cpuPerSystem` | Map system → ms; per-frame refresh; presentation-only, never enters the canonical state hash. |
| `allocPerFrame` | `state.perf.allocPerFrame` | Bytes allocated per frame; `null` when `--expose-gc` is unavailable. |
| `heap` | `state.perf.heap` | `{ used: number, total: number }` in bytes, sampled at 1 Hz. |
| `aiCompute` | `state.perf.aiCompute` | `{ ms, nodesExpanded, depthReached }` for the last AI move; `null` until the first move completes. |
| `poolOccupancy` | `state.perf.pools` | Array of `{ name, used, capacity, growthCap }` per pool; per-frame refresh. |
| `activeAnimations` | `state.perf.animations` | `{ onScreen, total }`; per-frame refresh. |
| `overlayVisible` | `state.perf.overlayVisible` | Boolean toggled by the `Ctrl+Shift+P` hotkey (default `false`). |

### Commands And Events

- None. The overlay never dispatches. The visibility toggle is a
  `local-ui` action (camelCase, not an uppercase Command/Event token);
  see [`interactions.md`](./interactions.md) § Actions and
  [`command-schema.md`](../../../command-schema.md) ("screen
  interaction tokens … UI-local"). The `Command / event` column for
  the toggle row is `none`, so
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  has nothing to register for this screen.

### Config Keys

- `config.devProfiler.hotkey` — default `Ctrl+Shift+P` (W3C
  `KeyboardEvent.code` form `Control+Shift+KeyP` per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md)).
- `config.devProfiler.opacity` — overlay opacity (presentation
  only).
- `config.devProfiler.urlParameter` — name of the production
  escape-hatch URL parameter; default `dev_profiler`.

### Localization Keys

Closed set under `ui.dev-profiler.*`, one per panel header:

- `ui.dev-profiler.fps.title`
- `ui.dev-profiler.cpu.title`
- `ui.dev-profiler.alloc.title`
- `ui.dev-profiler.heap.title`
- `ui.dev-profiler.ai.title`
- `ui.dev-profiler.pools.title`
- `ui.dev-profiler.animations.title`

### Asset, Sound, And VFX IDs

- None. The overlay uses CSS-only styling (dark-amber panel system,
  distinct from the dark-blue `66-debug-overlay`).

### Save And Replay Fields

- None. `state.perf.*` is non-replayed and non-hashed; the overlay
  itself owns no save state.

### Validation And Fallback

- **Build-flag gate.** `import.meta.env.DEV === true`. PROD bundles
  tree-shake the screen unless `?dev_profiler=1` is present on the
  URL (see [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)
  and [`spec.md`](./spec.md) § Description).
- **Resolver miss.** A `componentId` listed above that fails to
  resolve increments `state.debug.missingComponentCount` (rendered
  by sibling diagnostic screen
  [`66-debug-overlay`](../66-debug-overlay/)) and is caught by
  [`scripts/validate-screen-component-coverage.mjs`](../../../../../scripts/validate-screen-component-coverage.mjs).
- **Pool growth past cap.** A bench-harness failure per
  [`performance.md` § Allocation Policy](../../../performance.md#allocation-policy);
  the `PoolOccupancyPanel` renders the offending row with the warn
  colour and an asterisk.
- **`--expose-gc` unavailable.** `allocPerFrame` reads `null` and
  `AllocPanel` renders "n/a"; not a failure.
- **No AI move yet.** `aiCompute` reads `null` and `AiComputePanel`
  renders "—"; not a failure.

---

## 🔍 Sync Check

- **UI: ✔** — `data-component` ids in [`mockup.html`](./mockup.html)
  match the resolver inputs above and the Component Tree in
  [`spec.md`](./spec.md); panel-header `data-i18n` attributes match
  the localization key set above one-for-one.
- **Schema: ✔** —
  [`ui-component-registry.schema.json`](../../../../../content-schema/schemas/ui-component-registry.schema.json)
  exposes `componentId` + `module` + `exportName` as the resolution
  surface used here; no other schema is consumed by this screen.
- **Tasks: ✔** — Owning task
  [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md)
  pins the panel set, `< 0.2 ms` self-cost, and `?dev_profiler=1`
  escape hatch in its Acceptance Criteria; upstream selector sources
  ([`mvp.06-renderer.08-presentation-loop-decoupled-from-sim`](../../../../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md),
  [`mvp.10-heuristic-ai.06-run-ai-in-web-worker`](../../../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md),
  [`mvp.00-perf.05-object-pools`](../../../../../tasks/mvp/00-perf/05-object-pools.md))
  are listed as dependencies on that task.

## ⚠ Issues

- **`state.perf.*` slice is not registered in
  [`data-inventory.md`](../../../data-inventory.md).** Same gap
  flagged from sibling
  [`architecture.md`](./architecture.md#⚠-issues),
  [`spec.md`](./spec.md#⚠-issues), and
  [`interactions.md`](./interactions.md#⚠-issues); also noted in
  [`performance.md` § 7 trailer](../../../performance.md). Per
  CLAUDE.md root contract ("every persisted field is registered in
  `data-inventory.md`") — even dev-only / in-memory slices should
  carry an explicit `in-memory / session / n/a` row so the
  `validate:tasks` IndexedDB store-name lint can confirm there is no
  missing store (cf. the existing `lobby chat (transient)` row).
  Suggested row: `state.perf.*` / in-memory / low / session / n/a /
  "dev-only profiler readouts; gated by `import.meta.env.DEV` and
  `?dev_profiler=1` per screen 68". Owner:
  [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md).
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
- **Mockup readouts exceed the typed state bindings.**
  [`mockup.html`](./mockup.html) renders sub-fields not present in
  the selector shapes above — `AiComputePanel` shows `difficulty`,
  `wall-clock`, `watchdog`, `cache hits`, `searchBudget`,
  `last move`; `HeapPanel` shows a per-domain breakdown
  (`textures / audio / sim / ui`); `AllocPanel` shows `per turn` and
  `gc pause max`; `AnimationCountPanel` shows a `spell VFX` row.
  Either the mockup is illustrative beyond the contract or
  `state.perf.aiCompute`, `heap`, `allocPerFrame`, and `animations`
  need extra fields. Resolving requires picking one; the rewrite
  preserves the existing typed shapes unchanged. Owner:
  [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md)
  to reconcile. Skill did not invent new selector fields (Hard
  Prohibition B).
- **Hotkey registry entry pending.** `config.devProfiler.hotkey`
  default `Ctrl+Shift+P` has no row in the
  [`ui-hotkeys.md`](../../../ui-hotkeys.md) registry. See sibling
  [`architecture.md` § Issues](./architecture.md#⚠-issues) for the
  full mismatch; owners are
  [`mvp.07-ui-shell.18-hotkey-registry`](../../../../../tasks/mvp/07-ui-shell/18-hotkey-registry.md)
  (registration) and
  [`mvp.07-ui-shell.13-screen-package-contract-sweep`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  (the `Hotkey` column on the sibling
  [`interactions.md`](./interactions.md) Actions table).
