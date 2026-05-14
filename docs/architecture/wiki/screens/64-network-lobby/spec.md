# Screen 64: Network Lobby

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Hosted/joined multiplayer waiting room. Owns ready state, lobby
chat, content-hash compatibility, slot assignment, host moderation,
and launch. Capped at **2 active player slots** in M5.

The invite-link itself (host copy, QR code, fragment handling) is
owned by sibling screen [`62-multiplayer-setup`](../62-multiplayer-setup/);
this screen renders the resulting session and roster.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.
- Curation status: `curated-pass-6`.
- Fixed 800×600 layout, ornate gold frame, red/brown/stone panels,
  compact icon slots, right-click detail affordances, bottom
  status/resource feedback.
- Visible regions: session header, player slot list, ready seals,
  chat parchment, content-compatibility panel, Launch/Leave buttons.
- `mockup.html` carries the visible UI only — logic, transitions,
  and timing live in the Markdown sibling files.

### Component Tree

```
NetworkLobby
├── SessionHeader
├── PlayerSlotList
│   ├── PlayerSlotRowDotsMenu      (host-only)
│   └── MutedBadge
├── ReadyStateSeals
├── ChatPanel
│   ├── ChatTrustBanner
│   └── ChatPanelOverflowMenu
├── ContentCompatibilityPanel
├── LaunchLeaveButtons
├── HostCloseRoomButton            (host-only)
├── PendingPeerModal               (mounts when pendingPeers > 0)
├── JoinAttemptToast               (non-modal, thresholds 1, 5, 20)
└── ReportPeerDialog               (mounts on network.reportPeer)
```

