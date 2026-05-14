# Screen 64: Network Lobby
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Owns per-control behavior, timing, and command routing for the
hosted/joined multiplayer lobby: ready state, chat, content-hash
checks, slot assignment, host moderation, and launch.

### Actions

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
|---|---|---|---|---|---|---|
| Toggle ready | `network.ready` | command | current | `SET_LOBBY_READY` | Flips `state.net.lobby.players[*].ready` for local peer. | Ready seal stamps; row idle. |
| Send chat | `network.chat` | command | current | `SEND_LOBBY_CHAT` | Appends to `state.net.lobby.chat` after the receive-side pipeline (see § Chat Send Pipeline). | Chat panel scrolls; soft chime. |
| Change slot | `network.slot` | command | current | `REQUEST_LOBBY_SLOT_CHANGE` | Requests color / team / control slot change for local peer. | Player row slides into new slot. |
| Approve pending peer | `network.approvePeer` | command | current | `APPROVE_PEER` | Promotes a pending peer into the active slot list; clears the pending modal; triggers host WebRTC `iceRestart` per [`ice-disclosure-policy.md`](../../../ice-disclosure-policy.md). | Pending modal fades out; slot row slides in. |
| Reject pending peer | `network.rejectPeer` | command | current | `REJECT_PEER` | Rejects the pending peer; signaling server emits `PEER_REJECTED { reason: "rejected" }`. | Pending modal fades out with rejection envelope. |
| Kick peer | `network.kickPeer` | command | current | `KICK_PEER` | Removes an approved peer; appends `peerPubKey` to `state.net.lobby.peerDenylist[]`; signaling server emits `PEER_KICKED` and drops the WebSocket. | Slot row collapses; per-row dots-menu closes. |
| Mute peer | `network.mutePeer` | command | current | `MUTE_PEER` | **Local-only.** Args `{ peerId, scope: 'session' \| 'persistent' }`. Suppresses chat from `peerId` for the local user. The persistent variant requires the long-lived peer key from the TLS / WebRTC authentication plan; until that lands the option renders disabled with `ui.network-lobby.chat.mute.persistent-disabled`. Updates `state.net.lobby.muted` per [`chat-safety.md` § 7](../../../chat-safety.md#7-mute--block). | `MutedBadge` flips to muted icon. |
| Block peer | `network.blockPeer` | command | current | `BLOCK_PEER` | **Local-only.** Superset of `MUTE_PEER`. Also strips the peer's existing envelopes from the rendered chat log and prevents re-display if the same session-scoped id rejoins. Updates `state.net.lobby.blocked`. | `MutedBadge` flips to blocked icon; chat history filters in place. |
| Report peer | `network.reportPeer` | command | current | `REPORT_PEER` | Opens `ReportPeerDialog`. Args `{ peerId, reasonCode, freeText? }`. On confirm, builds a [`report-bundle.schema.json`](../../../../../content-schema/schemas/report-bundle.schema.json)-conformant in-memory bundle and offers a single-file download via blob URL — no network call. Reason codes: `harassment`, `slurs-or-hate`, `cheating-suspected`, `unsafe-ai-content`, `other`. The `unsafe-ai-content` branch uses the `ai-ugc` filename prefix so a future intake can route on filename. Also writes a structured `signaling.report.*` record to the local audit log per [`signaling-audit-log.md`](../../../signaling-audit-log.md). No central server in M5. | Dialog confirms; toast: bundle saved locally. |
| Save chat log | `network.exportChatLog` | command | current | `EXPORT_CHAT_LOG` | Surfaced in `ChatPanelOverflowMenu`. Args `{ format: 'json' \| 'txt' }`. Serializes `state.net.lobby.chat` and triggers a single-file download (`heroes-reforged-chat-<sessionId>-<ISO>.json`) via blob URL; revokes the URL immediately. JSON entries conform to [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json). | Toast: file saved locally. |
| Dismiss trust banner | `network.dismissChatTrustBanner` | command | current | `ACKNOWLEDGE_CHAT_TRUST_BANNER` | Persists `hr.ui.lobby.chat.trust-banner.dismissed = true` in `localStorage` and unmounts `ChatTrustBanner` for the rest of this and all future sessions on the same install. Per [`chat-safety.md` § 10](../../../chat-safety.md#10-trust-model-disclosure). | Banner fades out. |
| Close room | `network.closeRoom` | command | `62-multiplayer-setup` | `CLOSE_ROOM` | Host-only: signaling server emits `ROOM_CLOSED { reason: "host_closed" }`, drops the room, and MAY skip the 10-minute cool-down per [`lobby-identifiers.md` § 6](../../../lobby-identifiers.md#6-reuse-policy-cool-down). | Lobby fades to setup screen. |
| Launch | `network.launch` | navigation | `59-loading-screen` | `LAUNCH_NETWORK_GAME` | Host-only: starts deterministic session. Gated by `selectors.net.canLaunchSession`. | Launch fades to loading; ready seals lock. |
| Leave | `network.leave` | navigation | `60-confirmation-dialog` (then `62-multiplayer-setup`) | `REQUEST_CONFIRMATION` → `LEAVE_NETWORK_LOBBY_CONFIRMED` | Routes through `60-confirmation-dialog` per [`spec.md` § Click-Through Resistance](../60-confirmation-dialog/spec.md#click-through-resistance). Severity selector: `state.net.lobby.session.phase === 'in-game' ? 'critical' : 'warning'`. In-game leave shows the forfeit-penalty copy `multiplayer.disclosure.leaveForfeit`. On confirm, `LEAVE_NETWORK_LOBBY_CONFIRMED` runs the original disconnect path. | Confirmation modal mounts; on confirm, lobby fades to setup. |

### Chat Send Pipeline

The `network.chat` path is structured to satisfy the send-side
contract in [`chat-safety.md` §§ 4–6](../../../chat-safety.md#4-normalization):

1. Run `normalizeChatText(input)` (NFKC, control + bidi strip,
   whitespace collapse, length cap 240).
2. Build the envelope; validate against
   [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json).
3. Apply the per-peer token bucket (capacity 5, refill 1/s).
4. On bucket-empty, refuse the send inline and render
   `ui.network-lobby.chat.send.rate-limited` next to the input.
5. Otherwise, dispatch `SEND_LOBBY_CHAT`.

Receive-side handling (validation, `senderId` rewrite, mute/block
filter) lives in `architecture.md` § Chat Receive Pipeline.

### Trust Violation

`OnTrustViolation(peerId, kind)` mounts the trust-violation banner
described in [`spec.md` § Trust](./spec.md#trust):

1. Set `state.net.lobby.trustViolation = { peerId, kind, observedAt }`.
2. Render the banner with the `kind`-specific localized message
   (`ui.network-lobby.trust.<kind>`).
3. Start the 5 s grace-toast timer per
   [`undo-policy.md`](../../../undo-policy.md).
4. After 5 s with no `Stay (read-only)` click, dispatch
   `LEAVE_ROOM`. If the user clicks `Stay (read-only)`, the
   banner stays mounted but no further envelopes are consumed
   from `peerId` and the room transitions to a read-only view
   until the user manually leaves.

`AwaitingDisconnectAttestationToast` is mounted by the
`heartbeat-loss → quorum-attested PEER_DISCONNECTED` flow per
[`abandon-penalty.md`](../../../abandon-penalty.md). On envelope
success, dispatch `RECORD_ABANDON_PENALTY`; on timeout, neither
peer is penalized.

### Connection-Failure Handlers

The lobby exposes four handlers that respond to server-side
failure states (see
[`spec.md` § Connection-Failure States](./spec.md#connection-failure-states)
and [`turn-fallback-policy.md`](../../../turn-fallback-policy.md)):

- **`OnRelayUnavailable`.** Fires when the TURN-down state
  machine in `src/net/webrtc/peer-connection.ts` dispatches
  `CONNECTION_FAILED_RELAY_UNAVAILABLE`. Sets
  `state.net.lobby.errorState = { kind: "relayUnavailable" }`,
  closes the peer connection, and surfaces the lobby
  "Back to setup" button. **No retry storm** — the user must
  re-create the room manually.
- **`OnRateLimited(retryAfterMs)`.** Fires when the signaling
  server emits `RATE_LIMITED` or
  `ERROR { code: "rate_limited" }`. Sets
  `state.net.lobby.errorState = { kind: "rateLimited", retryAfterMs }`;
  the cooldown timer ticks down and re-enables the action button
  on expiry.
- **`OnRoomFull`.** Fires when the signaling server emits
  `ROOM_FULL`. Sets
  `state.net.lobby.errorState = { kind: "roomFull" }` and
  surfaces "Back to setup" → `62-multiplayer-setup`. No
  `room.peers` mutation occurred on the server; no rollback
  required.
- **`OnCodeLocked(cooldownMs)`.** Fires when the signaling server
  emits `ERROR { code: "code_locked" }` after 5 wrong-code
  attempts within 60 s. Sets
  `state.net.lobby.errorState = { kind: "codeLocked", retryAfterMs: cooldownMs }`.

`OnCaptchaRequired(captchaToken, action)` mounts an inline
Cloudflare Turnstile / hCaptcha widget when the signaling server
returns `ERROR { code: "captcha_required", captchaToken, action }`
(per [`signaling-edge-defense.md`](../../../signaling-edge-defense.md)).
On verify, the lobby replays `action` with the verified token; on
dismiss, the lobby flips to `rateLimited` with the operator
cooldown.

### Reconnect Continuity Challenge

When a peer's connection drops and they re-signal, the host emits
a `CHALLENGE` envelope. The roster row for the reconnecting peer
renders `Verifying identity…`; on `CHALLENGE_RESPONSE` success and
DTLS-fingerprint match, dispatch `PIN_DTLS_FINGERPRINT` and
`RECORD_CONTINUITY_CHALLENGE`, then revert the row to its verified
state. On either gate failing, the trust-violation banner takes
over per the rule above.

### Pending Peer Flow

1. Signaling server forwards `PEER_PENDING { peerPubKey, displayNameDraft, joinNonceMs }` to the host.
2. UI mounts `PendingPeerModal` with the joiner's draft display
   name and a short fingerprint of `peerPubKey`.
3. ICE candidates from the pending peer are buffered server-side;
   only `typ relay` candidates flow until approval per
   [`ice-disclosure-policy.md`](../../../ice-disclosure-policy.md).
4. Host dispatches `APPROVE_PEER` or `REJECT_PEER`.
5. On **30 s timeout**, the server emits
   `PEER_REJECTED { reason: "timeout" }` automatically and the
   modal clears.

### Join Attempt Toast

- The signaling server emits
  `JOIN_ATTEMPT_REJECTED { count, sinceMs }` to the host every
  30 s when at least one rejected join (wrong code, denylisted,
  or rate-limited) has occurred since the last emission.
- The UI shows a non-modal toast at thresholds 1, 5, 20:
  e.g. "3 join attempts rejected in the last minute." Loc key:
  `ui.network-lobby.toast.joinAttemptRejected`.
- The toast itself is local UI state; it does not enter the
  command log.

### Leave Confirmation

`network.leave` always routes through
[`60-confirmation-dialog`](../60-confirmation-dialog/) before
`LEAVE_NETWORK_LOBBY_CONFIRMED` actually disconnects. Chain:

1. `network.leave` dispatches `REQUEST_CONFIRMATION` with
   `pendingAction: LEAVE_NETWORK_LOBBY_CONFIRMED`,
   `severity: state.net.lobby.session.phase === 'in-game' ? 'critical' : 'warning'`,
   `confirmDelayMs` defaulted from severity, and
   `requireType: undefined`.
2. Localization keys: `multiplayer.disclosure.leaveForfeit`
   (in-game) and `ui.network-lobby.leave.confirmTitle` (waiting
   room).
3. On `Cancel`, lobby state is unchanged.
4. On `Confirm`, `LEAVE_NETWORK_LOBBY_CONFIRMED` runs the existing
   disconnect path, the audit-log emission rules in
   [`signaling-audit-log.md`](../../../signaling-audit-log.md) still
   apply, and the screen routes to
   [`62-multiplayer-setup`](../62-multiplayer-setup/).

### Peer Trust Display

`PlayerSlotList` renders a `trustLevel` badge per peer derived
from `state.profile.knownPeers`:

| `trustLevel` | Source | Badge |
|---|---|---|
| `friend` | `state.profile.knownPeers.peers[*]` (allowlist) | green `Friend` |
| `recent` | `lastSeenAt` within last 30 days | amber `Recent` |
| `unknown` | otherwise | grey `Unknown` |

The per-row context menu adds `Add to friends` / `Remove from friends`
which dispatch `ADD_PEER_TO_ALLOWLIST` / `REMOVE_PEER_FROM_ALLOWLIST`.
On every successful WebRTC handshake the lobby dispatches
`RECORD_PEER_CONTACT` to refresh `lastSeenAt`. Storage is governed
by [`peer-trust.md`](../../../peer-trust.md) and
[`peer-allowlist.schema.json`](../../../../../content-schema/schemas/peer-allowlist.schema.json);
all writes require
`state.profile.consent.multiplayer.state === 'granted'`.

### Unsigned-Pack Ack (Casual Lobbies)

The `ContentCompatibilityPanel` aggregates pack trust state. When
**any** pack in the session reports `trustState !== 'signed'` and
the lobby is casual (ranked already excludes unsigned via
[`tasks/phase-3/04-polish/03-ranked-play-elo-ladder-plus-ai-pack-sandbox.md`](../../../../../tasks/phase-3/04-polish/03-ranked-play-elo-ladder-plus-ai-pack-sandbox.md)),
the `Launch` button is disabled until **every** peer ticks
`I accept unsigned packs for this session`. The ack
(`ACK_UNSIGNED_PACKS_SESSION`) appends to the consent audit log
under scope `unsignedPacks`, `tier: 'optional'`, `method: 'session'`
and never persists past the session.

### State Changes

- `state.net.sessionId` refreshes `sessionId` after the owning
  reducer or local UI draft changes.
- `state.net.lobby.players` refreshes `players` after the owning
  reducer or local UI draft changes.
- `state.net.lobby.pendingPeers` refreshes `pendingPeers` after
  the signaling server forwards `PEER_PENDING`.
- `state.net.lobby.peerApproval` refreshes the host-side approval
  modal state.
- `state.net.lobby.peerDenylist` refreshes the per-room denylist
  after `KICK_PEER`.
- `state.net.lobby.joinAttemptToast` refreshes the rejected-attempt
  toast counter on `JOIN_ATTEMPT_REJECTED` arrivals.
- `state.net.lobby.chat` refreshes `chatMessages` after the owning
  reducer or local UI draft changes. Items are normalized,
  schema-validated, and `senderId`-rewritten on the receive side
  per [`chat-safety.md` § 3](../../../chat-safety.md#3-envelope-schema).
  Cleared on `LEAVE_NETWORK_LOBBY` and on session end.
- `state.net.lobby.muted`, `.blocked`, and `.chatRateBucket`
  refresh after `MUTE_PEER` / `BLOCK_PEER` / per-message bucket
  decrement. All three slices are presentation-only and never
  enter saves, replays, or the canonical state hash.
- `state.net.lobby.trustViolation` and `state.net.lobby.errorState`
  refresh from the trust-violation and connection-failure handlers
  above; both clear on lobby leave / re-create.
- `selectors.net.lobbyCompatibility` refreshes `compatibility`
  after the owning reducer or local UI draft changes.
- `selectors.net.canLaunchSession` refreshes `launchGuard` after
  the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor,
  drag ghost, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes

- `network.launch` routes to `59-loading-screen` after the launch
  guard approves and the exit animation completes.
- `network.leave` routes to `62-multiplayer-setup` after the
  confirmation chain and exit animation complete.
- `network.closeRoom` (host-only) routes to `62-multiplayer-setup`
  after the server confirms `ROOM_CLOSED`.

### Disabled And Error Cases

- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- `APPROVE_PEER`, `REJECT_PEER`, `KICK_PEER`, `CLOSE_ROOM`,
  `LAUNCH_NETWORK_GAME` are host-only; for non-host peers the
  per-row dots-menu and host buttons hide entirely.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands
  fail loudly.
- On rejection, keep the current screen open, preserve local
  draft when useful, show localized error text, and play failure
  feedback.
- Errors are produced by `formatUserError(err, locale)` declared
  in [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.
- Peer-connection failures render only `peerLabel` and the closed
  `peerFailureReason` enum (`TIMEOUT` / `REFUSED` /
  `NETWORK_ERROR` / `PROTOCOL_MISMATCH`); raw IPs and ICE
  addresses never reach UI or the on-device crash log per
  [`spec.md` § Peer-Failure Error Contract](./spec.md#peer-failure-error-contract).
- Signaling join failures collapse to the closed wire enum
  (`JOIN_FAILED` / `RATE_LIMITED` / `SERVER_ERROR`) per
  [`signaling-error.schema.json`](../../../../../content-schema/schemas/signaling-error.schema.json)
  and [`services/signaling/error-codes.md`](../../../../../services/signaling/error-codes.md);
  the `OWNER_NOTICE` channel surfaces a richer reason to the
  host only.

### Out of M5 Scope

- **Spectator slots are not in M5.** The lobby renders only the 2
  active player slots (per the M5 cap in
  [`tasks/phase-3/01-multiplayer.md`](../../../../../tasks/phase-3/01-multiplayer.md)).
  Spectator UI, slot acquisition, and observer-mode commands are
  deferred under [`DEF-002`](../../../../planning/deferred.md).
  Implementers MUST NOT add spectator slots, observer roles, or
  "watch the match" affordances until that deferral closes.

### Error Surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
|---|---|---|---|---|
| Toggle ready (`SET_LOBBY_READY`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*; transient packet loss may downgrade to a toast. |
| Send chat (`SEND_LOBBY_CHAT`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*; transient packet loss may downgrade to a toast. |
| Change slot (`REQUEST_LOBBY_SLOT_CHANGE`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*; transient packet loss may downgrade to a toast. |
| Approve pending peer (`APPROVE_PEER`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
| Reject pending peer (`REJECT_PEER`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
| Kick peer (`KICK_PEER`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |
| Mute peer (`MUTE_PEER`) | NET_REJECTED | toast | `error.net.rejected.body` | override — local-only; failure path is a toast, not a modal. |
| Block peer (`BLOCK_PEER`) | NET_REJECTED | toast | `error.net.rejected.body` | override — local-only (superset of mute); failure path is a toast. |
| Report peer (`REPORT_PEER`) | NET_REJECTED | toast | `error.net.rejected.body` | override — local audit-log write; failure path is a toast. |
| Save chat log (`EXPORT_CHAT_LOG`) | STORAGE_REJECTED | toast | `error.storage.rejected.body` | override — local file save; failure path is a toast. |
| Dismiss trust banner (`ACKNOWLEDGE_CHAT_TRUST_BANNER`) | STORAGE_REJECTED | toast | `error.storage.rejected.body` | override — `localStorage` write; failure path is a toast and the banner stays mounted. |
| Close room (`CLOSE_ROOM`) | NET_REJECTED | modal | `error.net.rejected.body` | Default per `error-ux.md` § 2 NET_*. |

### AI Implementation Notes

- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions
  rather than inventing new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Every action ID in the table matches a
  `data-action` attribute or aligned component name in
  `mockup.html`, and the component names match sibling
  `spec.md` § Component Tree. Copy strings (`ui.network-lobby.*`)
  match sibling `data-contracts.md` § Localization Keys.
- **Schema: ✔** — `chat-message.schema.json`,
  `report-bundle.schema.json`, and `peer-allowlist.schema.json`
  references resolve; closed `peerFailureReason` enum matches
  sibling `data-contracts.md` § Closed Enums and `spec.md` §
  Peer-Failure Error Contract.
- **Tasks: ✔** — Every dispatched token is registered in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Owning UI task
  [`08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  reads this file; reducer-side ownership is split across tasks
  14 / 17 / 18 / 19 / 21 / 26 / 27 / 28 / 35 under
  `tasks/phase-3/01-multiplayer/`.

## ⚠ Issues

- **`localStorage` write outside the persistence allowlist.**
  `ACKNOWLEDGE_CHAT_TRUST_BANNER` writes to `localStorage`; see
  sibling `spec.md` § ⚠ Issues for the cross-doc gap (mirrored
  from [`chat-safety.md` ⚠ Issues](../../../chat-safety.md#-issues)).
  Owning fix: task
  [`18-mute-block-and-trust-banner`](../../../../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md).
