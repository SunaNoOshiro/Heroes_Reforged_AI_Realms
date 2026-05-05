# Signaling Rate Limit Augmentations + Per-Room Cap Hardening

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Extend the existing token-bucket matrix in
[`signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
and the limiter in
[Task 13](./13-signaling-rate-limiting.md) with two new tiers
required by Plan 25 Critical Fix 2: a **per-`/24` v4 / per-`/64` v6
prefix concurrent-socket cap** and a **per-connection message rate
ceiling**. Add `REQUEST_TURN_REFRESH` to the per-IP throttle list.
Formalize idle-room eviction. Surface the `ROOM_FULL` reply on the
existing 2-peer cap.

This task is **additive** to Task 13: the existing per-IP
`JOIN_ROOM` / `CREATE_ROOM` / per-code / global tiers are
unchanged.

Read First:
- [`docs/architecture/signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
- [`docs/architecture/signaling-edge-defense.md`](../../../docs/architecture/signaling-edge-defense.md)
- [`docs/architecture/signaling-message-schema.md`](../../../docs/architecture/signaling-message-schema.md)
- [`docs/architecture/signaling-stateless-invariant.md`](../../../docs/architecture/signaling-stateless-invariant.md)

Inputs:
- Validated message envelope from Task 31; the limiter dispatches
  on `msg.type` after AJV validation.
- Existing `RateLimiter` from Task 13.

Outputs:
- Extended `services/signaling/rate-limit.ts` (Task 13's primary
  owner): adds two new methods —
  `checkPerPrefixSockets(prefixKey)` and
  `checkPerConnectionMessages(connectionKey)` — and a
  `REQUEST_TURN_REFRESH` row to the per-IP table.
- Extended
  [`docs/architecture/signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
  bucket table (additive rows; existing rows unchanged):
  | Tier | Bucket | Refill | Burst | Action on exceed |
  | --- | --- | --- | --- | --- |
  | per-prefix concurrent open sockets | 8 | n/a | — | refuse upgrade with HTTP 429 |
  | per-connection any message | 60 / min | 1 / s | 30 | `RATE_LIMITED { tier: "per_connection" }` then `close(1008)` |
  | per-IP `REQUEST_TURN_REFRESH` | 6 / min | 1 / 10 s | 6 | `ERROR { code: "rate_limited", action: "turn_refresh" }` |
- Idle-room eviction loop: `setInterval(60_000, …)`; rooms with
  `peers.length === 0` for ≥ 5 minutes are dropped (already the
  spirit of "cleared when room is empty"; this task formalizes
  the timer and emits `ROOM_EXPIRED { reason: "idle" }` per
  [Task 01](./01-signaling-server-node-js-websocket-lobby.md).
- `services/signaling/__tests__/rate-limit-prefix.test.ts` and
  `…/rate-limit-perconn.test.ts` — coverage of the new tiers.

Owned Paths:
- `services/signaling/__tests__/rate-limit-prefix.test.ts`
- `services/signaling/__tests__/rate-limit-perconn.test.ts`

Owned Paths (shared):
- `services/signaling/rate-limit.ts` — Task 13 is the **primary
  owner**. This task contributes additive methods and additional
  bucket rows; existing tier methods, refill semantics, and the
  `RATE_LIMITED` reply payload are unchanged.
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task contributes only the call-site additions:
  `checkPerPrefixSockets` in the upgrade-handler,
  `checkPerConnectionMessages` in the message router, the idle
  eviction `setInterval`, and the `ROOM_FULL` emission on the 3rd
  `JOIN_HANDSHAKE` for a 2-peer room.
- `docs/architecture/signaling-rate-limits.md` — additive rows;
  no existing row is rewritten.

Dependencies:
- phase-3.01-multiplayer.13-signaling-rate-limiting
- phase-3.01-multiplayer.31-signaling-message-schema-and-validation

Acceptance Criteria:
- 9 simultaneous WebSocket upgrades from one `/24` are reduced to
  8 accepted + 1 refused with HTTP `429` and no body.
- 61 messages on a single connection within 60 s: the 61st
  receives `RATE_LIMITED { tier: "per_connection" }` and the
  socket closes with `1008`.
- 7 `REQUEST_TURN_REFRESH` from the same IP within 60 s: the 7th
  receives `ERROR { code: "rate_limited", action: "turn_refresh" }`.
- Idle-room eviction: a room with no peers for 5 minutes is
  removed at the next 60 s sweep; the freed code enters the
  10-minute cool-down per
  [`lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md).
- 3rd `JOIN_HANDSHAKE` to a 2-peer room receives
  `ROOM_FULL { roomId }` and the socket closes; the existing 2
  peers are not affected.
- The new tiers honor the existing bucket-eviction rule (entries
  evicted after 10 minutes of inactivity); a 10 000-distinct-prefix
  soak test does not retain entries beyond the cap.
- All new bucket maps are keyed on the `sha256(prefix || dailySalt)`
  shape per
  [`signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md);
  no raw IP is held.
- **Shared-ownership split with Task 13**: Task 13 is the
  **primary owner** of `services/signaling/rate-limit.ts`. The
  new bucket rows and methods contributed by this task are
  **additive**; they MUST NOT rewrite the existing tier
  methods, the bucket data structures, or the `RATE_LIMITED`
  reply payload.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  call sites contributed by this task are **additive**; they
  MUST NOT rewrite the upgrade-handler, the message router
  entrypoint, or the room-table layout.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
