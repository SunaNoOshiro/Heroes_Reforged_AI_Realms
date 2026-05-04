# Signaling Server — Node.js WebSocket Lobby

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Minimal stateless WebSocket server for WebRTC handshake. Players create rooms, share invite links, and exchange SDP offers/answers. Server does NOT store game state — it only forwards WebRTC signaling messages.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)
- [`docs/architecture/lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)
- [`docs/architecture/signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
- [`docs/architecture/signaling-payload-policy.md`](../../../docs/architecture/signaling-payload-policy.md)
- [`docs/architecture/signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md)
- [`docs/architecture/ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md)
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)

Inputs:
- Node.js 20, `ws` library

Outputs:
- `services/signaling/src/server.ts`
- Messages: `CREATE_ROOM`, `JOIN_ROOM`, `JOIN_HANDSHAKE`,
  `JOIN_REJECTED`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`,
  `PEER_PENDING`, `APPROVE_PEER`, `REJECT_PEER`, `PEER_REJECTED`,
  `KICK_PEER`, `PEER_KICKED`, `JOIN_ATTEMPT_REJECTED`,
  `CLOSE_ROOM`, `ROOM_EXPIRED`, `ROOM_CLOSED`, `RATE_LIMITED`,
  `PEER_CONNECTED`, `PEER_DISCONNECTED`
- Room ID: 8-character upper-case Crockford-Base32 code per
  [`lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)
