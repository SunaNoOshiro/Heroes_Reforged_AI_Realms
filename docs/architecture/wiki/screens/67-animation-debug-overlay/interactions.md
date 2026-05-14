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
| Toggle visibility (`Ctrl+Shift+~`) | `animDebugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.dev.animOverlayVisible` toggles | None. |
| Pause | `animDebugOverlay.pause` | local-ui | Current screen | `PAUSE_PRESENTATION` (presentation-only) | `state.dev.animPaused = true` | None — presentation only. |
| Resume | `animDebugOverlay.resume` | local-ui | Current screen | `PAUSE_PRESENTATION` (presentation-only) | `state.dev.animPaused = false` | None — presentation only. |
| Step forward 1 event | `animDebugOverlay.stepForward` | local-ui | Current screen | `STEP_PRESENTATION_FORWARD` | `state.dev.eventLogIndex += 1` | None — presentation only. |
| Step back 1 event | `animDebugOverlay.stepBack` | local-ui | Current screen | `STEP_PRESENTATION_BACK` | `state.dev.eventLogIndex -= 1` | None — presentation only. |
| Scrub to index | `animDebugOverlay.scrubTo` | local-ui | Current screen | `SCRUB_PRESENTATION_TO_INDEX { index }` | `state.dev.eventLogIndex = index`; renderer rebuilds presentation state by replaying through the null-renderer event-log consumer up to `index` | None — presentation only. |
| Change playback speed | `animDebugOverlay.setSpeed` | local-ui | Current screen | none | `state.dev.timelineSpeed` updated | None. |
| Hide overlay | `animDebugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.dev.animOverlayVisible = false` | None. |

### State Changes
- `state.dev.animOverlayVisible`, `state.dev.animPaused`,
  `state.dev.eventLogIndex`, and `state.dev.timelineSpeed` are all
  non-replayed and non-hashed.
- `state.dev.eventLogIndex` is the renderer's cursor only; engine
  state is fully determined by the underlying command log up to the
  last `applied` index, never by `eventLogIndex`.
- `state.dev.timelineSpeed` multiplies the
  `effectiveDelta = deltaTime × config.ui.animationSpeed × battleSpeed`
  formula pinned in
  [`animation-contract.md` § Two-Clock Model](../../../animation-contract.md#two-clock-model).
- `selectors.dev.activeTimelines` is recomputed when `eventLogIndex`
  changes; reuse the null-renderer event-log consumer at
  [`src/renderer/null/event-log-consumer.mjs`](../../../../../src/renderer/null/event-log-consumer.mjs)
  to derive it.

### Navigation Outcomes
The overlay does not navigate. Hiding it returns input control to
the layer below without a route change.

### Disabled And Error Cases
- In production builds (`import.meta.env.PROD === true`) the screen
  is not rendered at all; the hotkey is unbound.
- When `config.dev.enableDebugOverlay === false`, the overlay does
  not mount even in dev builds.
- `STEP_PRESENTATION_BACK` clamps at `eventLogIndex = 0`.
- `STEP_PRESENTATION_FORWARD` clamps at the renderer's event-log
  length (exposed via `selectors.dev.eventLogLength`); it never
  advances past the most recently emitted event.
- `SCRUB_PRESENTATION_TO_INDEX` rejects out-of-range indices and
  surfaces a recoverable error per
  [`ui-state-contract.md` § Error State](../../../ui-state-contract.md#error-state).

### Error Formatter
Errors are produced by `formatUserError(err, locale)` declared in
[`docs/architecture/error-formatter.md`](../../../error-formatter.md);
never construct error toast text inline.

### AI Implementation Notes
- This file owns behaviour and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behaviour.
- Replay actions go through the renderer's event-log cursor, never
  through the live engine reducer.

## 🔍 Sync Check
- **UI: ✔** — every Action ID with a `data-action` in `mockup.html`
  appears in the table (`pause`, `stepBack`, `stepForward`,
  `setSpeed`, `toggleVisibility`); `resume` and `scrubTo` are not
  exposed as `data-action` because the same `PauseToggle` and
  `ScrubBar` components emit them based on local state.
- **Schema: ✔** — the four presentation tokens
  (`PAUSE_PRESENTATION`, `STEP_PRESENTATION_FORWARD`,
  `STEP_PRESENTATION_BACK`, `SCRUB_PRESENTATION_TO_INDEX`) are
  registered in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (lines 58–61) and intentionally absent from
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — owning task
  [`tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md`](../../../../../tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md)
  Acceptance Criteria pin the four commands to the renderer driver
  and forbid mutating gameplay state.
- **Siblings: ✔** — actions reconcile with `spec.md` Component Tree
  (every action targets a listed component) and `data-contracts.md`
  Runtime State Selectors.

## ⚠ Issues
- **Pre-revision typo: forward-step clamp referenced
  `state.engine.commandLog.length`.** The cursor is over the
  renderer's *event log*, not the deterministic command log; using
  the command log would let the cursor advance past the last
  emitted event into "future" reducer output. Fixed in this
  revision via `selectors.dev.eventLogLength`. Owner should pin the
  selector in [`state-shape.md`](../../../state-shape.md) before
  runtime mounting.
- **`Pause` and `Resume` share `PAUSE_PRESENTATION`** as a single
  toggle — kept as two action IDs (`animDebugOverlay.pause` /
  `animDebugOverlay.resume`) for state-mutation symmetry with the
  rest of the table; intentional, surfaced for reviewer clarity.
- **`Ctrl+Shift+~` hotkey is not yet declared in
  [`ui-hotkeys.md`](../../../ui-hotkeys.md).** Sibling 66
  (`debug-overlay`) similarly relies on a debug-only chord; the
  hotkey-registry owner should add a dev-only entry before the
  overlay ships.
