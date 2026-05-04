# Screen 68: Dev Profiler
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Developer-only profiling overlay. Read-only.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle visibility (Ctrl+Shift+P) | `devProfiler.toggleVisibility` | local-ui | Current screen | none | `state.perf.overlayVisible` toggles | None. |
| Hide overlay (Ctrl+Shift+P again) | `devProfiler.toggleVisibility` | local-ui | Current screen | none | `state.perf.overlayVisible = false` | None. |

### State Changes
- `state.perf.fps` and `state.perf.frameMs` refresh once per
  second from a sliding-window measurement.
- `state.perf.cpuPerSystem` refreshes after each frame from
  per-system instrumentation hooks; values are presentation-only
  and never enter the canonical state hash.
- `state.perf.allocPerFrame` is populated only when
  `--expose-gc` is available (dev / Node CI / `?dev_profiler=1`
  with the relevant Chromium switch).
- `state.perf.heap` refreshes once per second.
- `state.perf.aiCompute` updates on every move-result message
  emitted by the AI worker (see
  `mvp.10-heuristic-ai.06-run-ai-in-web-worker`).
- `state.perf.pools` updates each frame from
  `mvp.00-perf.05-object-pools` occupancy selectors.
- `state.perf.animations` updates each frame from the renderer.

### Navigation Outcomes
- The overlay does not navigate. Hiding it returns input control
  to the layer below without a route change.

### Disabled And Error Cases
- In production builds without `?dev_profiler=1`, the screen is
  not rendered at all and the hotkey is unbound.
- When `--expose-gc` is unavailable (typical browser),
  `allocPerFrame` reads `null` and the panel renders "n/a".
- `state.perf.aiCompute` is `null` until the first AI move
  completes; the panel renders "—".
- Pool occupancy values that hit the configured growth cap are
  rendered with a warn colour and an asterisk; see
  [`performance.md` § Allocation Policy](../../../performance.md#allocation-policy).


### Error Formatter

- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behaviour and timing.
- Hotkey registration is done through the central hotkey
  registry in
  [`ui-hotkeys.md`](../../../ui-hotkeys.md); registration is
  cleaned up on unmount to avoid the leak class caught by
  Scenario D in
  [`tasks/mvp/00-perf/03-memory-regression-gate.md`](../../../../../tasks/mvp/00-perf/03-memory-regression-gate.md).
