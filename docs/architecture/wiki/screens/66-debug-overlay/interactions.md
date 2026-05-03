# Screen 66: Debug Overlay
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Developer diagnostics overlay. Read-only by default; the replay
scrubber dispatches presentation-only commands consumed by the
replay driver.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle visibility (Ctrl+~) | `debugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.debug.visible` toggles | None. |
| Pause / Resume | `debugOverlay.replayPause` | local-ui | Current screen | `REPLAY_PAUSE` (presentation-only) | `state.debug.replay.mode` swaps `live`↔`paused` | None. |
| Step one tick | `debugOverlay.replayStep` | local-ui | Current screen | `REPLAY_STEP` (presentation-only) | `state.debug.replay.tick` advances by 1 | None. |
| Reset replay | `debugOverlay.replayReset` | local-ui | Current screen | `REPLAY_RESET` (presentation-only) | `state.debug.replay.tick = 0` and `mode = "replay"` | None. |
| Hide overlay | `debugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.debug.visible = false` | None. |

### State Changes
- `state.debug.fps` and `state.debug.frameTier` refresh once per second
  from a sliding-window measurement; UI re-renders only when the
  selector observes a change.
- `state.debug.recentCommands` is a bounded ring buffer (length 20)
  updated by the reducer epilogue; not persisted.
- `state.debug.hash` and `state.debug.rngTicks` refresh after each
  reducer application; presentation only.
- `state.debug.replay` is non-replayed and non-hashed; safe to mutate
  without affecting determinism.

### Navigation Outcomes
- The overlay does not navigate. Hiding it returns input control to
  the layer below without a route change.

### Disabled And Error Cases
- In production builds (`import.meta.env.PROD === true`) the screen is
  not rendered at all. Hotkey is unbound.
- Replay-scrubber controls are disabled in `live` mode; switching
  modes requires the engine to be paused.
- If `state.debug.missingComponentCount > 0`, the readout colour goes
  to warn. The validator
  [`scripts/validate-screen-component-coverage.mjs`](../../../../../scripts/validate-screen-component-coverage.mjs)
  is the build-time guard; the overlay surfaces runtime drift.

### AI Implementation Notes
- This file owns behaviour and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than
  inventing new behaviour.
- Replay actions go through the replay driver, never through the live
  engine reducer. See
  [`ui-frame-lag-contract.md` § Replay](../../../ui-frame-lag-contract.md#replay).
