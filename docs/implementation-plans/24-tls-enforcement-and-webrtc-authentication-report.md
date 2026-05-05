# Implementation Report: 24 — TLS/WSS Enforcement & WebRTC Authentication

> Source plan:
> [`24-tls-enforcement-and-webrtc-authentication-plan.md`](./24-tls-enforcement-and-webrtc-authentication-plan.md)

This report records the artifacts created and updated when applying
the plan. All five Critical Fixes plus the System Improvements were
landed. `npm run all` and `npm test` both pass.

## 1. New canonical doctrine docs

- [`docs/architecture/transport-security.md`](../architecture/transport-security.md)
  — WSS-only listener, HTTPS-only AI gateway, TLS 1.2 floor, cipher
  allowlist, HSTS, anti-downgrade, dev-cert exclusion, cert lifecycle,
  cert-pinning N/A note, CI gates list.
- [`docs/architecture/web-headers.md`](../architecture/web-headers.md)
  — CSP / SRI / CORS / HSTS / `Referrer-Policy` /
  `Permissions-Policy` baseline; per-surface edge config map.
- [`docs/architecture/signaling-envelope.md`](../architecture/signaling-envelope.md)
  — end-to-end signed envelope shape, closed `payloadType` enum,
  canonicalization rule, replay window (±60 s + 256-entry nonce
  ring), seven-step verification order, signaling-server relay role
  (shape + freshness only), failure surface table.
- [`docs/architecture/dtls-fingerprint-pinning.md`](../architecture/dtls-fingerprint-pinning.md)
  — RFC 8122 extraction grammar, sha-256 floor, constant-time
  comparison rule, reconnect continuity challenge, failure UI table,
  browser support note.
- [`docs/architecture/command-stream-integrity.md`](../architecture/command-stream-integrity.md)
  — `command-envelope` wire format, per-session HMAC key derivation
  via `exportKeyingMaterial("hr-cmd-mac", 32)` plus host-minted
  fallback, canonicalization rule, duplicate-`seq` and gap-`seq`
  policies, strict mac-failure escalation.
- [`docs/architecture/abandon-penalty.md`](../architecture/abandon-penalty.md)
  — quorum-attested `PEER_DISCONNECTED` rule, 30 s heartbeat-loss
  + 120 s reconnect grace + 30 s attestation timeout, penalty tier
  ladder + decay rule, `state.profile.abandonHistory` ring (64
  entries), UI surface map.
- [`docs/architecture/tls-observability.md`](../architecture/tls-observability.md)
  — closed `kind` enum, redacted log shape (`/24` IPv4, `/64` IPv6
  buckets, no UA tail, no SDP / cert content), closed `errorCode`
  enum, retention contract, CI gate hooks.
- [`docs/architecture/diagrams/31-reconnect-continuity-challenge.md`](../architecture/diagrams/31-reconnect-continuity-challenge.md)
  — Mermaid sequence: peer drop → host emits signed `CHALLENGE` →
  reconnecting peer signs nonce with original keypair → host
  verifies signature **and** DTLS fingerprint → readmits or rejects;
  added to `diagrams/index.json`.

`docs/architecture/peer-identity.md` was extended with sections on
the signed signaling envelope, session token, and reconnect
continuity challenge so it composes with the new doctrine docs
without rewriting the existing M5 / M7 lifecycle text.

## 2. New schemas

- [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json)
  — `peerId` UUID, Ed25519 `publicKey`, `alg` const, `createdAt`,
  optional `displayName`.
- [`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json)
  — closed `payloadType` enum
  (`JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `HOST_CHANGED`,
  `PEER_DISCONNECTED`, `CHALLENGE`, `CHALLENGE_RESPONSE`); 86-char
  Ed25519 sig pattern; 22-char nonce; 43-char `sessionTokenHash`.
- [`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json)
  — host-issued, host-signed; `iat`, `exp ≤ iat + 24h`,
  `nonceWindow` defaulting to 256.
- [`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json)
  — wire envelope for the lockstep `commands` channel; `seq`,
  `playerId`, `turn`, embedded `command` (`$ref` →
  `command.schema.json`), 22-char base64url HMAC tag.
