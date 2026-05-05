# Implementation Report: 25 — TURN Credentials & Signaling-Server Abuse Protection

> Source plan:
> [`25-turn-credentials-and-signaling-server-abuse-plan.md`](./25-turn-credentials-and-signaling-server-abuse-plan.md)

This report records the artifacts created and updated when applying
the plan. The five Critical Fixes plus the System Improvements
landed as **doctrine + schema + task spec + config**, matching the
Plan-24 precedent: runtime TypeScript implementation lives inside
the new owning tasks (31–35); CI gates whose static analysis
needs the runtime bootstrap (`validate:signaling`,
`validate:turn`, `validate:turn-config`, `validate:edge`,
`validate:signaling-stateless`) are reserved by their owning
tasks rather than authored in this round.

## 1. New canonical doctrine docs

- [`docs/architecture/signaling-message-schema.md`](../architecture/signaling-message-schema.md)
  — closed `type` discriminator, `additionalProperties: false`,
  length-cap table, validator wiring rule, `ws` hardening
  defaults.
- [`docs/architecture/turn-credentials.md`](../architecture/turn-credentials.md)
  — provider pin, RFC long-term-credential mechanism with
  HMAC-SHA1, 5-minute TTL hard ceiling, per-`(roomCode, peerId)`
  scope, issuance triggers, refresh path, deny-list TTL, dual-
  secret rotation overlap.
- [`docs/architecture/signaling-edge-defense.md`](../architecture/signaling-edge-defense.md)
  — per-prefix concurrent-socket cap, upgrade-flood limit,
  CAPTCHA escalation, time-bound blocklist TTL ladder.
- [`docs/architecture/signaling-health-endpoints.md`](../architecture/signaling-health-endpoints.md)
  — public listener (bare 200 OK + WS upgrade only),
  admin listener on `127.0.0.1:9091` with bearer auth,
  Prometheus metrics shape (closed labels, no high-cardinality).
- [`docs/architecture/turn-fallback-policy.md`](../architecture/turn-fallback-policy.md)
  — single-retry state machine, no silent fallthrough to
  `iceTransportPolicy: 'all'`, lobby copy + actions table.
- [`docs/architecture/signaling-stateless-invariant.md`](../architecture/signaling-stateless-invariant.md)
  — allowed in-memory slices + TTLs, forbidden imports
  (`fs.write*`, DB drivers, `redis` outside the closed
  allowlist, `localStorage`, `document.cookie`, `indexedDB`),
  mechanical gate description.

## 2. New schemas

