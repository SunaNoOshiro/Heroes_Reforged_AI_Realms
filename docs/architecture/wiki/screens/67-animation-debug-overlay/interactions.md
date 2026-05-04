# Screen 67: Animation Debug Overlay
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Developer animation-timeline inspector. The four scrubbing commands
reseek the renderer's event-log cursor; they never mutate gameplay
state. Engine reducers are not invoked by any control here.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle visibility (Ctrl+Shift+~) | `animDebugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.dev.animOverlayVisible` toggles | None. |
| Pause | `animDebugOverlay.pause` | local-ui | Current screen | `PAUSE_PRESENTATION` (presentation-only) | `state.dev.animPaused = true` | Skips presentation only — no gameplay mutation. |
| Resume | `animDebugOverlay.resume` | local-ui | Current screen | `PAUSE_PRESENTATION` (presentation-only) | `state.dev.animPaused = false` | Skips presentation only — no gameplay mutation. |
| Step forward 1 event | `animDebugOverlay.stepForward` | local-ui | Current screen | `STEP_PRESENTATION_FORWARD` | `state.dev.eventLogIndex += 1` | Skips presentation only — no gameplay mutation. |
| Step back 1 event | `animDebugOverlay.stepBack` | local-ui | Current screen | `STEP_PRESENTATION_BACK` | `state.dev.eventLogIndex -= 1` | Skips presentation only — no gameplay mutation. |
| Scrub to index | `animDebugOverlay.scrubTo` | local-ui | Current screen | `SCRUB_PRESENTATION_TO_INDEX { index }` | `state.dev.eventLogIndex = index`; renderer rebuilds presentation state by replaying through the null-renderer event-log consumer up to `index` | Skips presentation only — no gameplay mutation. |
| Change playback speed | `animDebugOverlay.setSpeed` | local-ui | Current screen | none | `state.dev.timelineSpeed` updated | None. |
| Hide overlay | `animDebugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.dev.animOverlayVisible = false` | None. |

### State Changes
- `state.dev.animPaused` is non-replayed and non-hashed.
- `state.dev.eventLogIndex` is the renderer's cursor only; the engine
  state is fully determined by the underlying command log up to the
  last `applied` index, never by `eventLogIndex`.
- `state.dev.timelineSpeed` multiplies the
  `effectiveDelta = deltaTime × config.ui.animationSpeed × battleSpeed`
  formula pinned in
  [`animation-contract.md` § Two-Clock Model](../../../animation-contract.md#two-clock-model).
- `state.dev.activeTimelines` is recomputed when `eventLogIndex`
  changes; reuse the null-renderer event-log consumer to derive it.

### Navigation Outcomes
- The overlay does not navigate. Hiding it returns input control to
  the layer below without a route change.

### Disabled And Error Cases
- In production builds (`import.meta.env.PROD === true`) the screen
  is not rendered at all. Hotkey is unbound.
- When `config.dev.enableDebugOverlay === false`, the overlay does
  not mount even in dev builds.
- `STEP_PRESENTATION_BACK` clamps at `eventLogIndex = 0`.
- `STEP_PRESENTATION_FORWARD` clamps at `eventLogIndex =
  state.engine.commandLog.length`.
- `SCRUB_PRESENTATION_TO_INDEX` rejects out-of-range indices and
  surfaces a recoverable error per
  [`ui-state-contract.md` § Error State](../../../ui-state-contract.md#error-state).


### Error Formatter

- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behaviour and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behaviour.
- Replay actions go through the renderer's event-log cursor, never
  through the live engine reducer.
