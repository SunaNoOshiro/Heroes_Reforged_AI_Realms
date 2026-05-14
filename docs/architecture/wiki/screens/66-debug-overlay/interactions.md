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
| Toggle visibility (`Ctrl+~`) | `debugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.debug.visible` toggles | None. |
| `PAUSE` button | `debugOverlay.replayPause` | local-ui | Current screen | `REPLAY_PAUSE` (presentation-only) | `state.debug.replay.mode` swaps `live` ↔ `paused` | None. |
| `STEP` button | `debugOverlay.replayStep` | local-ui | Current screen | `REPLAY_STEP` (presentation-only) | `state.debug.replay.tick` advances by 1 | None. |
| `RESET` button | `debugOverlay.replayReset` | local-ui | Current screen | `REPLAY_RESET` (presentation-only) | `state.debug.replay.tick = 0`, `mode = "replay"` | None. |
| `HIDE` button | `debugOverlay.toggleVisibility` | local-ui | Current screen | none | `state.debug.visible = false` | None. |

### State Changes
- `state.debug.fps` and `state.debug.frameTier` refresh once per
  second from a sliding-window measurement; UI re-renders only when
  the selector observes a change.
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
- Production builds (`import.meta.env.PROD === true`): the screen is
  not rendered and the hotkey is unbound.
- Replay-scrubber controls are disabled in `live` mode; switching
  modes requires the engine to be paused.
- `state.debug.missingComponentCount > 0`: the readout colour goes to
  warn. The build-time guard
  [`scripts/validate-screen-component-coverage.mjs`](../../../../../scripts/validate-screen-component-coverage.mjs)
  catches missing registry entries; the overlay surfaces runtime
  drift.

### Error Formatter
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behaviour and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behaviour.
- Replay actions go through the replay driver, never through the live
  engine reducer. See
  [`ui-frame-lag-contract.md` § 5. Replay](../../../ui-frame-lag-contract.md#5-replay).

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs and button labels (`PAUSE`, `STEP`, `RESET`, `HIDE`) match the `data-action` attributes in `mockup.html`; sibling `spec.md` § Component Tree and `architecture.md` § Replay Scrubber Flow are aligned.
- **Schema: ✔** — No content schemas drive interactions here; cross-checked `data-contracts.md` for any drift, none found.
- **Tasks: ⚠** — Owning task [`phase-2.08-meta-systems.08-debug-overlay-screen`](../../../../../tasks/phase-2/08-meta-systems/08-debug-overlay-screen.md) covers all five actions in its Acceptance Criteria, but `REPLAY_PAUSE`, `REPLAY_STEP`, `REPLAY_RESET` are not enumerated in [`command-schema.md`](../../../command-schema.md). They are presentation-only and bypass the deterministic command log, but should still be listed alongside the other `local-ui` commands.

## ⚠ Issues

- **Replay commands missing from `command-schema.md`.** This file dispatches `REPLAY_PAUSE`, `REPLAY_STEP`, `REPLAY_RESET` against the replay driver, but [`command-schema.md`](../../../command-schema.md) has no entries for them. Per CLAUDE.md root contract, every dispatched command must be defined in the schema (or marked `runtime-only` / `local-ui`). The owning task `phase-2.08-meta-systems.08-debug-overlay-screen` should add the three commands as `local-ui` (presentation-only, no `metadata.nonce`, dispatched against the replay driver). Skill did not edit `command-schema.md` (Hard Prohibition D — never edit cross-checked files).
