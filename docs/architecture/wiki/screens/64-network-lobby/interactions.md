# Screen 64: Network Lobby
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Network lobby for hosted/joined multiplayer sessions, ready state, chat, content hash checks, slot assignment, host moderation, and launch.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle ready | `network.ready` | command | Current screen | `SET_LOBBY_READY` | Sends ready state to host/session. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Send chat | `network.chat` | command | Current screen | `SEND_LOBBY_CHAT` | Sends chat message. The `Send chat` path runs `normalizeChatText(input)` (NFKC, control + bidi strip, whitespace collapse, length cap 240) **before** dispatching `SEND_LOBBY_CHAT`, validates the envelope against [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json), and applies the per-peer token bucket (capacity 5, refill 1/s) per [`chat-safety.md` § 6](../../../chat-safety.md#6-rate-limit). On bucket-empty, the send is refused inline and `ui.network-lobby.chat.send.rate-limited` is shown next to the input. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Change slot | `network.slot` | command | Current screen | `REQUEST_LOBBY_SLOT_CHANGE` | Requests color/team/control slot change. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Approve pending peer | `network.approvePeer` | command | Current screen | `APPROVE_PEER` | Promotes a pending peer into the active slot list; clears the pending modal; triggers the host's WebRTC `iceRestart` per [`docs/architecture/ice-disclosure-policy.md`](../../../ice-disclosure-policy.md). | Pending modal fades out, slot row slides in, ready seal idle. |
| Reject pending peer | `network.rejectPeer` | command | Current screen | `REJECT_PEER` | Rejects the pending peer; signaling server emits `PEER_REJECTED { reason: "rejected" }`. | Pending modal fades out with the rejection envelope. |
| Kick peer | `network.kickPeer` | command | Current screen | `KICK_PEER` | Removes an approved peer; appends `peerPubKey` to `peerDenylist[]`; signaling server emits `PEER_KICKED` and drops the WebSocket. | Slot row collapses; per-row dots-menu closes. |
| Mute peer | `network.mutePeer` | command | Current screen | `MUTE_PEER` | **Local-only**: suppresses chat from `peerId` for the local user. Args: `{ peerId, scope: 'session' \| 'persistent' }`. Persistent variant requires the long-lived peer key from the TLS / WebRTC authentication plan; until that lands the option renders disabled with `ui.network-lobby.chat.mute.persistent-disabled`. Updates `state.net.lobby.muted`. Per [`chat-safety.md` § 7](../../../chat-safety.md#7-mute--block). | Per-row `MutedBadge` flips to muted icon. |
| Block peer | `network.blockPeer` | command | Current screen | `BLOCK_PEER` | **Local-only**: superset of `MUTE_PEER`. Also strips the peer's existing envelopes from the rendered chat log and prevents re-display if the same session-scoped id rejoins. Updates `state.net.lobby.blocked`. | Per-row `MutedBadge` flips to blocked icon; chat history filters in place. |
| Report peer | `network.reportPeer` | command | Current screen | `REPORT_PEER` | Opens `ReportPeerDialog`. Args: `{ peerId, reasonCode, freeText? }`. On confirm, generates a [`report-bundle.schema.json`](../../../../../content-schema/schemas/report-bundle.schema.json)-conformant in-memory bundle and offers a single-file download via blob URL — no network call. Reason codes: `harassment`, `slurs-or-hate`, `cheating-suspected`, `unsafe-ai-content`, `other`. The `unsafe-ai-content` branch uses the `ai-ugc` filename prefix so a future intake can route on filename. Also writes a structured `signaling.report.*` record to the local audit log per [`docs/architecture/signaling-audit-log.md`](../../../signaling-audit-log.md). No central server in M5. | Dialog confirms; toast confirms the bundle was saved locally. |
| Save chat log | `network.exportChatLog` | command | Current screen | `EXPORT_CHAT_LOG` | Surfaced in `ChatPanelOverflowMenu`. Args: `{ format: 'json' \| 'txt' }`. Serializes `state.net.lobby.chat` and triggers a single-file download (`heroes-reforged-chat-<sessionId>-<ISO>.json`) via blob URL; revokes the URL immediately. JSON output entries conform to [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json). | Toast confirms the file was saved locally. |
| Dismiss trust banner | `network.dismissChatTrustBanner` | command | Current screen | `ACKNOWLEDGE_CHAT_TRUST_BANNER` | Persists `hr.ui.lobby.chat.trust-banner.dismissed = true` in `localStorage` and unmounts `ChatTrustBanner` for the rest of this and all future sessions on the same install. Per [`chat-safety.md` § 10](../../../chat-safety.md#10-trust-model-disclosure). | Banner fades out. |
| Close room | `network.closeRoom` | command | `62-multiplayer-setup` | `CLOSE_ROOM` | Host-only: signaling server emits `ROOM_CLOSED { reason: "host_closed" }`, drops the room, and MAY skip the 10-minute cool-down per [`docs/architecture/lobby-identifiers.md` § 6](../../../lobby-identifiers.md#6-reuse-policy-cool-down). | Lobby fades to setup screen. |
| Launch | `network.launch` | navigation | `59-loading-screen` | `LAUNCH_NETWORK_GAME` | Host starts deterministic session. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |
| Leave | `network.leave` | navigation | `62-multiplayer-setup` | `LEAVE_NETWORK_LOBBY` | Disconnects or leaves lobby. | Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading. |

### State Changes
- `state.net.sessionId` refreshes `sessionId` after the owning reducer or local UI draft changes.
- `state.net.lobby.players` refreshes `players` after the owning reducer or local UI draft changes.
- `state.net.lobby.pendingPeers` refreshes `pendingPeers` after the signaling server forwards `PEER_PENDING`.
- `state.net.lobby.peerApproval` refreshes the host-side approval modal state.
- `state.net.lobby.peerDenylist` refreshes the per-room denylist after `KICK_PEER`.
- `state.net.lobby.joinAttemptToast` refreshes the rejected-attempt toast counter on `JOIN_ATTEMPT_REJECTED` arrivals.
- `state.net.lobby.chat` refreshes `chatMessages` after the owning reducer or local UI draft changes. Items are normalized, schema-validated, and `senderId`-rewritten on the receive side per [`chat-safety.md` § 3](../../../chat-safety.md#3-envelope-schema). Cleared on `LEAVE_NETWORK_LOBBY` and on session end.
- `state.net.lobby.muted` and `state.net.lobby.blocked` refresh after `MUTE_PEER` and `BLOCK_PEER`. Both slices are presentation-only and never enter saves, replays, or the canonical state hash.
- `selectors.net.lobbyCompatibility` refreshes `compatibility` after the owning reducer or local UI draft changes.
- `selectors.net.canLaunchSession` refreshes `launchGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Pending Peer Flow
1. Signaling server forwards `PEER_PENDING { peerPubKey, displayNameDraft, joinNonceMs }` to the host.
2. UI mounts `PendingPeerModal` with the joiner's draft display name and a short fingerprint of `peerPubKey`.
3. ICE candidates from the pending peer are buffered server-side; only `typ relay` candidates flow until approval per [`docs/architecture/ice-disclosure-policy.md`](../../../ice-disclosure-policy.md).
4. Host dispatches `APPROVE_PEER` or `REJECT_PEER`.
5. On 30 s timeout, the server emits `PEER_REJECTED { reason: "timeout" }` automatically and the modal clears.

### Join Attempt Toast
- The signaling server emits `JOIN_ATTEMPT_REJECTED { count, sinceMs }` to the host every 30 s when at least one rejected join (wrong code, denylisted, or rate-limited) has occurred since the last emission.
- The UI shows a non-modal toast at thresholds 1, 5, 20: e.g. "3 join attempts rejected in the last minute." Localization key: `ui.network-lobby.toast.joinAttemptRejected`.
- The toast itself is local UI state; it does not enter the command log.

### Navigation Outcomes
- Launch can route to `59-loading-screen` after guard approval and exit animation.
- Leave can route to `62-multiplayer-setup` after guard approval and exit animation.
- Close room (host) routes to `62-multiplayer-setup` after the server confirms `ROOM_CLOSED`.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- `APPROVE_PEER`, `REJECT_PEER`, `KICK_PEER`, `CLOSE_ROOM` are disabled for non-host peers; the per-row dots-menu hides them entirely.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.
- Peer-connection failures render only `peerLabel` and the closed `peerFailureReason` enum (`TIMEOUT` / `REFUSED` / `NETWORK_ERROR` / `PROTOCOL_MISMATCH`); raw IPs and ICE addresses never reach UI or the on-device crash log per the contract in [`spec.md` § Peer-Failure Error Contract](./spec.md#peer-failure-error-contract).
- Signaling join failures collapse to `errors.network.joinFailed` per the closed wire enum in [`services/signaling/error-codes.md`](../../../../../services/signaling/error-codes.md); the `OWNER_NOTICE` channel surfaces a richer reason to the host only.

### Out of M5 Scope
- **Spectator slots are not in M5.** The lobby renders only the 2 active player slots (per the M5 cap in [`tasks/phase-3/01-multiplayer.md`](../../../../../tasks/phase-3/01-multiplayer.md)). Spectator UI, slot acquisition, and observer-mode commands are deferred under [`DEF-002`](../../../../planning/deferred.md). Implementers MUST NOT add spectator slots, observer roles, or "watch the match" affordances to this screen until that deferral is closed by a future plan.

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
| Approve pending peer (`APPROVE_PEER`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
| Reject pending peer (`REJECT_PEER`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
| Kick peer (`KICK_PEER`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
| Mute peer (`MUTE_PEER`) | NET_REJECTED | toast | `error.net.rejected.body` | override — `MUTE_PEER` is local-only; failure path is a toast, not a modal. |
| Block peer (`BLOCK_PEER`) | NET_REJECTED | toast | `error.net.rejected.body` | override — `BLOCK_PEER` is local-only (superset of mute); failure path is a toast. |
| Report peer (`REPORT_PEER`) | NET_REJECTED | toast | `error.net.rejected.body` | override — local audit log write; failure path is a toast. |
| Save chat log (`EXPORT_CHAT_LOG`) | STORAGE_REJECTED | toast | `error.storage.rejected.body` | override — local file save; failure path is a toast. |
| Dismiss trust banner (`ACKNOWLEDGE_CHAT_TRUST_BANNER`) | STORAGE_REJECTED | toast | `error.storage.rejected.body` | override — `localStorage` write; failure path is a toast and the banner stays mounted. |
| Close room (`CLOSE_ROOM`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