- [`abandon-penalty.schema.json`](../../content-schema/schemas/abandon-penalty.schema.json)
  — closed `kind` enum
  (`heartbeat-loss`, `forced-leave`, `verified-disconnect`); closed
  `penaltyTier` enum
  (`none`, `cooldown-15min`, `leaverboard-flag`); minimum-1
  `quorumWitnessIds`.

All five schemas registered in
[`schema-matrix.md`](../architecture/schema-matrix.md). The enum
snapshot was regenerated via `npm run generate:enum-snapshot` and
committed in the same change.

## 3. New owning tasks

- [`tasks/mvp/02-content-schemas/43-multiplayer-trust-and-identity-schemas.md`](../../tasks/mvp/02-content-schemas/43-multiplayer-trust-and-identity-schemas.md)
  — owning task for the five schemas above.
- [`tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  — WSS-only listener, HTTPS-only AI gateway, edge configs, CI
  gates `npm run validate:transport` and `npm run validate:headers`.
- [`tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md`](../../tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md)
  — `src/net/identity/` keypair + session-token + envelope sign /
  verify primitives.
- [`tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
  — wraps every signaling frame, runs the seven-step verification
  order, dispatches `TRUST_VIOLATION_DETECTED`.
- [`tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md`](../../tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md)
  — fingerprint extraction / pin / verify + reconnect continuity
  challenge.
- [`tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md`](../../tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md)
  — quorum-attested `PEER_DISCONNECTED`, abandon-history ring
  buffer, attestation timeout.
- [`tasks/phase-3/01-multiplayer/29-tls-observability.md`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md)
  — redacted TLS-error log shape, per-IP-bucket rate aggregation.
- [`tasks/phase-3/01-multiplayer/30-command-stream-hmac.md`](../../tasks/phase-3/01-multiplayer/30-command-stream-hmac.md)
  — per-session key derivation, HMAC every command envelope,
  duplicate-`seq` / gap-`seq` policies.

⚠️ Assumption: the plan's §4 numbering (09–15) collides with the
existing tasks 09–23 already in
`tasks/phase-3/01-multiplayer/`. New tasks were assigned the next
free numbers (24–30). The plan's `tasks/phase-1/<schema>/` path
does not exist; the schema-owning task lives under
`tasks/mvp/02-content-schemas/` (where every other schema task
lives) at slot 43.

## 4. Extended existing artifacts (additive only)

- [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — added Transport, Origin Allowlist, Observability sections;
  extended message list with `CHALLENGE` / `CHALLENGE_RESPONSE` /
  `HOST_CHANGED`; documented the signed-envelope wrap requirement;
  pinned the `services/signaling/config/edge.example.toml` hook.
- [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — added Channel Allowlist, DTLS Fingerprint Capture,
  Session-Key Derivation, Envelope Verification subsections.
- [`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
  — wire format extended with `mac` field per
  `command-envelope.schema.json`; cross-link to
  `command-stream-integrity.md` § 4 / § 5 for duplicate-`seq` and
  gap-`seq` policies.
- [`tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
  — reconnect flow extended with continuity challenge before
  `LOG_REQUEST`; forfeit path now requires verified disconnect
  attestation; cross-links Task 28.
- [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md)
  — `HOST_CHANGED` now signed by the elected host's keypair;
  receivers verify against the candidate-host pool snapshot;
  `PEER_DISCONNECTED` quorum-attestation cross-links Task 28.
- [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  — invite-link parser is `https://`-only; `http://` rejected
  unconditionally with `ui.network-lobby.invite.insecureScheme`.
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../architecture/wiki/screens/64-network-lobby/spec.md)
  and
  [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../architecture/wiki/screens/64-network-lobby/interactions.md)
  — added Trust subsection (verified-key icon, trust-violation
  banner, reconnect-challenge UI), `OnTrustViolation(peerId, kind)`
  handler, `AwaitingDisconnectAttestationToast` integration.
- [`docs/architecture/peer-identity.md`](../architecture/peer-identity.md)
  — extended with §§ 7 (signed envelope), 8 (session token), 9
  (reconnect continuity challenge); existing § 7 renumbered to § 10.
- [`docs/architecture/multiplayer-security.md`](../architecture/multiplayer-security.md)
  was left intact; Plan 24 doctrine extends it via cross-links
  rather than rewriting.
- [`docs/architecture/command-schema.md`](../architecture/command-schema.md)
  — added "Multiplayer Trust & Identity Commands" section
  registering `MINT_SESSION_TOKEN`, `VERIFY_SIGNALING_ENVELOPE`,
  `ROTATE_PEER_KEYPAIR`, `PIN_DTLS_FINGERPRINT`,
  `VERIFY_DTLS_FINGERPRINT`, `RECORD_CONTINUITY_CHALLENGE`,
  `TRUST_VIOLATION_DETECTED`, `RECORD_ABANDON_PENALTY`,
  `INSPECT_ABANDON_HISTORY`.
- [`services/signaling/README.md`](../../services/signaling/README.md)
  and
  [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md)
  — added Transport sections pinning the WSS / HTTPS contract and
  edge-config hooks.
- [`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
  and
  [`docs/architecture/ai-generation-pipeline.md`](../architecture/ai-generation-pipeline.md)
  — added Transport clauses referencing
  `transport-security.md` and `web-headers.md`.
- [`docs/architecture/screen-command-coverage.json`](../architecture/screen-command-coverage.json)
  — added `LEAVE_ROOM`, `RECORD_ABANDON_PENALTY`,
  `RECORD_CONTINUITY_CHALLENGE`, `PEER_DISCONNECTED`,
  `CHALLENGE_RESPONSE` to outOfScope (referenced from the lobby
  interactions table).
- [`docs/architecture/task-command-token-coverage.json`](../architecture/task-command-token-coverage.json)
  — added `NODE_ENV`, `NODE_TLS_REJECT_UNAUTHORIZED`,
  `TRUST_VIOLATION_DETECTED`, `MINT_SESSION_TOKEN`,
  `VERIFY_SIGNALING_ENVELOPE`, `ROTATE_PEER_KEYPAIR` so task-prose
  references do not trip the command-literal lint.

## 5. New edge-config examples

- [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
- [`services/ai-gateway/config/edge.example.toml`](../../services/ai-gateway/config/edge.example.toml)

Both encode the WSS / HTTPS listener, TLS 1.2 floor, cipher
allowlist, HSTS (`max-age=63072000; includeSubDomains; preload`),
Origin / CORS allowlist pinned to the canonical web origin, and
the cert-lifecycle hooks. They are documentation examples; the
runtime CI gates parse them as the canonical baseline.

## 6. Validation

- `npm run all` — passes (validate + wiki regen +
  task-system report).
- `npm test` — 32/32 tests pass.
- `npm run validate:tasks` — 433 tasks, 0 issues.
- `npm run validate:contracts` — passes; all five new schemas
  load and parse cleanly.
- `npm run validate:enums` — passes after
  `npm run generate:enum-snapshot` regen (new closed enums
  recorded).
- `npm run validate:links` — passes (one stale task path was
  fixed during validation).

## 7. Deferred to follow-up tasks (not blockers)

- The CI gate scripts `scripts/check-transport-security.mjs` and
  `scripts/check-web-headers.mjs` are reserved by Task 24 but
  authored alongside the runtime implementation; the plan
  explicitly deferred their wiring to that task. The doctrine,
  edge configs, and acceptance criteria are in place so an agent
  picking up Task 24 can implement them straight from the spec.
- Native-shell cert pinning is documented as N/A in
  `transport-security.md` § 7 with a re-evaluation trigger; no
  native-shell directories exist yet.
- Operational alerting for cert expiry < 14 days is owned by
  Plan 31; the runbook hook is documented in
  `transport-security.md` § 6.

## 8. Assumptions

- New multiplayer tasks were renumbered to **24–30** because the
  plan's suggested 09–15 collided with already-registered tasks.
- The schema-owning task lives at
  `tasks/mvp/02-content-schemas/43-multiplayer-trust-and-identity-schemas.md`
  (the plan's `tasks/phase-1/<schema>/` path does not exist; this
  matches Plan 23's path for the same kind of work).
- Canonical examples for the five new schemas were intentionally
  not authored in this round; the schemas are wire-only or
  state-only and their downstream tasks (25, 26, 28, 30) own the
  test fixtures that exercise them. This matches the existing
  pattern for `signaling-error.schema.json` (wire-only, no
  canonical example), per the schema-matrix entry.

## 9. Blockers

None.