| Component | Mount / visibility |
|---|---|
| `PlayerSlotRowDotsMenu`, `HostCloseRoomButton`, per-slot moderation row | Host-only; render disabled (or hide) for non-host peers. |
| `PendingPeerModal` | Mounts when `state.net.lobby.pendingPeers.length > 0`. |
| `JoinAttemptToast` | Non-modal; surfaces aggregated `JOIN_ATTEMPT_REJECTED` counts at thresholds 1, 5, 20. |
| `MutedBadge` | Renders next to a roster row when the local user has muted or blocked that peer. |
| `ChatTrustBanner` | Mounts above chat input on first lobby session; dismisses to `localStorage` per [`chat-safety.md` § 10](../../../chat-safety.md#10-trust-model-disclosure). |
| `ChatPanelOverflowMenu` | Exposes "Save chat log" (`EXPORT_CHAT_LOG`). |
| `ReportPeerDialog` | Produces a [`report-bundle.schema.json`](../../../../../content-schema/schemas/report-bundle.schema.json)-conformant download. |

### Trust

Three identity-trust affordances ride the roster:

- **Verified-key icon.** Appears next to every roster row whose
  `peerPubKey` matches the signature on the latest signed signaling
  envelope (per [`signaling-envelope.md`](../../../signaling-envelope.md)).
  Rows awaiting their first envelope render with an `(unverified)`
  suffix on the display name.
- **Trust-violation banner.** Mounts above the player slot list
  when `state.net.lobby.trustViolation` is set. Renders the
  `kind`-specific localized message
  (`ui.network-lobby.trust.<kind>`) and uses the 5-second grace
  toast pattern from [`undo-policy.md`](../../../undo-policy.md):
  the room transitions to `awaitingTrustViolationDecision`, and
  `LEAVE_ROOM` dispatches after 5 s unless the user clicks
  `Stay (read-only)`. Authoritative `kind` enum is owned by
  [`command-schema.md` § Multiplayer Trust & Identity Commands](../../../command-schema.md#multiplayer-trust--identity-commands)
  (token `TRUST_VIOLATION_DETECTED`); supporting docs:
  [`peer-identity.md`](../../../peer-identity.md),
  [`dtls-fingerprint-pinning.md`](../../../dtls-fingerprint-pinning.md),
  [`command-stream-integrity.md`](../../../command-stream-integrity.md).
- **Reconnect-challenge UI.** While a peer reconnects, the row
  shows `Verifying identity…` until the
  `RECORD_CONTINUITY_CHALLENGE` round-trip resolves (per
  [`diagrams/31-reconnect-continuity-challenge.md`](../../../diagrams/31-reconnect-continuity-challenge.md)).
  On success the row reverts to verified; on failure the
  trust-violation banner takes over.

`AwaitingDisconnectAttestationToast` mounts during the 30 s window
between heartbeat-loss observation and the host-signed
`PEER_DISCONNECTED` envelope (per
[`abandon-penalty.md`](../../../abandon-penalty.md)). On envelope
success the toast flips to `Forfeit confirmed`; on timeout the
banner reads `Disconnect attestation failed — match aborted` and
no penalty is recorded.

### Connection-Failure States

When the lobby cannot proceed because of a server-side throttle,
a TURN-relay failure, or a room-capacity issue, the screen renders
one of four named failure states. Each binds to
`state.net.lobby.errorState.kind` (see
[`data-contracts.md`](./data-contracts.md)) and overlays a
non-modal toast plus a single button. Per
[`turn-fallback-policy.md`](../../../turn-fallback-policy.md) and
[`signaling-edge-defense.md`](../../../signaling-edge-defense.md).

| `kind` | Copy | Action |
|---|---|---|
| `relayUnavailable` | "Direct connection blocked — try a different network or wait a moment and retry." | Button: "Back to setup" → `62-multiplayer-setup`. |
| `rateLimited` | "Too many attempts. Try again in {{retryAfterSeconds}} s." | Button disabled until cooldown elapses. |
| `roomFull` | "This room is full." | Button: "Back to setup" → `62-multiplayer-setup`. |
| `codeLocked` | "Too many wrong codes against this room. Try again in {{cooldownSeconds}} s." | Button disabled until cooldown elapses. |

`relayUnavailable` is reached only **after** the single TURN-refresh
retry pinned by
[`turn-fallback-policy.md`](../../../turn-fallback-policy.md);
the lobby never silently retries, never auto-falls-through to a
relay-only configuration, and never renders "Connecting…"
indefinitely.

A fifth transient state, `captchaRequired`, mounts an inline
Turnstile / hCaptcha verifier when the signaling server returns
`ERROR { code: "captcha_required", captchaToken }`. On verify, the
lobby retries the originating action with the verified token; on
dismiss, the lobby falls back to `rateLimited` with the
operator-configured cooldown.

### Peer-Failure Error Contract

When a peer connection fails (`TIMEOUT`, `REFUSED`,
`NETWORK_ERROR`, `PROTOCOL_MISMATCH`), the only fields rendered
to UI are:

- `peerLabel` — the display-name string the user already saw;
  resolved from `state.net.lobby.players`. **Never** a raw IP /
  ICE address.
- `reason` — the closed enum `peerFailureReason: 'TIMEOUT' |
  'REFUSED' | 'NETWORK_ERROR' | 'PROTOCOL_MISMATCH'`.

Peer IPs and ICE candidate addresses **never** reach a user-visible
string and **never** reach the on-device crash log file; the
redactor in
[`error-formatter.md` § 3](../../../error-formatter.md#3-redaction-allowlist)
strips them via the IP-pattern allowlist. The thrown error carries
`redact: true` so the formatter scrubs the cause chain in
production builds.

A dev-only debug surface (gated by `__DEV__` per
[`production-build.md` rule 1](../../../production-build.md#1-__dev__-is-constant-folded))
may render the raw ICE candidate list — but only when the build
flag is on. No production code path reaches the raw candidate set
from this screen.

The peer-connection task in
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
inherits this contract via task
[`21-peer-failure-ui-contract.md`](../../../../../tasks/phase-3/01-multiplayer/21-peer-failure-ui-contract.md).

### Rendering Safety

- `ChatPanel` renders chat `text` via `{text}` JSX binding only.
  **No `dangerouslySetInnerHTML`. No markdown library. No link
  auto-detector.** A CI / lint rule fails the build on any
  `dangerouslySetInnerHTML` usage under the lobby chat surface.
- Inbound chat envelopes are normalized (NFKC, control + bidi
  strip, length cap 240) and schema-validated against
  [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json)
  **before** they reach the reducer or the renderer.
- Inbound `senderId` is rewritten to the transport peer's
  canonical id at ingress so peers cannot inject envelopes
  claiming to be other peers.
- The full rendering, normalization, channel-reservation,
  rate-limit, mute / block, and report contracts live in
  [`chat-safety.md`](../../../chat-safety.md).

### State Bindings

| Element | Bound To | Notes |
|---|---|---|
| `sessionId` | `state.net.sessionId` | Network session identifier. |
| `players` | `state.net.lobby.players` | Roster + slot assignment; each row carries `peerPubKey` per [`peer-identity.md`](../../../peer-identity.md). |
| `pendingPeers` | `state.net.lobby.pendingPeers` | Pending-peer queue from `PEER_PENDING`. |
| `peerApproval` | `state.net.lobby.peerApproval` | Host-side approval modal lifecycle. |
| `peerDenylist` | `state.net.lobby.peerDenylist` | Per-room kick denylist; ephemeral. |
| `joinAttemptToast` | `state.net.lobby.joinAttemptToast` | Aggregated rejected-join counter from `JOIN_ATTEMPT_REJECTED`. |
| `chatMessages` | `state.net.lobby.chat` | Lobby chat log; entries conform to [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json) after receive-side normalization, schema validation, and `senderId` rewrite per [`chat-safety.md` § 3](../../../chat-safety.md#3-envelope-schema). |
| `muted` | `state.net.lobby.muted` | Local-only mute slice keyed by `peerId`. Drives `MutedBadge` and the `ChatPanel` filter. Never enters saves, replays, or the canonical state hash. |
| `blocked` | `state.net.lobby.blocked` | Local-only block slice keyed by `peerId`. Superset of mute; also strips the peer's existing history from the rendered chat log. |
| `chatRateBucket` | `state.net.lobby.chatRateBucket` | Per-peer token-bucket slice (capacity 5, refill 1/s). Reset on lobby leave/join. Never enters saves, replays, or the canonical state hash. |
| `chatTrustBannerDismissed` | `localStorage` `hr.ui.lobby.chat.trust-banner.dismissed` | Persisted boolean; suppresses `ChatTrustBanner` after first dismissal. See `## ⚠ Issues` — currently outside the persistence allowlist. |
| `trustViolation` | `state.net.lobby.trustViolation` | `{ peerId, kind, observedAt }`; drives the trust-violation banner and the 5 s grace-toast leave. Never persisted. |
| `errorState` | `state.net.lobby.errorState` | Closed shape `{ kind, retryAfterMs?, captchaToken?, message? }`; drives the **Connection-Failure States** above. Cleared on lobby leave / re-create. Never persisted. |
| `unsignedPacksAck` | `state.net.lobby.unsignedPacksAck` | Per-peer ack flag for the casual unsigned-pack gate; cleared on session end. |
| `knownPeers` | `state.profile.knownPeers` | LRU 256 per [`peer-allowlist.schema.json`](../../../../../content-schema/schemas/peer-allowlist.schema.json); drives `trustLevel` badges per [`peer-trust.md`](../../../peer-trust.md). |
| `compatibility` | `selectors.net.lobbyCompatibility` | Hash/version/ruleset match result, including per-pack `trustState` aggregated into `lobby.compatibility.signatureGate.requiresAck`. |
| `launchGuard` | `selectors.net.canLaunchSession` | All ready and compatible. Casual lobbies additionally require every peer's `unsignedPacksAck` when `signatureGate.requiresAck === true`. |

### Mechanics Mapping

- Lobby state mirrors authoritative host/session messages. Launch
  is enabled only when content hashes, slots, scenario, teams, and
  ready state all match.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, not
  hardcoded view logic.

### Animation Contract

- Player rows slide in/out, ready seals stamp, chat messages
  scroll, hash mismatch flashes red, launch fades to loading.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### Out of M5 Scope

- **Spectator slots are not in M5.** Renders only the 2 active
  player slots (per the M5 cap in
  [`tasks/phase-3/01-multiplayer.md`](../../../../../tasks/phase-3/01-multiplayer.md)).
  Spectator UI, slot acquisition, and observer-mode commands are
  deferred under
  [`DEF-002`](../../../../planning/deferred.md). Implementers MUST
  NOT add spectator slots, observer roles, or "watch the match"
  affordances until that deferral closes.
- **Public lobby browser, friends list, and presence are not in
  M5.** Invite-link only; deferred under
  [`DEF-016`](../../../../planning/deferred.md).

### AI Implementation Notes

- Screen slug: `network-lobby`; system group: `multiplayer`;
  curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs /
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, copy strings (`relayUnavailable`,
  `rateLimited`, `roomFull`, `codeLocked`, trust-banner, chat
  panel) match `mockup.html`, sibling `interactions.md`, and
  sibling `data-contracts.md` exactly.
- **Schema: ✔** — `chat-message.schema.json`,
  `report-bundle.schema.json`, `peer-allowlist.schema.json`, and
  `signaling-error.schema.json` are all registered in
  [`schema-matrix.md`](../../../schema-matrix.md); the
  `peerFailureReason` closed enum (`TIMEOUT | REFUSED |
  NETWORK_ERROR | PROTOCOL_MISMATCH`) matches sibling
  `data-contracts.md` § Closed Enums.
- **Tasks: ✔** — Owning UI task
  [`08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  lists all four package files in `Read First`. All command
  tokens used here (`SET_LOBBY_READY`, `SEND_LOBBY_CHAT`,
  `REQUEST_LOBBY_SLOT_CHANGE`, `APPROVE_PEER`, `REJECT_PEER`,
  `KICK_PEER`, `MUTE_PEER`, `BLOCK_PEER`, `REPORT_PEER`,
  `EXPORT_CHAT_LOG`, `ACKNOWLEDGE_CHAT_TRUST_BANNER`,
  `CLOSE_ROOM`, `LAUNCH_NETWORK_GAME`,
  `LEAVE_NETWORK_LOBBY_CONFIRMED`,
  `ADD_PEER_TO_ALLOWLIST`, `REMOVE_PEER_FROM_ALLOWLIST`,
  `RECORD_PEER_CONTACT`, `ACK_UNSIGNED_PACKS_SESSION`,
  `TRUST_VIOLATION_DETECTED`, `PIN_DTLS_FINGERPRINT`,
  `RECORD_CONTINUITY_CHALLENGE`, `RECORD_ABANDON_PENALTY`) are
  registered in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).

## ⚠ Issues

- **`chatTrustBannerDismissed` writes to `localStorage` outside
  the persistence allowlist.** This file (State Bindings) and
  sibling `data-contracts.md` both bind
  `hr.ui.lobby.chat.trust-banner.dismissed` to `localStorage`,
  echoing [`chat-safety.md` § 10](../../../chat-safety.md#10-trust-model-disclosure).
  Per [`persistence.md` § 2](../../../persistence.md#2-localstorage-ban),
  the `localStorage` allowlist is currently empty and the CI lint
  rule in `scripts/check-repo-contracts.mjs` will fail the build.
  Mirrored from [`chat-safety.md` ⚠ Issues](../../../chat-safety.md#-issues);
  owning fix lives in task
  [`18-mute-block-and-trust-banner`](../../../../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md)
  (route the flag through IndexedDB `hr-profile.options` and add a
  `data-inventory.md` row, OR amend `persistence.md` § 2). Skill
  did not edit `persistence.md`, `data-inventory.md`, or the
  owning task (Hard Prohibition D).
- **`trustViolation`, `errorState`, `unsignedPacksAck`,
  `chatRateBucket` slices have no `data-inventory.md` rows.**
  Sibling `data-contracts.md` and this file describe them as
  in-memory only (never saved, never replayed, never hashed), and
  [`data-inventory.md`](../../../data-inventory.md) lists only the
  `state.net.lobby.chat` transient row. Per CLAUDE.md root
  contract, transient slices are not strictly required to register;
  surfaced here so a future inventory pass can confirm the policy.
  Suggested fix (optional): add explicit "transient — not
  persisted" rows for parity with the `lobby chat (transient)`
  entry. Owning task: [`08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md).
