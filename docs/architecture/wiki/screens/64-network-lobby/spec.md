# Screen 64: Network Lobby

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Network lobby for hosted/joined multiplayer sessions, ready state, chat, content hash checks, slot assignment, and launch. Capped at 2 peers per room (M5); the host's invite copy reads "share invite link with secret embedded" so the room-secret in the URL fragment is preserved end-to-end.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Lobby table with player list, color/team slots, ready seals, chat parchment, content compatibility panel, and Launch/Leave buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- NetworkLobby
  - SessionHeader
  - PlayerSlotList
    - PlayerSlotRowDotsMenu
    - MutedBadge
  - ReadyStateSeals
  - ChatPanel
    - ChatTrustBanner
    - ChatPanelOverflowMenu
  - ContentCompatibilityPanel
  - LaunchLeaveButtons
  - HostCloseRoomButton
  - PendingPeerModal
  - JoinAttemptToast
  - ReportPeerDialog

`PlayerSlotRowDotsMenu`, `HostCloseRoomButton`, and the per-slot moderation row are host-only — they render disabled (or hide entirely) for non-host peers. `PendingPeerModal` mounts when `state.net.lobby.pendingPeers.length > 0`. `JoinAttemptToast` is non-modal and surfaces aggregated `JOIN_ATTEMPT_REJECTED` counts at thresholds 1, 5, 20. `MutedBadge` renders next to a roster row when the local user has muted or blocked that peer. `ChatTrustBanner` mounts above the chat input on first lobby session and dismisses to `localStorage` per [`chat-safety.md` § 10](../../../chat-safety.md#10-trust-model-disclosure). `ChatPanelOverflowMenu` exposes "Save chat log" (`EXPORT_CHAT_LOG`). `ReportPeerDialog` mounts on `network.reportPeer` and produces a `report-bundle.schema.json`-conformant download.

### Trust

The lobby renders three identity-trust affordances:

- **Verified-key icon** — appears next to every roster row whose
  `peerPubKey` matches the signature on the latest signed signaling
  envelope (per
  [`signaling-envelope.md`](../../../signaling-envelope.md)). Rows
  awaiting their first envelope render with a `(unverified)` suffix
  on the display name.
- **Trust-violation banner** — mounts above the player slot list
  when `state.net.lobby.trustViolation` is set. Renders the
  `kind`-specific localized message from
  [`peer-identity.md`](../../../peer-identity.md),
  [`signaling-envelope.md`](../../../signaling-envelope.md),
  [`dtls-fingerprint-pinning.md`](../../../dtls-fingerprint-pinning.md),
  [`command-stream-integrity.md`](../../../command-stream-integrity.md).
  Uses the 5-second grace toast pattern from
  [`undo-policy.md`](../../../undo-policy.md): the user sees the
  banner, the room transitions to
  `awaitingTrustViolationDecision`, and `LEAVE_ROOM` dispatches
  after 5 s unless the user clicks `Stay (read-only)`.
- **Reconnect-challenge UI** — while a peer reconnects, the row
  shows `Verifying identity…` until the
  `RECORD_CONTINUITY_CHALLENGE` round-trip resolves
  (per [`diagrams/31-reconnect-continuity-challenge.md`](../../../diagrams/31-reconnect-continuity-challenge.md));
  on success, the row reverts to the verified state. On failure,
  the trust-violation banner takes over.

`AwaitingDisconnectAttestationToast` mounts during the 30-second
window between heartbeat-loss observation and the host-signed
`PEER_DISCONNECTED` envelope (per
[`abandon-penalty.md`](../../../abandon-penalty.md)). On envelope
success, the toast flips to `Forfeit confirmed`; on timeout, the
banner reads `Disconnect attestation failed — match aborted`
and no penalty is recorded.

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
| --- | --- | --- |
| `relayUnavailable` | "Direct connection blocked — try a different network or wait a moment and retry." | Single button: "Back to setup" → `62-multiplayer-setup`. |
| `rateLimited` | "Too many attempts. Try again in {{retryAfterSeconds}} s." | Disabled button until cooldown elapses. |
| `roomFull` | "This room is full." | Single button: "Back to setup" → `62-multiplayer-setup`. |
| `codeLocked` | "Too many wrong codes against this room. Try again in {{cooldownSeconds}} s." | Disabled button until cooldown elapses. |

The `relayUnavailable` state is reached only after the single
TURN-refresh retry pinned by
[`turn-fallback-policy.md`](../../../turn-fallback-policy.md);
the lobby never silently retries, never auto-falls-through to a
relay-only configuration, and never renders "Connecting…"
indefinitely.

A fifth transient state, `captchaRequired`, mounts an inline
Turnstile / hCaptcha verifier when the signaling server returns
`ERROR { code: "captcha_required", captchaToken }`. On verify,
the lobby retries the originating action with the verified token;
on dismiss, the lobby falls back to `rateLimited` with the
operator-configured cooldown.

### Peer-Failure Error Contract

When a peer connection fails (timeout, refused, network error, protocol
mismatch), the only fields rendered to UI are:

- `peerLabel` — the display-name string the user already saw, never a
  raw IP / ICE address; resolved from `state.net.lobby.players`.
- `reason` — a closed enum
  `peerFailureReason: 'TIMEOUT' | 'REFUSED' | 'NETWORK_ERROR' | 'PROTOCOL_MISMATCH'`.

Peer IPs and ICE candidate addresses **never** appear in any
user-visible string and **never** appear in the on-device crash log
file; the redactor in [`error-formatter.md` § 3](../../../error-formatter.md#3-redaction-allowlist)
strips them via the IP-pattern allowlist. The thrown error is
tagged `redact: true` so the formatter scrubs the cause chain in
production builds.

A dev-only debug surface (gated by `__DEV__` per
[`production-build.md` rule 1](../../../production-build.md#1-__dev__-is-constant-folded))
may render the raw ICE candidate list — but only when the build flag
is on. There is no production code path that reaches the raw
candidate set from this screen.

The peer-connection task in
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
inherits this contract via task **22-10**.

### Rendering Safety
- `ChatPanel` renders chat `text` via `{text}` JSX binding only. **No `dangerouslySetInnerHTML`. No markdown library. No link auto-detector.** A CI / lint rule fails the build on any `dangerouslySetInnerHTML` usage under the lobby chat surface.
- Inbound chat envelopes are normalized (NFKC, control + bidi strip, length cap 240) and schema-validated against [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json) **before** they reach the reducer or the renderer.
- Inbound `senderId` is rewritten to the transport peer's canonical id at ingress so peers cannot inject envelopes claiming to be other peers.
- The full rendering, normalization, channel-reservation, rate-limit, mute / block, and report contracts live in [`docs/architecture/chat-safety.md`](../../../chat-safety.md).

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| sessionId | state.net.sessionId | Network session identifier. |
| players | state.net.lobby.players | Connected players and slot assignment. Each row carries `peerPubKey` per [`peer-identity.md`](../../../peer-identity.md). |
| pendingPeers | state.net.lobby.pendingPeers | Pending-peer queue from `PEER_PENDING`. |
| peerApproval | state.net.lobby.peerApproval | Host-side approval modal lifecycle. |
| peerDenylist | state.net.lobby.peerDenylist | Per-room kick denylist; ephemeral. |
| joinAttemptToast | state.net.lobby.joinAttemptToast | Aggregated rejected-join counter from `JOIN_ATTEMPT_REJECTED`. |
| chatMessages | state.net.lobby.chat | Lobby chat log. Items conform to `chat-message.schema.json` after receive-side normalization, schema validation, and `senderId` rewrite per [`chat-safety.md` § 3](../../../chat-safety.md#3-envelope-schema). |
| muted | state.net.lobby.muted | Local-only mute slice keyed by `peerId`. Drives `MutedBadge` and the `ChatPanel` filter. Never enters saves, replays, or the canonical state hash. |
| blocked | state.net.lobby.blocked | Local-only block slice keyed by `peerId`. Superset of mute; also strips the peer's history from the rendered chat log. |
| chatTrustBannerDismissed | localStorage `hr.ui.lobby.chat.trust-banner.dismissed` | Persisted boolean; suppresses `ChatTrustBanner` after first dismissal. |
| compatibility | selectors.net.lobbyCompatibility | Hash/version/ruleset match result. |
| launchGuard | selectors.net.canLaunchSession | All ready and compatible. |

### Mechanics Mapping
- Lobby state mirrors authoritative host/session messages. Launch is enabled only when content hashes, slots, scenario, teams, and ready state all match.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### Out of M5 Scope
- **Spectator slots are not in M5.** This screen renders only the 2 active player slots (per the M5 cap in [`tasks/phase-3/01-multiplayer.md`](../../../../../tasks/phase-3/01-multiplayer.md)). Spectator UI, slot acquisition, and observer-mode commands are deferred under [`DEF-002`](../../../../planning/deferred.md). Implementers MUST NOT add spectator slots, observer roles, or "watch the match" affordances to this screen until that deferral is closed by a future plan.
- **Public lobby browser, friends list, and presence are not in M5.** Invite-link only; deferred under [`DEF-016`](../../../../planning/deferred.md).

### AI Implementation Notes
- Screen slug: `network-lobby`; system group: `multiplayer`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
