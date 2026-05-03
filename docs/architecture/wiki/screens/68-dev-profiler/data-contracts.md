# Screen 68: Dev Profiler
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree. | `content-schema/schemas/ui-component-registry.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `fps` | `state.perf.fps` | Sliding-window frame rate. |
| `frameMs` | `state.perf.frameMs` | Rolling-average ms / frame. |
| `cpuPerSystem` | `state.perf.cpuPerSystem` | Map of system → ms. |
| `allocPerFrame` | `state.perf.allocPerFrame` | Bytes allocated per frame; `null` when `--expose-gc` unavailable. |
| `heap` | `state.perf.heap` | `{ used: number, total: number }` in bytes. |
| `aiCompute` | `state.perf.aiCompute` | `{ ms, nodesExpanded, depthReached }` for last AI move. |
| `poolOccupancy` | `state.perf.pools` | Array of `{ name, used, capacity, growthCap }`. |
| `activeAnimations` | `state.perf.animations` | `{ onScreen: number, total: number }`. |

### Commands And Events
- None. The overlay does not dispatch.

### Config Keys
- `config.devProfiler.hotkey` — default `Ctrl+Shift+P`.
- `config.devProfiler.opacity` — overlay opacity (presentation
  only).
- `config.devProfiler.urlParameter` — name of the production
  escape-hatch URL parameter; default `dev_profiler`.

### Localization Keys
- `ui.dev-profiler.fps.title`
- `ui.dev-profiler.cpu.title`
- `ui.dev-profiler.alloc.title`
- `ui.dev-profiler.heap.title`
- `ui.dev-profiler.ai.title`
- `ui.dev-profiler.pools.title`
- `ui.dev-profiler.animations.title`

### Asset, Sound, And VFX IDs
- None. The overlay uses CSS-only styling.

### Save And Replay Fields
- The overlay writes nothing to save state. `state.perf.*` is
  non-replayed and non-hashed.

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. PROD bundles
  must tree-shake the screen unless `?dev_profiler=1` is present
  on the URL; dynamic imports gate it (see
  [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)).
- Resolver miss for any component listed here surfaces in
  `state.debug.missingComponentCount` and is caught by
  `scripts/validate-screen-component-coverage.mjs`.
- Pool growth past the configured cap is a bench-harness failure,
  surfaced visually via the warn colour on the
  `PoolOccupancyPanel`.
