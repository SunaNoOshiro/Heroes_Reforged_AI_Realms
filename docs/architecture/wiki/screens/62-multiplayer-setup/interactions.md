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
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Host can route to `64-network-lobby` or `63-hotseat-turn-handoff` after guard approval and exit animation.
- Join can route to `64-network-lobby` after guard approval and exit animation.
- Back can route to `02-new-game-setup` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
