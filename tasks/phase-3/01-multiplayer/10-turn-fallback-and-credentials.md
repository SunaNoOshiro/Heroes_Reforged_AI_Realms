# TURN Fallback and Credentials

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
~10–20% of consumer NATs (symmetric / CG-NAT mobile) cannot be
punched by STUN alone. Pin a TURN provider, ship an HMAC-signed
short-TTL credential endpoint, and add automatic STUN→TURN fallback
to the peer connection so public-facing matches actually connect.

Read First:
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)
- [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Signaling server (Task 1) — must support an HTTP route alongside
  the WebSocket upgrade.
- Peer connection (Task 2) — the ICE-gather timeout hook lives here.

Outputs:
- `services/multiplayer/turn/` — signaling-side credential endpoint
  config.
- `src/net/webrtc/ice-config.ts` — client-side `iceServers` builder
  with STUN-first / TURN-fallback logic.
- `GET /turn-credential` endpoint contract:
  `{ urls, username, credential, ttl }` per
  [`turn-config.md`](../../../services/multiplayer/turn-config.md).
- HMAC credential format: `username = unix-ts-expiry:roomId`,
  `credential = base64( HMAC_SHA1(secret, username) )`,
  `ttl = 600 s`.
- Telemetry: `turn_fallback_used` counter emitted on every match
  that lands on a `relay` candidate pair.

Owned Paths:
- `services/multiplayer/turn/`
- `src/net/webrtc/ice-config.ts`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 1 owns; this task
  appends the `/turn-credential` HTTP route.
- `src/net/webrtc/peer-connection.ts` — Task 2 owns; this task adds
  the 4 s ICE-gather timeout hook that triggers the fallback.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup

Acceptance Criteria:
- Simulated symmetric NAT (webrtc-internals + a Linux nftables rule):
  connection succeeds via TURN within 8 s end-to-end.
- `/turn-credential` returns a 600 s TTL credential and is
  rate-limited to 6 calls per minute per `(roomId, IP)`.
- `TURN_SHARED_SECRET` env var never appears in server logs (verified
  by grep over a recorded log).
- `iceServers` starts STUN-only; TURN URLs are appended only after
  the 4 s ICE-gather timeout fires.
- Telemetry counter `turn_fallback_used` increments exactly once per
  fallback match.
- Shared-ownership contract for `services/signaling/src/server.ts`:
  Task 1 is the **primary owner** of the WebSocket signaling surface,
  room lifecycle, and `JOIN_HANDSHAKE` validation; this task's edits
  are **additive** — only the new HTTP `/turn-credential` route is
  appended. **Do not rewrite** Task 1's WebSocket message routing,
  room state, or handshake guard.
- Shared-ownership contract for `src/net/webrtc/peer-connection.ts`:
  Task 2 is the **primary owner** of the peer-connection lifecycle
  and DataChannel setup; this task's edits are **additive** — only
  the 4 s ICE-gather timeout hook that triggers TURN-URL append is
  added. **Do not rewrite** Task 2's STUN config, channel
  declarations, or browser-compat fallbacks.

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md))
  — the `TURN timeout` failure-injection cell pins regression
  protection for this task.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
