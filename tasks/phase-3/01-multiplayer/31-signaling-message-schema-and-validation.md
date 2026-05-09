# Signaling Message Schema and Validation

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Pin the **wire-shape contract** for every payload that crosses the
M5 signaling WebSocket. Author
`content-schema/schemas/signaling-message.schema.json` (a closed
discriminated union with `additionalProperties: false`, length
caps, and pattern-checked id fields), wire AJV at the
message-router boundary so raw strings never reach the in-memory
`room → peer` map, and pin `ws`-library hardening defaults
(`maxPayload: 64 KiB`, ping interval, frame deadline, upgrade
deadline).

Read First:
- [`docs/architecture/signaling-message-schema.md`](../../../docs/architecture/signaling-message-schema.md)
- [`docs/architecture/signaling-payload-policy.md`](../../../docs/architecture/signaling-payload-policy.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/signaling-rate-limits.md`](../../../docs/architecture/signaling-rate-limits.md)
- [`docs/architecture/signaling-stateless-invariant.md`](../../../docs/architecture/signaling-stateless-invariant.md)
- [`docs/architecture/signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md)

Inputs:
- AJV 8 (already a transitive dev dependency).
- Node.js 20 `ws` library defaults that this task overrides.
- Closed enum of message types from
  [`signaling-payload-policy.md` § 1](../../../docs/architecture/signaling-payload-policy.md#1-allowlist-signaling-server-payloads),
  extended with `ROOM_FULL`, `TURN_CREDENTIALS`,
  `REQUEST_TURN_REFRESH`, and `ERROR`.

Outputs:
- `content-schema/schemas/signaling-message.schema.json` — closed
  discriminated union; every variant pins
  `additionalProperties: false`; length caps per
  [`signaling-message-schema.md` § 3](../../../docs/architecture/signaling-message-schema.md#3-length-caps).
- `content-schema/examples/signaling-message/*.json` — at least
  one canonical fixture per variant; exercised by
  `npm run validate:contracts`.
- `services/signaling/src/validation/ajv.ts` — compiled AJV
  instance with `strict: true`, `allErrors: false`; preloaded
  schema; exported entry point
  `validateSignalingMessage(raw): { ok: true; msg } | { ok: false; reason }`.
- `services/signaling/src/config.ts` — committed named constants:
  `MAX_PAYLOAD_BYTES = 64 * 1024`,
  `PING_INTERVAL_MS = 25_000`,
  `PING_TIMEOUT_MS = 30_000`,
  `UPGRADE_DEADLINE_MS = 10_000`,
  `FRAME_DEADLINE_MS = 5_000`,
  `BINARY_FRAMES_REJECTED = true`.
- `scripts/validate-signaling.mjs` — CI gate
  (`npm run validate:signaling`):
  - asserts `signaling-message.schema.json` exists and validates
    every fixture under `content-schema/examples/signaling-message/`
  - greps `services/signaling/src/server.ts` for the named
    hardening constants; fails on any missing
  - asserts the message-router routes every public handler
    through `validateSignalingMessage` (greps for the call site)
  - asserts every variant in `signaling-message.schema.json` has
    `additionalProperties: false`
- `services/signaling/__tests__/validation.test.ts` — oversized
  SDP rejected, malformed `roomId` rejected, additional property
  rejected, binary frame rejected, idle ping-miss closes, slow
  fragmented frame terminated, slow handshake terminated.

Owned Paths:
- `content-schema/schemas/signaling-message.schema.json`
- `content-schema/examples/signaling-message/`
- `services/signaling/src/validation/ajv.ts`
- `services/signaling/src/config.ts`
- `scripts/validate-signaling.mjs`
- `services/signaling/__tests__/validation.test.ts`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. The validation contributed by this task is **additive**:
  the message router prepends a single
  `validateSignalingMessage(raw)` call before dispatch and wires
  the named hardening constants from `config.ts` into the `ws`
  bootstrap. The router shape, room-table layout, and message
  envelope are unchanged.
- `package.json` — owned by repo-tooling. This task appends one
  `validate:*` script entry and wires it into `validate`. No
  rename or removal of existing entries.
- `docs/architecture/schema-matrix.md` — this task adds one row
  for `signaling-message.schema.json`; never rewrites existing
  rows.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby

Acceptance Criteria:
- Every variant in `signaling-message.schema.json` is closed
  (`additionalProperties: false`); a fixture with a stray
  `debug` key is rejected by `validateSignalingMessage`.
- Length caps are enforced at the schema layer (16 KiB SDP, 1 KiB
  candidate, 32-entry `iceCandidates`); a 17 KiB `OFFER` is
  rejected before the router dispatches.
- The compiled AJV validator is the only path from raw string to
  the message-router. A static-analysis assertion in
  `validate:signaling` greps the router file and fails on any
  handler that consumes `raw` directly.
- `MAX_PAYLOAD_BYTES = 64 * 1024` is wired into the `ws` bootstrap;
  a 65 KiB inbound frame closes the socket with `1009`
  (Message Too Big).
- `PING_INTERVAL_MS = 25_000` and `PING_TIMEOUT_MS = 30_000` are
  wired; a missed pong terminates the connection.
- `UPGRADE_DEADLINE_MS = 10_000` is wired; an upgrade that takes
  longer than 10 s is destroyed.
- `FRAME_DEADLINE_MS = 5_000` is wired; a fragmented message that
  spans more than 5 s between first and final frame closes with
  `1009`.
- Binary frames are rejected (`BINARY_FRAMES_REJECTED = true`);
  closes with `1003`.
- On any validation failure, the server replies with a single
  `RATE_LIMITED` / `JOIN_REJECTED` / `ERROR` envelope per
  [`signaling-message-schema.md` § 4](../../../docs/architecture/signaling-message-schema.md#4-rejection-behavior),
  closes with `1008`, and **never echoes the offending payload**
  in logs.
- `npm run validate:signaling` passes on the canonical fixtures;
  fails on a hand-corrupted fixture.
- The schema is registered in
  [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
  with a row pointing at this task.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  validation contributed by this task is **additive**; it MUST
  NOT rewrite the request-handler entrypoint, the message-envelope
  shape, or the in-memory room-table layout. New call sites slot
  in alongside existing handlers.
- **Shared-ownership split with repo-tooling**: `package.json`
  is **owned by** the repo-tooling task layer. The
  `validate:signaling` entry contributed by this task is
  **additive**; it MUST NOT rewrite or remove existing
  `validate:*` entries.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
