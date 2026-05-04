# Screen 62: Multiplayer Setup
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Multiplayer setup for hotseat, LAN/online lobby, player colors, teams, timers, map/scenario, and deterministic content lock.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Set connection type | `mpSetup.connectionType` | local-ui | Current screen | `SET_MULTIPLAYER_CONNECTION_TYPE` | Changes setup draft. | Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route. |
| Edit slot | `mpSetup.editSlot` | local-ui | Current screen | `EDIT_MULTIPLAYER_SLOT` | Updates player slot draft. | Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route. |
| Host | `mpSetup.host` | navigation | `64-network-lobby` or `63-hotseat-turn-handoff` | `HOST_MULTIPLAYER_SESSION` | Creates session or hotseat game draft. | Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route. |
| Join | `mpSetup.join` | navigation | `64-network-lobby` | `JOIN_MULTIPLAYER_SESSION` | Routes to network lobby. | Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route. |
| Back | `mpSetup.back` | navigation | `02-new-game-setup` | `CLOSE_MULTIPLAYER_SETUP` | Discards draft. | Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route. |

### State Changes
- `state.ui.multiplayer.connectionType` refreshes `connectionType` after the owning reducer or local UI draft changes.
- `state.ui.multiplayer.playerSlots` refreshes `playerSlots` after the owning reducer or local UI draft changes.
- `state.ui.multiplayer.scenarioId` refreshes `selectedScenario` after the owning reducer or local UI draft changes.
- `state.ui.multiplayer.timer` refreshes `timerConfig` after the owning reducer or local UI draft changes.
- `selectors.multiplayer.contentCompatibilityHash` refreshes `contentHash` after the owning reducer or local UI draft changes.
- `state.net.statusThresholds` drives the Task 8 status indicator state machine (green ≤ 2 s, yellow 2 – 10 s, red 10 s+, action-buttons 30 s+, forfeit 120 s+).
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Stall Threshold Behavior
- 0 – 2 s after expected response: status indicator green; "your
  turn" badge unchanged.
- 2 – 10 s: indicator yellow; badge swaps to "waiting on opponent."
- 10 – 30 s: red overlay shows last-seen turn.
- 30 s+: overlay reveals "wait" / "request resync" buttons.
- 120 s+: overlay reveals "forfeit" button (cross-links Task 6 reconnect window).

### Navigation Outcomes
- Host can route to `64-network-lobby` or `63-hotseat-turn-handoff` after guard approval and exit animation.
- Join can route to `64-network-lobby` after guard approval and exit animation.
- Back can route to `02-new-game-setup` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
