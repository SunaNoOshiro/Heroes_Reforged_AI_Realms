# Signaling Server — Node.js WebSocket Lobby

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Minimal stateless WebSocket server for WebRTC handshake. Players create rooms, share invite links, and exchange SDP offers/answers. Server does NOT store game state — it only forwards WebRTC signaling messages.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)

Inputs:
- Node.js 20, `ws` library

Outputs:
- `services/signaling/src/server.ts`
- Messages: `CREATE_ROOM`, `JOIN_ROOM`, `JOIN_HANDSHAKE`,
  `JOIN_REJECTED`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`,
  `PEER_CONNECTED`, `PEER_DISCONNECTED`
- Room ID: 6-character alphanumeric code
- Room secret: 16 bytes, base64url-encoded — generated at
  `CREATE_ROOM`, embedded in invite URL fragment, rotated on
  empty-room
- Server memory: only room → peer mapping (with secret); cleared when room is empty
- HTTP route: `GET /turn-credential` (issued by Task 10; this task
  reserves the route surface)
- Deploy target: any stateless container (Fly.io, Railway) — TLS
  terminated at the edge

Owned Paths:
- `services/signaling/src/server.ts`

Dependencies:
- module:mvp.10-heuristic-ai

Acceptance Criteria:
- Two clients can exchange SDP offer/answer through the server
- Server handles up to 100 concurrent rooms without memory leak
- Server restarts do not corrupt in-progress games (it's stateless — clients reconnect and re-handshake)
- **TLS mandate**: production + staging deploys serve `wss://`;
  `ws://` is rejected unless `host == "localhost"` (dev loop only).
- **Room secret + handshake**: every `CREATE_ROOM` mints a 16-byte
  base64url secret. The first frame after WebSocket upgrade MUST be
  `JOIN_HANDSHAKE { roomId, peerId, secret, sigSchemaVersion }`;
  mismatches receive `JOIN_REJECTED { reason }` and the connection
  is dropped. Load-balancer health checks bypass the handshake.
- **2-peer cap**: `MAX_PEERS_PER_ROOM = 2` enforced at handshake; a
  third `JOIN_HANDSHAKE` for the same room receives
  `JOIN_REJECTED { reason: "room_full" }`. N-peer mesh is M7 scope
  (see [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)).
- **HTTP `/turn-credential`** route reserved here (returns
  `501 not_implemented` until Task 10 wires the body).

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md))
  — the `signaling restart mid-match` failure-injection cell pins
  regression protection for this task.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
