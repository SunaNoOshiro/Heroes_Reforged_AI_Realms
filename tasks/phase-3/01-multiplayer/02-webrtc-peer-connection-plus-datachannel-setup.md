# WebRTC Peer Connection + DataChannel Setup

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Establish a direct peer-to-peer WebRTC connection between two players. Use two DataChannels: one ordered/reliable for commands, one unordered for heartbeats.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md)

Inputs:
- Signaling server (Task 1)

Outputs:
- `src/net/webrtc/peer-connection.ts`
- `createPeerConnection(signaling): PeerConn`
- Three DataChannels:
  - `commands`: `ordered: true, maxRetransmits: null` (reliable, ordered delivery — deterministic command log)
  - `heartbeat`: `ordered: false, maxRetransmits: 0` (fire-and-forget)
  - `chat`: `ordered: false, maxRetransmits: 0` (in-game chat; non-deterministic, never enters the reducer; sees `SEND_GAME_CHAT` payloads bound to `state.net.game.chat`)
- STUN server: `stun.l.google.com:19302` (free, good global coverage)
- TURN fallback: STUN-only attempt for 4 s; on ICE-gather timeout,
  Task 10 appends TURN URLs to `RTCConfiguration.iceServers`. Hook
  for the 4 s timeout lives here; the URL builder lives in
  `src/net/webrtc/ice-config.ts` (Task 10).

Why this is risky: WebRTC connection setup has many failure modes (NAT traversal, ICE candidate race conditions, browser compatibility). Test on Chrome, Firefox, and Safari with different network topologies.

Owned Paths:
- `src/net/webrtc/peer-connection.ts`

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby

Acceptance Criteria:
- Two browsers on different networks successfully establish DataChannel connection
- Commands DataChannel delivers in order (test with 1000 sequential messages)
- Connection failure (ICE timeout) triggers clean fallback to signaling error state
- Works on Chrome 120+, Firefox 121+, Safari 17+
- `chat` DataChannel exists alongside `commands` and `heartbeat`;
  chat traffic does not appear in replay artifacts and chat
  backpressure does not delay command delivery (synthetic test:
  flood `chat` at 200 msg/s while running a 1000-command match — no
  command-channel timeouts).
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

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
