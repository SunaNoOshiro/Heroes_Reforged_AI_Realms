# Edge Defense, Health Segregation, Stateless Gate, TURN-Down Fallback

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Land the **edge-tier abuse defenses**, the **public/admin
listener split**, the **stateless-by-design gate**, and the
**TURN-down fallback UI** for M5. Covers the stateless-by-design
audit checklist and the relay-failure non-blocking, actionable
toast in the lobby.

Read First:
- [`docs/architecture/signaling-edge-defense.md`](../../../docs/architecture/signaling-edge-defense.md)
- [`docs/architecture/signaling-health-endpoints.md`](../../../docs/architecture/signaling-health-endpoints.md)
- [`docs/architecture/turn-fallback-policy.md`](../../../docs/architecture/turn-fallback-policy.md)
- [`docs/architecture/signaling-stateless-invariant.md`](../../../docs/architecture/signaling-stateless-invariant.md)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md)

Inputs:
- Validated message envelope from Task 31; the `ERROR` variant
  carries `code: "captcha_required"` per
  [`signaling-message.schema.json`](../../../content-schema/schemas/signaling-message.schema.json).
- Limiter counters from Task 32; sustained-breach detection
  drives blocklist auto-add and CAPTCHA escalation.
- `REQUEST_TURN_REFRESH` round-trip from Task 33; the TURN-down
  state machine in
  [`turn-fallback-policy.md`](../../../docs/architecture/turn-fallback-policy.md)
  fires on the second `failed` within a 10 s window.
- `ADMIN_TOKEN`, `CAPTCHA_PROVIDER` env vars per the extended
  `services/signaling/.env.example`.

Outputs:
- `services/signaling/src/blocklist/store.ts` — time-bound
  blocklist; `/24` v4 / `/64` v6 keying; in-memory map
  `prefix → expiresAt`; CRUD `add`, `check`, `evict`.
- `services/signaling/src/blocklist/redis-backing.ts` — opt-in
  Redis-backed persistence (TTL-bound; on the
  `signaling-stateless-invariant.md` allowlist).
