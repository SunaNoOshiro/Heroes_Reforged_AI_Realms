# WebRTC Peer Connection + DataChannel Setup

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Establish a direct peer-to-peer WebRTC connection between two players. Use two DataChannels: one ordered/reliable for commands, one unordered for heartbeats.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Signaling server (Task 1)

Outputs:
- `src/net/webrtc/peer-connection.ts`
- `createPeerConnection(signaling): PeerConn`
- Two DataChannels:
  - `commands`: `ordered: true, maxRetransmits: null` (reliable, ordered delivery)
  - `heartbeat`: `ordered: false, maxRetransmits: 0` (fire-and-forget)
- STUN server: `stun.l.google.com:19302` (free, good global coverage)
- Optional TURN server config (for corporate NAT fallback)

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

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