- Room secret: 16 bytes, base64url-encoded — generated at
  `CREATE_ROOM`, embedded in invite URL fragment, rotated on
  empty-room (see
  [`multiplayer-security.md` § Room Secret + Handshake](../../../docs/architecture/multiplayer-security.md#room-secret--handshake))
- Server memory: only room → peer mapping (with secret), room
  cool-down table, rate-limit buckets, and the per-room
  `peerDenylist` keyed on peer public keys
- HTTP route: `GET /turn-credential` (issued by Task 10; this task
  reserves the route surface)
- HTTP route: `GET /healthz` (returns aggregate rate-limit /
  active-room counters per
  [`signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md))
- Deploy target: any stateless container (Fly.io, Railway) — TLS
  terminated at the edge

Allowed Payloads:
- The only payloads that traverse the signaling server are the
  protocol messages listed above. Pack hash, save hash, display
  names, chat content, and `typ host` / `typ srflx` ICE candidates
  destined for a pending peer MUST NOT traverse the signaling
  server. See
  [`signaling-payload-policy.md`](../../../docs/architecture/signaling-payload-policy.md)
  for the canonical allow / deny list.

Pre-Consent ICE Filtering:
- ICE candidates destined for a peer that has not yet been approved
  by the host (see Task 10) are filtered down to `typ relay`
  candidates only. Post-`APPROVE_PEER`, the full candidate set
  flows. See
  [`ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md).

Rate Limiting:
- Per-IP, per-code, and global token-bucket throttles — full table
  in [`signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md).
- On exceed, server replies `RATE_LIMITED { retryAfterMs }` and the
  client back-offs exponentially (1 s → 30 s).
- Per-code failures emit a `JOIN_ATTEMPT_REJECTED { count, sinceMs }`
  notice to the host every 30 s when count > 0.

Room Cleanup:
- Idle TTL: 30 minutes since last protocol message → server emits
  `ROOM_EXPIRED { reason: "idle" }` and drops the room.
- Max lifetime: 4 hours wall-clock since `CREATE_ROOM` → server
  emits `ROOM_EXPIRED { reason: "max_lifetime" }` and drops the
  room.
- Host `CLOSE_ROOM` command: server emits
  `ROOM_CLOSED { reason: "host_closed" }`, drops the room, and MAY
  skip the 10-minute cool-down at the host's discretion.
- Cool-down: 10 minutes after a code becomes free, before reuse.
  See [`lobby-identifiers.md` § 6](../../../docs/architecture/lobby-identifiers.md#6-reuse-policy-cool-down).
- TTL sweep loop runs every 60 s.

Logging:
- Structured JSON to stdout per
  [`signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md).
- Always logged: room creation/destruction, rate-limit triggers,
  `JOIN_ATTEMPT_REJECTED` counts, `ROOM_EXPIRED` reasons.
- Never logged: display names, chat content, raw IPs, or any
  content hash.

Owned Paths:
- `services/signaling/src/server.ts`

Owned Paths (shared):
- Task 13 ([`13-signaling-rate-limiting.md`](./13-signaling-rate-limiting.md))
  is the **primary owner** of `services/signaling/rate-limit.ts` and
  contributes the `RATE_LIMITED` reply path; this task wires the
  request handler to call into it. The split is **additive**: this
  task does not rewrite Task 13's bucket data structures.
- Task 14 ([`14-host-approval-and-moderation.md`](./14-host-approval-and-moderation.md))
  is the **primary owner** of `services/signaling/approval.ts` and
  contributes the pending-peer queue; this task forwards
  `JOIN_ROOM` into it. Approval-state additions must not rewrite
  this task's room-table shape.

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
  `JOIN_HANDSHAKE { roomId, peerId, peerPubKey, secret, sigSchemaVersion }`;
  mismatches receive `JOIN_REJECTED { reason }` and the connection
  is dropped. Load-balancer health checks bypass the handshake.
- **2-peer cap**: `MAX_PEERS_PER_ROOM = 2` enforced at handshake; a
  third `JOIN_HANDSHAKE` for the same room receives
  `JOIN_REJECTED { reason: "room_full" }`. N-peer mesh is M7 scope
  (see [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)).
- **Room-code contract**: `CREATE_ROOM` mints an 8-character
  upper-case Crockford-Base32 code per
  [`lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md).
  Inbound codes are NFC-normalized + upper-cased before lookup.
  Up to 5 collision-retries; on the 5th, server replies
  `room.code.allocation_exhausted` (HTTP 503).
- **Cool-down**: a freed code is unallocatable for 10 minutes;
  host-initiated `CLOSE_ROOM` MAY skip the cool-down.
- **TTL sweep**: a room with no protocol message in 30 minutes is
  removed; a room older than 4 hours wall-clock is removed; both
  emit `ROOM_EXPIRED` to surviving peers.
- **`CLOSE_ROOM`**: only the host's peerId may issue it; non-host
  peers receive `JOIN_REJECTED { reason: "not_host" }` (the same
  rejection envelope is reused for all host-only commands).
- **Pre-consent ICE relay-only**: SDP `a=candidate:` lines that are
  not `typ relay` MUST be dropped from any `ICE_CANDIDATE` message
  destined for a peer that has not been `APPROVE_PEER`-ed by the
  host. Post-approval, the full candidate set is forwarded.
- **Allowed-payload allowlist**: the server module references no
  display name, no chat payload, and no content hash. A grep gate
  on `services/signaling/` enforces this.
- **Rate limiting**: a 1 000-RPS join flood from one IP triggers a
  60 s ban; 5 wrong codes against the same room locks the code for
  60 s and emits `JOIN_ATTEMPT_REJECTED` to the host.
- **`JOIN_ATTEMPT_REJECTED`**: emitted as `{ count, sinceMs }` per
  host every 30 s when there has been at least one rejected join
  for that host's room since the last emission.
- **HTTP `/turn-credential`** route reserved here (returns
  `501 not_implemented` until Task 10 wires the body).
- **HTTP `/healthz`** returns `{ activeRooms, rateLimitTriggersLast60s }`.
- **Determinism carve-out**: the implementation imports no PCG32
  RNG and no `src/engine/rng/*` module. CSPRNG-only per
  [`determinism.md` § Signaling and lobby identifiers — CSPRNG mandate](../../../docs/architecture/determinism.md#signaling-and-lobby-identifiers--csprng-mandate).
- **Shared-ownership split with Tasks 13 and 14**: this task is
  the **primary owner** of `services/signaling/src/server.ts`.
  Tasks 13 and 14 add **additive** call sites only (rate-limit
  hooks, pending-queue dispatch); they MUST NOT rewrite the
  request-handler entrypoint, the message-envelope shape, or the
  in-memory room-table layout owned by this task.

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
