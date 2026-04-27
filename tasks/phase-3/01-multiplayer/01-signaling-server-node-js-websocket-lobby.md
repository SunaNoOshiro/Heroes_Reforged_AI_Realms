# Signaling Server — Node.js WebSocket Lobby

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Minimal stateless WebSocket server for WebRTC handshake. Players create rooms, share invite links, and exchange SDP offers/answers. Server does NOT store game state — it only forwards WebRTC signaling messages.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Node.js 20, `ws` library

Outputs:
- `services/signaling/src/server.ts`
- Messages: `CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PEER_CONNECTED`, `PEER_DISCONNECTED`
- Room ID: 6-character alphanumeric code
- Server memory: only room → peer mapping; cleared when room is empty
- Deploy target: any stateless container (Fly.io, Railway)

Owned Paths:
- `services/signaling/src/server.ts`

Dependencies:
- module:mvp.10-heuristic-ai

Acceptance Criteria:
- Two clients can exchange SDP offer/answer through the server
- Server handles up to 100 concurrent rooms without memory leak
- Server restarts do not corrupt in-progress games (it's stateless — clients reconnect and re-handshake)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
