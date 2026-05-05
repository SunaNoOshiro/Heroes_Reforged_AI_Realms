# WebRTC Peer Connection + DataChannel Setup

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Establish a direct peer-to-peer WebRTC connection between two players. Use two DataChannels: one ordered/reliable for commands, one unordered for heartbeats.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md)
- [`docs/architecture/dtls-fingerprint-pinning.md`](../../../docs/architecture/dtls-fingerprint-pinning.md)
- [`docs/architecture/command-stream-integrity.md`](../../../docs/architecture/command-stream-integrity.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)

Inputs:
- Signaling server (Task 1)

Outputs:
- `src/net/webrtc/peer-connection.ts`
- `createPeerConnection(signaling): PeerConn`
- Three DataChannels:
  - `commands`: `ordered: true, maxRetransmits: null`, `negotiated: true, id: 1` (reliable, ordered delivery — deterministic command log)
  - `heartbeat`: `ordered: false, maxRetransmits: 0` (fire-and-forget)
  - `chat`: `ordered: true, maxRetransmits: 3`, `negotiated: true, id: 2` (best-effort lobby chat envelope per [`docs/architecture/chat-safety.md` § 2](../../../docs/architecture/chat-safety.md#2-channel-reservation); never enters the deterministic reducer; carries [`chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json) envelopes only)
- The `chat` channel reserves `id: 2`; ids `3–7` are reserved for future channels per the channel-reservation table in [`chat-safety.md` § 2](../../../docs/architecture/chat-safety.md#2-channel-reservation). `maxMessageSize` is enforced application-side at 1 KiB per envelope; the receive-side validator drops anything larger and increments a per-peer abuse counter.
- STUN server: `stun.l.google.com:19302` (free, good global coverage)
- TURN fallback: STUN-only attempt for 4 s; on ICE-gather timeout,
  Task 10 appends TURN URLs to `RTCConfiguration.iceServers`. Hook
  for the 4 s timeout lives here; the URL builder lives in
  `src/net/webrtc/ice-config.ts` (Task 10).

Why this is risky: WebRTC connection setup has many failure modes (NAT traversal, ICE candidate race conditions, browser compatibility). Test on Chrome, Firefox, and Safari with different network topologies.

Owned Paths:
- `src/net/webrtc/peer-connection.ts`

Owned Paths (shared):
- `chat` DataChannel reservation (`id: 2`, `ordered: true`,
  `maxRetransmits: 3`, `negotiated: true`). This task **opens** the
  channel and enforces no cross-channel traffic; the
  envelope schema, send/receive validators, normalization,
  rate limit, and reducer wiring are owned by
  `phase-3.01-multiplayer.17-chat-envelope-channel-and-rate-limit`.
  The split is **additive**: this task does not implement the
  envelope or filter contents — only the channel
  pair lives here.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby

Acceptance Criteria:
- Two browsers on different networks successfully establish DataChannel connection
- Commands DataChannel delivers in order (test with 1000 sequential messages)
- Connection failure (ICE timeout) triggers clean fallback to signaling error state
- Works on Chrome 120+, Firefox 121+, Safari 17+
- `chat` DataChannel exists alongside `commands` and `heartbeat`
  on `negotiated` ids `1` and `2`; chat traffic does not appear in
  replay artifacts and chat backpressure does not delay command
  delivery (synthetic test: flood `chat` at 200 msg/s while
  running a 1000-command match — no command-channel timeouts).
- Crossing payloads is rejected: a chat envelope sent on
  `commands` is rejected by the command-channel validator and a
  command-shaped payload sent on `chat` is rejected by the
  chat-channel validator. Per [`chat-safety.md` § 2](../../../docs/architecture/chat-safety.md#2-channel-reservation).
- ICE-gather timeout fires at 4 s when no host/srflx pair emerges;
  Task 10 wires the TURN-URL append on this signal.
- **Pre-consent ICE policy = relay-only**. The host's
  `RTCPeerConnection` MUST be created with
  `iceTransportPolicy: 'relay'` while the joiner is pre-consent
  (i.e. before Task 14's `APPROVE_PEER` fires). On `APPROVE_PEER`
  the host renegotiates with the default policy and
  `createOffer({ iceRestart: true })`. Per
  [`docs/architecture/ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md).
- **mDNS expectation table**: the implementation does not depend
  on mDNS masking, but the per-browser behavior is documented for
  operators in
  [`ice-disclosure-policy.md` § 3](../../../docs/architecture/ice-disclosure-policy.md#3-mdns-expectation-matrix)
  (Chrome 120+, Firefox 121+, Safari 17+).
- **Channel allowlist**: `ondatachannel` accepts only
  `commands` and `heartbeat` (and `chat` per the chat-safety
  reservation). Any other label closes the channel immediately
  and dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'unexpectedDataChannel' }` per
  [`docs/architecture/command-schema.md` § Multiplayer Trust & Identity Commands](../../../docs/architecture/command-schema.md#multiplayer-trust--identity-commands).
- **DTLS fingerprint capture**: after `setLocalDescription` and
  `setRemoteDescription` resolve, parse the `a=fingerprint:` line
  per
  [`dtls-fingerprint-pinning.md` § 1](../../../docs/architecture/dtls-fingerprint-pinning.md#1-extraction-rule)
  and write to `state.net.peers[peerId].dtlsFp`. Mismatched
  fingerprint on rejoin aborts via
  `TRUST_VIOLATION_DETECTED { kind: 'dtlsFingerprintMismatch' }`.
  Owned by [Task 27](./27-dtls-fingerprint-pinning.md).
- **Session-key derivation**: on `commands` DataChannel open,
  derive the per-session HMAC key via
  `RTCDtlsTransport.exportKeyingMaterial("hr-cmd-mac", 32)`; cache
  in `state.net.peers[peerId].cmdKey` as a non-extractable
  `CryptoKey`. Browsers without `exportKeyingMaterial` fall back
  to a host-minted 32-byte key delivered through the signed
  signaling envelope per
  [`command-stream-integrity.md` § 2a](../../../docs/architecture/command-stream-integrity.md#2a-fallback-key).
  Owned by [Task 30](./30-command-stream-hmac.md).
- **Envelope verification**: every inbound signaling frame is
  unwrapped via the runtime in
  [Task 26](./26-signed-signaling-envelope.md) before SDP / ICE
  is consumed; failure aborts the handshake.

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