- [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  — closed `oneOf` over 27 variants:
  `JOIN_HANDSHAKE`, `JOIN_REJECTED`, `JOIN_ATTEMPT_REJECTED`,
  `CREATE_ROOM`, `CLOSE_ROOM`, `ROOM_EXPIRED`, `ROOM_CLOSED`,
  `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`,
  `PEER_PENDING`, `APPROVE_PEER`, `REJECT_PEER`, `PEER_REJECTED`,
  `KICK_PEER`, `PEER_KICKED`, `PEER_CONNECTED`,
  `PEER_DISCONNECTED`, `RATE_LIMITED`, `ROOM_FULL`,
  `CHALLENGE`, `CHALLENGE_RESPONSE`, `HOST_CHANGED`,
  `TURN_CREDENTIALS`, `REQUEST_TURN_REFRESH`, `ERROR`. Every
  variant pins `additionalProperties: false`, `roomId` /
  `peerId` patterns, and the per-field length caps from
  `signaling-message-schema.md` § 3.
- [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json)
  — `username = "<exp>:<roomCode>:<peerId>"`, base64 HMAC-SHA1
  `credential`, `urls[]` pattern-restricted to
  `turn:` / `turns:`, `expiresAt`, `scope`.

Both registered in
[`schema-matrix.md`](../architecture/schema-matrix.md). Suffix
mappings added to
[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
so example fixtures load through `npm run validate:contracts`.

## 3. New canonical fixtures

11 signaling-message fixtures plus 2 TURN-credential fixtures
under
[`content-schema/examples/signaling-message/`](../../content-schema/examples/signaling-message/)
and
[`content-schema/examples/turn-credential/`](../../content-schema/examples/turn-credential/).

## 4. New TURN-server scaffolding

- [`services/turn/README.md`](../../services/turn/README.md)
- [`services/turn/config/turnserver.example.conf`](../../services/turn/config/turnserver.example.conf)
  (pinned coturn config: `lt-cred-mech`, `no-tcp-relay`,
  `no-loopback-peers`, full IPv4 + IPv6 `denied-peer-ip`
  allowlist, `min-port=49160` / `max-port=49200`,
  `total-quota=200`, `user-quota=4`, `max-bps=1500000`,
  `bps-capacity=300000000`, ECDHE-only cipher allowlist).
- [`services/turn/scripts/sync-deny-list.ts`](../../services/turn/scripts/sync-deny-list.ts)
  — deny-list contract surface (`DenyListEntry`,
  `DenyListProvider`, `DenyListSubscriber`, `runDenyListSync`).
- [`services/turn/log/schema.json`](../../services/turn/log/schema.json)
  — TURN attribution-log shape with PII-scrubbed peer addresses.

## 5. Edge-config augments

[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
extended with `[edge_defense.per_prefix_socket_cap]`,
`[edge_defense.upgrade_flood]`,
`[edge_defense.captcha_escalation]`,
`[edge_defense.blocklist]`, `[health.public]`,
`[health.admin]`. The existing TLS / headers / Origin
allowlist / TLS observability blocks are unchanged.

## 6. New owning tasks

Slots 31–35 in
[`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/):

- [`31-signaling-message-schema-and-validation.md`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md)
  — schema + AJV gate + `ws` hardening defaults +
  `validate:signaling`.
- [`32-signaling-rate-limit-augmentations.md`](../../tasks/phase-3/01-multiplayer/32-signaling-rate-limit-augmentations.md)
  — per-prefix concurrent-socket cap, per-connection message
  rate, `REQUEST_TURN_REFRESH` per-IP throttle, idle-room
  eviction, `ROOM_FULL` reply.
- [`33-turn-credentials-doctrine-issuance.md`](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md)
  — pure HMAC-SHA1 issuer, dual-secret rotation, `TURN_CREDENTIALS`
  envelope issuance, deny-list emitter, `validate:turn`.
- [`34-turn-server-hardening.md`](../../tasks/phase-3/01-multiplayer/34-turn-server-hardening.md)
  — coturn deploy + `RedisCotrunProvider` /
  `CloudflareCallsProvider` consumers + log-rewriter sidecar +
  `validate:turn-config`.
- [`35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  — blocklist store, admin server on `127.0.0.1:9091`, CAPTCHA
  escalation, TURN-down state machine, lobby failure-state
  handlers, `check-stateless.ts` gate, `validate:edge` and
  `validate:signaling-stateless`.

## 7. Extended existing artifacts (additive only)

- [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — extended message list with `ROOM_FULL` /
  `TURN_CREDENTIALS` / `REQUEST_TURN_REFRESH` / `ERROR`; new
  sections (Message Validation, Edge-Tier Defenses, TURN
  Credentials, Stateless Invariant); shared-ownership rows for
  Tasks 31 / 32 / 33 / 35.
- [Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — TURN-provisioning + TURN-down-fallback acceptance criteria.
- [Task 10](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md)
  — Read First / Outputs cross-link the new doctrines; the
  HTTP `/turn-credential` route is annotated as superseded by
  the `TURN_CREDENTIALS` envelope.
- [`64-network-lobby/spec.md`](../architecture/wiki/screens/64-network-lobby/spec.md)
  — § Connection-Failure States (4 named states + transient
  `captchaRequired`).
- [`64-network-lobby/interactions.md`](../architecture/wiki/screens/64-network-lobby/interactions.md)
  — `OnRelayUnavailable`, `OnRateLimited`, `OnRoomFull`,
  `OnCodeLocked`, `OnCaptchaRequired` handlers.
- [`64-network-lobby/data-contracts.md`](../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — `errorState` selector row.
- [`62-multiplayer-setup/architecture.md`](../architecture/wiki/screens/62-multiplayer-setup/architecture.md)
  — TURN Provisioning subsection.
- [`schema-matrix.md`](../architecture/schema-matrix.md) — two
  new rows (SignalingMessage, TurnCredential).
- [`command-schema.md`](../architecture/command-schema.md) —
  "Signaling Abuse-Defense, TURN, and Connection-Failure
  Commands" subsection registering 11 new tokens.
- [`screen-command-coverage.json`](../architecture/screen-command-coverage.json)
  + [`task-command-token-coverage.json`](../architecture/task-command-token-coverage.json)
  — owner entries for the 11 new tokens.
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  — `*.signaling-message.json` and `*.turn-credential.json`
  suffix mappings.

## 8. Validation

Run:

- `npm run all` — passes (validate + wiki regen + task-system
  report).
- `npm test` — passes.

## 9. Assumptions

- ⚠️ Assumption: the plan's slot numbering (09–13) collided with
  already-registered tasks `09-snapshot-resync-fallback.md` …
  `13-signaling-rate-limiting.md`. New tasks were assigned the
  next free numbers (31–35), matching the Plan-24 precedent.
- ⚠️ Assumption: per Plan-24's "the doctrine, edge configs, and
  acceptance criteria are in place so an agent picking up the
  task can implement them straight from the spec" pattern, the
  runtime TypeScript and the new `validate:*` scripts
  (`validate:signaling`, `validate:turn`, `validate:turn-config`,
  `validate:edge`, `validate:signaling-stateless`) are reserved
  by Tasks 31–35 and not authored in this round. They cannot be
  meaningfully written without the runtime server bootstrap they
  grep against.
- ⚠️ Assumption: the older
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
  30-day rotation cadence is superseded by the 7-day cadence in
  [`turn-credentials.md` § 9](../architecture/turn-credentials.md#9-rotation);
  the older file's "Rotation Policy" section is left intact and
  cross-linked forward to the new doctrine.
- ⚠️ Assumption: the older `GET /turn-credential` HTTP route in
  Task 10 is superseded by the `TURN_CREDENTIALS` WebSocket
  envelope in Task 33; Task 10's spec is left intact (the
  STUN-first / 4 s ICE-gather-timeout / TURN-fallback flow is
  unchanged) with a "Superseded delivery channel" note.
- ⚠️ Assumption: M5's 2-peer cap (per
  [`tasks/phase-3/01-multiplayer.md`](../../tasks/phase-3/01-multiplayer.md))
  pins `maxPeers` to 2 in the `CREATE_ROOM` schema; the field
  is reserved for forward-compat but `min: 2, max: 2` until M7.
- ⚠️ Assumption: the credential `username` pattern uses
  10-digit `expEpochSeconds`, which fits all integer epochs
  through 2286-11-20 — well beyond the project horizon.

## 10. Blockers

None.
