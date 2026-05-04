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
