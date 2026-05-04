# Screen 64: Network Lobby
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Network lobby for hosted/joined multiplayer sessions, ready state, chat, content hash checks, slot assignment, and launch.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle ready | `network.ready` | command | Current screen | `SET_LOBBY_READY` | Sends ready state to host/session. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Send chat | `network.chat` | command | Current screen | `SEND_LOBBY_CHAT` | Sends chat message. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Change slot | `network.slot` | command | Current screen | `REQUEST_LOBBY_SLOT_CHANGE` | Requests color/team/control slot change. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Launch | `network.launch` | navigation | `59-loading-screen` | `LAUNCH_NETWORK_GAME` | Host starts deterministic session. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Leave | `network.leave` | navigation | `62-multiplayer-setup` | `LEAVE_NETWORK_LOBBY` | Disconnects or leaves lobby. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |

### State Changes
- `state.net.sessionId` refreshes `sessionId` after the owning reducer or local UI draft changes.
- `state.net.lobby.players` refreshes `players` after the owning reducer or local UI draft changes.
- `state.net.lobby.chat` refreshes `chatMessages` after the owning reducer or local UI draft changes.
- `selectors.net.lobbyCompatibility` refreshes `compatibility` after the owning reducer or local UI draft changes.
- `selectors.net.canLaunchSession` refreshes `launchGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Launch can route to `59-loading-screen` after guard approval and exit animation.
- Leave can route to `62-multiplayer-setup` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Toggle ready (`SET_LOBBY_READY`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*; transient packet loss may downgrade to a toast. |
| Send chat (`SEND_LOBBY_CHAT`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*; transient packet loss may downgrade to a toast. |
| Change slot (`REQUEST_LOBBY_SLOT_CHANGE`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*; transient packet loss may downgrade to a toast. |
