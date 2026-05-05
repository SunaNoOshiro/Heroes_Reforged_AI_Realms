# Signed Signaling Envelope

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Wrap every signaling frame after `JOIN_HANDSHAKE` in the signed
envelope contract from [`signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md).
Verify on consumption; surface `TRUST_VIOLATION_DETECTED` with a
closed `kind` enum on any failure. Touchpoints in tasks 01, 02, 06,
07, and 08 are already extended to consume the envelope; this task
owns the runtime wrap / verify wiring + the trust-violation banner.

Plan 24 § Critical Fix 2.

Read First:
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
- [`content-schema/schemas/signaling-envelope.schema.json`](../../../content-schema/schemas/signaling-envelope.schema.json)

Inputs:
- `src/net/identity/` primitives from
  [Task 25](./25-peer-keypair-and-session-token.md).
- Signaling-server message list per
  [Task 1](./01-signaling-server-node-js-websocket-lobby.md).

Outputs:
- `src/net/signaling/wrap.ts` — `wrapEnvelope(payloadType, payload,
  ctx)`: wraps every outbound signaling message in a signed
  envelope; consumed by tasks 02, 06, 07, 08.
- `src/net/signaling/verify.ts` — `verifyInboundEnvelope(env, ctx)`:
  runs the seven-step verification order from
  [`signaling-envelope.md` § 5](../../../docs/architecture/signaling-envelope.md#5-verification-order);
  on failure dispatches `TRUST_VIOLATION_DETECTED { kind }` and
  aborts the session.
- `src/net/signaling/__tests__/*.test.ts` — verification-order
  parity, forged-envelope rejection at every relay-consumer
  touchpoint.

Owned Paths:
- `src/net/signaling/wrap.ts`
- `src/net/signaling/verify.ts`
- `src/net/signaling/__tests__/`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task adds only the **shape + freshness** pre-filter
  on inbound envelopes (per
  [`signaling-envelope.md` § 6](../../../docs/architecture/signaling-envelope.md#6-signaling-server-role));
  the server still does NOT verify the inner signature. Wiring
  is **additive**: no rewrite of the request handler, message
  envelope, or room-table shape.

Dependencies:
- phase-3.01-multiplayer.25-peer-keypair-and-session-token

Acceptance Criteria:
- Every outbound signaling frame after `JOIN_HANDSHAKE` is wrapped
  in a [`signaling-envelope.schema.json`](../../../content-schema/schemas/signaling-envelope.schema.json)-conformant
  envelope before transit (verified by integration test against
  the existing signaling fixture).
- Every inbound envelope runs the seven-step verification order
  from
  [`signaling-envelope.md` § 5](../../../docs/architecture/signaling-envelope.md#5-verification-order);
  first failure aborts the session and dispatches
  `TRUST_VIOLATION_DETECTED { kind }` per
  [`docs/architecture/command-schema.md` § Multiplayer Trust & Identity Commands](../../../docs/architecture/command-schema.md#multiplayer-trust--identity-commands).
- `MINT_SESSION_TOKEN` and `VERIFY_SIGNALING_ENVELOPE` dispatches
  are routed exclusively to `src/net/identity/` and
  `src/net/signaling/`; never enter the engine reducer.
- `64-network-lobby` mounts the trust-violation banner on every
  failed verification per
  [`spec.md` § Trust](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md);
  the 5-second grace toast pattern from
  [`undo-policy.md`](../../../docs/architecture/undo-policy.md)
  applies before `LEAVE_ROOM` dispatches.
- Forged-envelope test: a valid-shape envelope with a wrong
  signature is rejected at every relay-consumer touchpoint
  (Task 02 ICE relay, Task 06 reconnect log replay, Task 07 host
  migration, Task 08 invite-link consumer). The test fixture
  reuses the canonicalization parity vectors from Task 25.
- Replay-burst test: 4 envelopes with identical `nonce` inside
  the 30-second window dispatch
  `TRUST_VIOLATION_DETECTED { kind: 'nonceReplay' }` on the third.
- Server pre-filter test: a malformed envelope (missing required
  field) is rejected at the signaling server before relay; the
  rejection emits a closed
  [`signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json)
  payload to the sender.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  envelope pre-filter wiring is **additive**: it MUST NOT rewrite
  Task 01's request-handler entrypoint, the existing message
  envelope, or the room-table shape; the pre-filter slots in
  alongside the rate-limit hook from Task 13.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