- `services/signaling/src/admin/health.ts` — admin server bound
  to `127.0.0.1:9091`; bearer-token-auth; emits
  `MetricsSnapshot` JSON and Prometheus text format per
  [`signaling-health-endpoints.md` § 3](../../../docs/architecture/signaling-health-endpoints.md#3-metrics-shape).
- `services/signaling/src/captcha/turnstile.ts` — Cloudflare
  Turnstile / hCaptcha verifier wrapper; dev stub passes every
  token (env-controlled); on the
  `signaling-stateless-invariant.md` allowlist.
- `services/signaling/scripts/check-stateless.ts` — gate per
  [`signaling-stateless-invariant.md` § 3](../../../docs/architecture/signaling-stateless-invariant.md#3-mechanical-gate);
  `npm run validate:signaling-stateless`.
- `scripts/validate-edge.mjs` — CI gate
  (`npm run validate:edge`):
  - asserts `services/signaling/config/edge.example.toml` defines
    `[edge_defense.per_prefix_socket_cap]`,
    `[edge_defense.upgrade_flood]`,
    `[edge_defense.captcha_escalation]`,
    `[edge_defense.blocklist]`,
    `[health.public]`, `[health.admin]`
  - asserts the bootstrap binds the admin server to `127.0.0.1`
    and requires `Authorization: Bearer <ADMIN_TOKEN>`
  - asserts the public listener never exposes `/healthz` or
    `/metrics`
  - asserts the public response builder pins `Server: signaling`
- Client-side TURN-down state machine in
  `src/net/webrtc/peer-connection.ts` (Task 02 owned, additive):
  on `iceconnectionstate === 'failed'` (1st), dispatch
  `REQUEST_TURN_REFRESH`; on (2nd) within 10 s, dispatch
  `CONNECTION_FAILED_RELAY_UNAVAILABLE` and close.
- Lobby UI updates: `64-network-lobby/spec.md` adds
  **Connection-Failure States**; `interactions.md` adds
  `OnRelayUnavailable`, `OnRateLimited`, `OnRoomFull`,
  `OnCodeLocked`, `OnCaptchaRequired` handlers; `data-contracts.md`
  adds `state.net.lobby.errorState: { kind, retryAfterMs?, message }`.
- `services/signaling/__tests__/blocklist.test.ts`,
  `…/admin-health.test.ts`,
  `…/captcha-escalation.test.ts`,
  `…/turn-fallback.test.ts`.

Owned Paths:
- `docs/architecture/signaling-edge-defense.md`
- `docs/architecture/signaling-health-endpoints.md`
- `docs/architecture/turn-fallback-policy.md`
- `docs/architecture/signaling-stateless-invariant.md`
- `services/signaling/src/blocklist/`
- `services/signaling/src/admin/`
- `services/signaling/src/captcha/`
- `services/signaling/scripts/check-stateless.ts`
- `scripts/validate-edge.mjs`
- `services/signaling/__tests__/blocklist.test.ts`
- `services/signaling/__tests__/admin-health.test.ts`
- `services/signaling/__tests__/captcha-escalation.test.ts`
- `services/signaling/__tests__/turn-fallback.test.ts`

Owned Paths (shared):
- `services/signaling/config/edge.example.toml` — Task 24 is the
  **primary owner**. This task contributes additive sections
  (`[edge_defense.*]`, `[health.public]`, `[health.admin]`); the
  existing `[listener]` / `[tls]` / `[headers]` / `[origin_allowlist]` /
  `[observability.tls]` blocks are unchanged.
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task contributes only call sites: blocklist
  check in upgrade-handler, CAPTCHA escalation hook in
  `CREATE_ROOM` handler, admin server boot (separate listener),
  public response `Server` header pin.
- `src/net/webrtc/peer-connection.ts` — Task 02 is the **primary
  owner**. The TURN-down state machine is additive (one
  `iceconnectionstate` listener); the channel declarations and
  STUN-first flow are unchanged.
- `docs/architecture/wiki/screens/64-network-lobby/` — additive
  rows in `spec.md`, `interactions.md`, `data-contracts.md`. No
  existing row is rewritten.
- `docs/architecture/command-schema.md` — additive registrations
  for `CONNECTION_FAILED_RELAY_UNAVAILABLE`, `CAPTCHA_REQUIRED`,
  `CAPTCHA_VERIFIED`, `IP_BLOCKLISTED`,
  `TURN_CREDENTIALS_EXPIRED`, `RECEIVE_TURN_CREDENTIALS`,
  `REQUEST_TURN_REFRESH`, `SIGNALING_RATE_LIMITED`,
  `SIGNALING_ROOM_FULL`, `SIGNALING_VALIDATION_FAILED`,
  `SIGNALING_PAYLOAD_REJECTED`. No existing command is rewritten.
- `package.json` — owned by repo-tooling. This task appends two
  `validate:*` script entries (`validate:edge`,
  `validate:signaling-stateless`) and wires them into
  `validate`. No rename or removal of existing entries.

Dependencies:
- phase-3.01-multiplayer.31-signaling-message-schema-and-validation
- phase-3.01-multiplayer.32-signaling-rate-limit-augmentations
- phase-3.01-multiplayer.33-turn-credentials-doctrine-issuance

Acceptance Criteria:
- A blocklisted prefix's WebSocket upgrade returns HTTP `403`
  with no body.
- Sustained `1× burst` breach for ≥ 60 s auto-adds the prefix
  with a 15-minute TTL; auto-removes at TTL expiry.
- The 9th concurrent socket from one `/24` is refused with HTTP
  `429`.
- Sustained `2× burst` `CREATE_ROOM` rate from one prefix triggers
  CAPTCHA escalation: the next `CREATE_ROOM` returns
  `ERROR { code: "captcha_required", captchaToken }`. The lobby
  renders the verifier; the verified token is replayed on the
  retry.
- Admin endpoint `/healthz` requires `Authorization: Bearer
  <ADMIN_TOKEN>`; missing or invalid bearer returns `401` with
  no body.
- Admin endpoint `/metrics` returns the Prometheus text format
  per
  [`signaling-health-endpoints.md` § 3](../../../docs/architecture/signaling-health-endpoints.md#3-metrics-shape);
  no high-cardinality labels.
- Public response headers contain no version string; the
  `Server` header is pinned to `Server: signaling`.
- The public listener never serves `/healthz` or `/metrics`; a
  `GET /healthz` on the public port returns the bare-200 LB
  liveness response with no body.
- TURN-down state machine: `failed` → dispatch
  `REQUEST_TURN_REFRESH` once → second `failed` within 10 s →
  dispatch `CONNECTION_FAILED_RELAY_UNAVAILABLE`, close peer
  connection. No third retry, no silent fallthrough to
  `iceTransportPolicy: 'all'` only.
- Lobby renders `relayUnavailable`, `rateLimited`, `roomFull`,
  `codeLocked` failure states with the copy and actions in
  [`64-network-lobby/spec.md` § Connection-Failure States](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md#connection-failure-states).
- `npm run validate:signaling-stateless` fails on any forbidden
  import (`fs.write*`, DB drivers, `redis` outside the closed
  allowlist, `localStorage`, `document.cookie`, `indexedDB`).
- `npm run validate:edge` fails on a missing edge-defense
  section, on a missing public `Server` header pin, on a public
  `/healthz` route, on an admin server bound to anything other
  than `127.0.0.1`.
- The blocklist + CAPTCHA + admin endpoints obey the
  stateless invariant: the only persistence is the
  TTL-bound Redis option behind a closed allowlist.
- **Shared-ownership split with Task 24**: Task 24 is the
  **primary owner** of `services/signaling/config/edge.example.toml`.
  The new sections contributed by this task are **additive**;
  they MUST NOT rewrite the existing `[listener]`, `[tls]`,
  `[headers]`, `[origin_allowlist]`, or `[observability.tls]`
  blocks.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  call sites contributed by this task are **additive**; they
  MUST NOT rewrite the upgrade-handler, the message router
  entrypoint, or the room-table layout.
- **Shared-ownership split with Task 02**: Task 02 is the
  **primary owner** of `src/net/webrtc/peer-connection.ts`. The
  TURN-down state machine contributed by this task is
  **additive** — one `iceconnectionstate` listener; it MUST NOT
  rewrite the STUN-first ICE flow, the channel declarations, or
  the existing peer-connection lifecycle.
- **Shared-ownership split with repo-tooling**: `package.json`
  is **owned by** the repo-tooling task layer. The
  `validate:edge` and `validate:signaling-stateless` entries
  contributed by this task are **additive**; they MUST NOT
  rewrite or remove existing `validate:*` entries.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
