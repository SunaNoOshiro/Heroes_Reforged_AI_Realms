# Screen 64: Network Lobby
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, and save/load metadata. | `content-schema/schemas/scenario.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| `chat-message.schema.json` | Lobby chat envelope; carried over the dedicated `chat` DataChannel; receive-side validation contract per [`chat-safety.md` § 3](../../../chat-safety.md#3-envelope-schema). | `content-schema/schemas/chat-message.schema.json` |
| `report-bundle.schema.json` | Local-only evidence bundle produced by `REPORT_PEER` per [`chat-safety.md` § 8](../../../chat-safety.md#8-report). | `content-schema/schemas/report-bundle.schema.json` |
| `signaling-error.schema.json` | Closed signaling-server error vocabulary; `wire` payloads collapse to `JOIN_FAILED` / `RATE_LIMITED` / `SERVER_ERROR`; richer reasons surface via `OWNER_NOTICE` per [`services/signaling/error-codes.md`](../../../../../services/signaling/error-codes.md). | `content-schema/schemas/signaling-error.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Closed Enums

- `peerFailureReason: 'TIMEOUT' \| 'REFUSED' \| 'NETWORK_ERROR' \| 'PROTOCOL_MISMATCH'` —
  the only reason value rendered to UI on a peer-connection failure.
  See [`spec.md` § Peer-Failure Error Contract](./spec.md#peer-failure-error-contract).

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `sessionId` | `state.net.sessionId` | Network session identifier. |
| `players` | `state.net.lobby.players` | Connected players and slot assignment. Each row carries `peerPubKey` per [`docs/architecture/peer-identity.md`](../../../peer-identity.md). |
| `pendingPeers` | `state.net.lobby.pendingPeers` | Pending-peer queue surfaced from `PEER_PENDING`; entries `{ peerPubKey, displayNameDraft, joinNonceMs }`. |
| `peerApproval` | `state.net.lobby.peerApproval` | Host-side approval modal binding (open / closed / approving / rejecting). |
| `peerDenylist` | `state.net.lobby.peerDenylist` | Per-room denylist; entries `{ peerPubKey, reason, bannedAtMs }` per [`docs/architecture/peer-identity.md` § 3](../../../peer-identity.md#3-peerdenylist-shape). |
| `joinAttemptToast` | `state.net.lobby.joinAttemptToast` | Aggregated rejected-attempt counter; surfaces the toast at thresholds 1, 5, 20. |
| `chatMessages` | `state.net.lobby.chat` | Lobby chat log. Items conform to [`chat-message.schema.json`](../../../../../content-schema/schemas/chat-message.schema.json) after receive-side normalization, schema validation, and `senderId` rewrite per [`chat-safety.md` § 3](../../../chat-safety.md#3-envelope-schema). Display-name validation per [`docs/architecture/display-name-policy.md`](../../../display-name-policy.md). |
| `muted` | `state.net.lobby.muted` | Local-only mute slice keyed by `peerId`; entries `{ peerId, scope: 'session' \| 'persistent', mutedAtMs }` per [`chat-safety.md` § 7](../../../chat-safety.md#7-mute--block). Never enters saves, replays, or the canonical state hash. |
| `blocked` | `state.net.lobby.blocked` | Local-only block slice keyed by `peerId`; superset of mute. Never enters saves, replays, or the canonical state hash. |
| `chatRateBucket` | `state.net.lobby.chatRateBucket` | Per-peer token-bucket slice (capacity 5, refill 1/s). Reset on lobby leave/join. Never enters saves, replays, or the canonical state hash. |
| `compatibility` | `selectors.net.lobbyCompatibility` | Hash/version/ruleset match result, including per-pack `trustState: 'signed' \| 'unsigned' \| 'invalid-signature'` aggregated into `lobby.compatibility.signatureGate.requiresAck`. |
| `launchGuard` | `selectors.net.canLaunchSession` | All ready and compatible. Casual lobbies additionally require every peer's `unsignedPacksAck` when `signatureGate.requiresAck === true`. |
| `knownPeers` | `state.profile.knownPeers` | [`peer-allowlist.schema.json`](../../../../../content-schema/schemas/peer-allowlist.schema.json) — capped LRU. |
| `peerTrustLevel(peerId)` | `selectors.net.peerTrustLevel` | Closed enum `'friend' \| 'recent' \| 'unknown'` per [`peer-trust.md`](../../../peer-trust.md). |
| `unsignedPacksAck` | `state.net.lobby.unsignedPacksAck` | Per-peer ack flag for the casual unsigned-pack gate; cleared on session end. |

### Display Name Validation
- Every `displayName` and `displayNameDraft` field on this screen MUST be validated through `validateDisplayName(...)` per [`docs/architecture/display-name-policy.md`](../../../display-name-policy.md). NFC normalization, 1–24 grapheme cluster bound, category rejection (Cf, Cc, Co, zero-width, bidi overrides), reserved-name list, UTS #39 confusable collision check.
- The signaling server **never** sees a display name (per [`docs/architecture/signaling-payload-policy.md`](../../../signaling-payload-policy.md)); names are exchanged over the WebRTC DataChannel after host approval.

### Commands And Events
- `SET_LOBBY_READY` from `network.ready`: Sends ready state to host/session.
- `SEND_LOBBY_CHAT` from `network.chat`: Sends chat message.
- `REQUEST_LOBBY_SLOT_CHANGE` from `network.slot`: Requests color/team/control slot change.
- `APPROVE_PEER` from `network.approvePeer`: Host approves a pending peer; clears the `PEER_PENDING` envelope.
- `REJECT_PEER` from `network.rejectPeer`: Host rejects a pending peer.
- `KICK_PEER` from `network.kickPeer`: Host kicks an approved peer; appends `peerPubKey` to `peerDenylist[]`.
- `MUTE_PEER` from `network.mutePeer`: Local-only; suppresses chat from a peer. Args `{ peerId, scope: 'session' \| 'persistent' }`. Persistent variant gated on the long-lived peer key from the TLS / WebRTC authentication plan.
- `BLOCK_PEER` from `network.blockPeer`: Local-only; superset of mute. Args `{ peerId }`.
- `REPORT_PEER` from `network.reportPeer`: Opens `ReportPeerDialog`. Generates a [`report-bundle.schema.json`](../../../../../content-schema/schemas/report-bundle.schema.json)-conformant download; no central server in M5. Also writes a `signaling.report.*` audit-log record.
- `EXPORT_CHAT_LOG` from `network.exportChatLog`: Serializes `state.net.lobby.chat` to a single-file download. Args `{ format: 'json' \| 'txt' }`.
- `ACKNOWLEDGE_CHAT_TRUST_BANNER` from `network.dismissChatTrustBanner`: Persists the banner-dismiss flag in `localStorage`.
- `CLOSE_ROOM` from `network.closeRoom`: Host-initiated room close; signaling server emits `ROOM_CLOSED`.
- `LAUNCH_NETWORK_GAME` from `network.launch`: Host starts deterministic session.
- `LEAVE_NETWORK_LOBBY_CONFIRMED` from confirmation chain: Disconnects or leaves lobby. Always preceded by `REQUEST_CONFIRMATION` per [`interactions.md` § Leave Confirmation](./interactions.md#leave-confirmation).
- `ADD_PEER_TO_ALLOWLIST` from per-row context menu: Adds the peer to `state.profile.knownPeers`; gated on `state.profile.consent.multiplayer.state === 'granted'`.
- `REMOVE_PEER_FROM_ALLOWLIST` from per-row context menu: Removes the peer from `state.profile.knownPeers`.
- `RECORD_PEER_CONTACT` from successful WebRTC handshake: Refreshes `lastSeenAt` for the peer; emitted by the lobby reducer, not by user input.
- `ACK_UNSIGNED_PACKS_SESSION` from the unsigned-pack gate: Records the per-peer session ack; appends a `consent-audit-log` row with scope `unsignedPacks`, `tier: 'optional'`, `method: 'session'`.

### Server-Side Notifications
- `PEER_PENDING { peerPubKey, displayNameDraft, joinNonceMs }` — populates `pendingPeers`.
- `PEER_REJECTED { reason }` — surfaces to the joiner that was rejected.
- `PEER_KICKED { reason }` — surfaces to the kicked peer; client closes the lobby.
- `JOIN_ATTEMPT_REJECTED { count, sinceMs }` — populates `joinAttemptToast`; emitted at most once per 30 s per host.
- `ROOM_EXPIRED { reason: "idle" | "max_lifetime" }` — server-initiated TTL expiry; client routes back to `62-multiplayer-setup`.
- `ROOM_CLOSED { reason: "host_closed" }` — host-initiated close; client routes back to `62-multiplayer-setup`.
- `RATE_LIMITED { tier, retryAfterMs, reason }` — throttle reply per [`docs/architecture/signaling-rate-limits.md`](../../../signaling-rate-limits.md).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.network-lobby.title`
- `ui.network-lobby.actions.*`
- `ui.network-lobby.status.*`
- `ui.network-lobby.errors.*`
- `ui.network-lobby.toast.joinAttemptRejected`
- `ui.network-lobby.modal.pendingPeer.*`
- `ui.network-lobby.dots.kick`
- `ui.network-lobby.dots.mute`
- `ui.network-lobby.dots.block`
- `ui.network-lobby.dots.report`
- `ui.network-lobby.chat.trust-banner`
- `ui.network-lobby.chat.peer-rate-limited`
- `ui.network-lobby.chat.send.rate-limited`
- `ui.network-lobby.chat.mute.persistent-disabled`
- `ui.network-lobby.chat.export`
- `ui.network-lobby.report.dialog.*`
- `ui.network-lobby.report.reason.harassment`
- `ui.network-lobby.report.reason.slurs-or-hate`
- `ui.network-lobby.report.reason.cheating-suspected`
- `ui.network-lobby.report.reason.unsafe-ai-content`
- `ui.network-lobby.report.reason.other`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.network-lobby.background`
- `ui.network-lobby.frame`
- `ui.network-lobby.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.multiplayer.*`
- `vfx.network-lobby.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Do not persist the `peerDenylist`, `pendingPeers`, `joinAttemptToast`, `chat`, `muted`, `blocked`, or `chatRateBucket` slices — they are per-room or per-session ephemeral state and are dropped on `LEAVE_NETWORK_LOBBY` and on session end per [`chat-safety.md` § 9](../../../chat-safety.md#9-retention).
- Files produced by `EXPORT_CHAT_LOG` and `REPORT_PEER` are user-owned; they are not auto-deleted by the "forget me" flow. The flow surfaces a notice and an "Open downloads folder" affordance per [`chat-safety.md` § 9](../../../chat-safety.md#9-retention).
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Lobby state mirrors authoritative host/session messages. Launch is enabled only when content hashes, slots, scenario, teams, and ready state all match.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
