# Signaling Rate Limiting

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Three-tier token-bucket throttle for the M5 signaling server:
per-IP `JOIN_ROOM`, per-IP `CREATE_ROOM`, per-code failed
`JOIN_ROOM`, plus a global rolling-window failure counter. Closes
Q303 / Q308 / Q310-Q312 enumeration and squat risks.

Read First:
- [`docs/architecture/signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
- [`docs/architecture/lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)
- [`docs/architecture/signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md)
- [`docs/operations/error-envelope.md`](../../../docs/operations/error-envelope.md)
- [`content-schema/schemas/error-envelope.schema.json`](../../../content-schema/schemas/error-envelope.schema.json)

Inputs:
- Node.js 20 wall-clock (`Date.now()` is permitted in the
  signaling server per
  [`determinism.md` § Wall-clock readers](../../../docs/architecture/determinism.md#wall-clock-readers))
- Canonical room-code form from Task 01

Outputs:
- `services/signaling/rate-limit.ts` — `TokenBucket` class,
  `RateLimiter` aggregator with three tier methods
  (`checkJoinRoom`, `checkCreateRoom`, `checkPerCode`), and the
  `RATE_LIMITED` reply builder.
- `services/signaling/__tests__/rate-limit.test.ts` — bucket
  refill, burst, eviction, and tier-interaction tests.
- `services/signaling/__tests__/rate-limit.integration.test.ts`
  — integration test exercising the bucket through a fake
  request handler.

Owned Paths:
- `services/signaling/rate-limit.ts`
- `services/signaling/__tests__/rate-limit.test.ts`
- `services/signaling/__tests__/rate-limit.integration.test.ts`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task contributes only the call sites that consume
  `RateLimiter`. Wiring is **additive**: it does not rewrite the
  request-handler entrypoint or the message-envelope shape; new
  call sites slot in alongside existing handlers.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby

Acceptance Criteria:
- All four buckets in
  [`signaling-rate-limits.md` § 1](../../../docs/architecture/signaling-rate-limits.md#1-bucket-table)
  enforce the documented refill / burst / action.
- 1 000-RPS join flood from one IP triggers a 60 s ban; the next
  message from that IP receives
  `RATE_LIMITED { tier: "per_ip", retryAfterMs }`.
- 5 wrong codes against the same room locks the code for 60 s;
  the host receives `JOIN_ATTEMPT_REJECTED { count, sinceMs }`.
- Global rolling-window counter at ≥ 200 / minute enters
  accept-only-known-IPs mode for 5 minutes; the `/healthz` route
  reports `globalFloodMode: true`.
- Bucket map evicts entries after 10 minutes of inactivity; a
  10 000-distinct-IP soak test does not retain entries beyond the
  cap.
- `RATE_LIMITED` reply payload matches
  [`signaling-rate-limits.md` § 3](../../../docs/architecture/signaling-rate-limits.md#3-rate_limited-reply)
  and conforms to the canonical envelope at
  [`content-schema/schemas/error-envelope.schema.json`](../../../content-schema/schemas/error-envelope.schema.json)
  per [`docs/operations/error-envelope.md`](../../../docs/operations/error-envelope.md);
  the `scope` field is coarse (`ip` / `session` / `account` / `global`)
  and exact-bucket fields (`bucketKey`, `remaining`, `limit`) are
  forbidden by `additionalProperties: false`.
- The IP key is sha256-truncated per
  [`signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md);
  no raw IP is held in the bucket map.
- The implementation imports no PCG32 RNG; refill is a pure
  `(now - lastRefillMs) * rate` calculation.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  rate-limit wiring is **additive**: it MUST NOT rewrite Task
  01's request-handler entrypoint, the message envelope, or the
  room-table shape; new call sites slot in alongside existing
  handlers.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
