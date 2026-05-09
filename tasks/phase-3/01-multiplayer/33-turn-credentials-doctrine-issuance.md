# TURN Credentials — Doctrine + Server Issuance

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Implement the canonical TURN credential doctrine in
[`docs/architecture/turn-credentials.md`](../../../docs/architecture/turn-credentials.md):
HMAC-SHA1 long-term-credential issuance keyed per
`(roomCode, peerId, exp)`, ≤ 5-minute TTL hard ceiling, signaling
server as the only issuer, dual-secret rotation window, and the
revocation-on-end deny-list. Replaces the older "Optional TURN
server config" handwave in
[Task 02](./02-webrtc-peer-connection-plus-datachannel-setup.md)
and the looser route shape in
[Task 10](./10-turn-fallback-and-credentials.md).

This task supersedes
[Task 10](./10-turn-fallback-and-credentials.md)'s `GET /turn-credential`
HTTP route with the **`TURN_CREDENTIALS` WebSocket envelope** —
issued only after `CREATE_ROOM` / `JOIN_ROOM` admit, never via a
public HTTP route.

Read First:
- [`docs/architecture/turn-credentials.md`](../../../docs/architecture/turn-credentials.md)
- [`docs/architecture/turn-fallback-policy.md`](../../../docs/architecture/turn-fallback-policy.md)
- [`docs/architecture/signaling-message-schema.md`](../../../docs/architecture/signaling-message-schema.md)
- [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)
- [`services/turn/README.md`](../../../services/turn/README.md)

Inputs:
- Node.js 20 `crypto.createHmac('sha1', …)` for the credential
  signature.
- Validated message envelope from Task 31 — `TURN_CREDENTIALS` and
  `REQUEST_TURN_REFRESH` are new variants.
- `TURN_SHARED_SECRET` and (during rotation)
  `TURN_SHARED_SECRET_PREVIOUS` env vars per
  `services/signaling/.env.example`.

Outputs:
- `content-schema/schemas/turn-credential.schema.json` — wire
  shape; embedded inside `TURN_CREDENTIALS` per
  [`signaling-message.schema.json`](../../../content-schema/schemas/signaling-message.schema.json).
- `content-schema/examples/turn-credential/canonical-issued.turn-credential.json`
- `content-schema/examples/turn-credential/canonical-expired.turn-credential.json`
- `services/signaling/.env.example` — `TURN_PROVIDER`, `TURN_URLS`,
  `TURN_SHARED_SECRET` (and `TURN_SHARED_SECRET_PREVIOUS` during
  the rotation window) placeholders.
- `services/signaling/src/turn/issue.ts` — pure function
  `issueTurnCredential({ roomCode, peerId, secret, ttlSec, urls, now }): TurnCredential`;
  no side effects; deterministic given fixed inputs.
- `services/signaling/src/turn/refresh.ts` — handler for
  `REQUEST_TURN_REFRESH` (rate-limited per Task 32).
- `services/signaling/src/turn/deny-list.ts` — in-memory deny-list
  store (TTL = `expEpochSeconds + 60_000`); pub-sub emitter wired
  to the `services/turn/scripts/sync-deny-list.ts` consumer
  (Task 34).
- `scripts/validate-turn.mjs` — CI gate (`npm run validate:turn`):
  - greps `src/`, `services/`, `resources/` for any `turn:` /
    `turns:` URL literal — fails (the only allowed source is the
    env var).
  - greps for any hardcoded `username` / `credential` field on an
    `iceServers` object — fails.
- `services/signaling/__tests__/turn-issue.test.ts`,
  `…/turn-refresh.test.ts` — vector-based determinism, scope
  parsing, dual-secret rotation, refresh denied for non-admitted
  peer.

Owned Paths:
- `content-schema/schemas/turn-credential.schema.json`
- `content-schema/examples/turn-credential/`
- `docs/architecture/turn-credentials.md`
- `services/signaling/.env.example`
- `services/signaling/src/turn/`
- `services/signaling/__tests__/turn-issue.test.ts`
- `services/signaling/__tests__/turn-refresh.test.ts`
- `scripts/validate-turn.mjs`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task contributes only the issuance call sites: on
  `CREATE_ROOM` success, on `JOIN_ROOM` admit (both peers), on
  `REQUEST_TURN_REFRESH` accepted, on peer drop (deny-list
  append). The router shape, room-table layout, and message
  envelope are unchanged.
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`
  spec — Task 02 is the primary owner. This task replaces the
  "Optional TURN server config" handwave with "iceServers built
  from the `TURN_CREDENTIALS` envelope at handshake time; never
  read from build-time config" (additive prose; the channel
  declarations are unchanged).
- `tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md`
  spec — Task 10 was the primary owner of the older
  `GET /turn-credential` HTTP route. This task replaces the route
  with the `TURN_CREDENTIALS` WebSocket envelope; the
  STUN-first fallback flow in Task 10 is preserved verbatim.
- `services/multiplayer/turn-config.md` — additive section
  pointing at `turn-credentials.md` as the SSOT for the credential
  lifecycle; existing provider-pin / region / cost-owner sections
  are unchanged.

Dependencies:
- phase-3.01-multiplayer.31-signaling-message-schema-and-validation
- phase-3.01-multiplayer.24-transport-security-edge-config
- phase-3.01-multiplayer.10-turn-fallback-and-credentials

Acceptance Criteria:
- `issueTurnCredential` is deterministic: a vector
  `(secret="seed", roomCode="ABCD1234", peerId="…", now=…, ttlSec=300)`
  produces the same credential across calls.
- `username` parses back to `{ exp, roomCode, peerId }` by
  splitting on `:`; the TURN server (and the deny-list sync
  worker) never consults a database.
- `expiresAt - now > 300_000` is rejected by the issuer (issuance
  unit test pins the 5-minute hard ceiling).
- During the rotation window, the previous secret is accepted by
  coturn for the duration of the window; new credentials are
  signed with the active secret only.
- `REQUEST_TURN_REFRESH` from a peer no longer in `room → peer`
  receives `ERROR { code: "validation_failed", action: "turn_refresh" }`.
- Peer drop / kick / room evict appends
  `(roomCode, peerId, expEpochSeconds)` to the deny-list with
  TTL = `expEpochSeconds + 60_000`; the deny-list-sync consumer
  (Task 34) sees the entry.
- `npm run validate:turn` rejects any committed `turn:` /
  `turns:` URL literal in `src/`, `services/`, or `resources/`
  (excluding the doctrine docs, the env example, and the schema /
  example fixtures, which are listed as exemptions).
- `npm run validate:turn` rejects any hardcoded `username` /
  `credential` field on an `iceServers` object.
- The schema is registered in
  [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md).
- The `TURN_CREDENTIALS` issuance is the **only path** by which a
  client receives a credential. The build never imports a
  credential constant.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  issuance call sites contributed by this task are **additive**;
  they MUST NOT rewrite the router shape, the room-table layout,
  or the message envelope.
- **Shared-ownership split with Task 10**: Task 10 is the
  **primary owner** of `src/net/webrtc/ice-config.ts` and the
  STUN-first / TURN-fallback flow. The edits contributed by this
  task are **additive**; they MUST NOT rewrite the builder, the
  4 s ICE-gather timeout, or the `turn_fallback_used` telemetry
  hook. The `GET /turn-credential` HTTP route is replaced by the
  `TURN_CREDENTIALS` WebSocket envelope; that delivery-channel
  swap is the only non-additive edit, and it is documented as a
  **superseded** clause inside Task 10's spec.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
