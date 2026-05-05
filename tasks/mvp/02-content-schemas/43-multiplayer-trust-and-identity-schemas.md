# Multiplayer Trust & Identity Schemas

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Add the five schemas Plan 24 needs that have no existing surface:
[`peer-identity.schema.json`](../../../content-schema/schemas/peer-identity.schema.json),
[`signaling-envelope.schema.json`](../../../content-schema/schemas/signaling-envelope.schema.json),
[`session-token.schema.json`](../../../content-schema/schemas/session-token.schema.json),
[`command-envelope.schema.json`](../../../content-schema/schemas/command-envelope.schema.json),
and
[`abandon-penalty.schema.json`](../../../content-schema/schemas/abandon-penalty.schema.json).
Register them in
[`schema-matrix.md`](../../../docs/architecture/schema-matrix.md) and
[`content-schema/README.md`](../../../content-schema/README.md), and
extend `scripts/check-repo-contracts.mjs` with the suffix mapping rows
where canonical examples eventually land.

Plan 24 § Critical Fixes 2–5.

Read First:
- [`docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md`](../../../docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md)
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/dtls-fingerprint-pinning.md`](../../../docs/architecture/dtls-fingerprint-pinning.md)
- [`docs/architecture/command-stream-integrity.md`](../../../docs/architecture/command-stream-integrity.md)
- [`docs/architecture/abandon-penalty.md`](../../../docs/architecture/abandon-penalty.md)

Inputs:
- Closed `payloadType` enum
  (`JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `HOST_CHANGED`,
  `PEER_DISCONNECTED`, `CHALLENGE`, `CHALLENGE_RESPONSE`).
- Closed `kind` enum on
  `abandon-penalty.schema.json`
  (`heartbeat-loss`, `forced-leave`, `verified-disconnect`).
- Closed `penaltyTier` enum
  (`none`, `cooldown-15min`, `leaverboard-flag`).

Outputs:
- `content-schema/schemas/peer-identity.schema.json`
- `content-schema/schemas/signaling-envelope.schema.json`
- `content-schema/schemas/session-token.schema.json`
- `content-schema/schemas/command-envelope.schema.json`
- `content-schema/schemas/abandon-penalty.schema.json`
- Registration rows in
  [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md) and
  [`content-schema/README.md`](../../../content-schema/README.md).

Owned Paths:
- `content-schema/schemas/peer-identity.schema.json`
- `content-schema/schemas/signaling-envelope.schema.json`
- `content-schema/schemas/session-token.schema.json`
- `content-schema/schemas/command-envelope.schema.json`
- `content-schema/schemas/abandon-penalty.schema.json`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.41-error-and-audit-schemas

Acceptance Criteria:
- Each schema declares `additionalProperties: false`.
- `peer-identity.schema.json` `alg` is the const `Ed25519`;
  `publicKey` matches the 43-char base64url Ed25519-32-byte pattern.
- `signaling-envelope.schema.json` `payloadType` enum equals exactly
  `["JOIN_ROOM", "OFFER", "ANSWER", "ICE_CANDIDATE", "HOST_CHANGED", "PEER_DISCONNECTED", "CHALLENGE", "CHALLENGE_RESPONSE"]`.
- `signaling-envelope.schema.json` `sig` matches the 86-char base64url
  Ed25519-64-byte pattern; `nonce` matches the 22-char base64url
  16-byte pattern.
- `session-token.schema.json` `nonceWindow` defaults to `256` and is
  bounded `[1, 4096]`.
- `command-envelope.schema.json` `mac` matches the 22-char base64url
  truncated-HMAC pattern; `command` is a `$ref` to `command.schema.json`.
- `abandon-penalty.schema.json` `kind` enum equals exactly
  `["heartbeat-loss", "forced-leave", "verified-disconnect"]`;
  `penaltyTier` enum equals exactly
  `["none", "cooldown-15min", "leaverboard-flag"]`;
  `quorumWitnessIds` requires at least one entry.
- `npm run validate:contracts` passes.
- `npm run validate:enums` and `npm run generate:enum-snapshot`
  agree (snapshot updated).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
