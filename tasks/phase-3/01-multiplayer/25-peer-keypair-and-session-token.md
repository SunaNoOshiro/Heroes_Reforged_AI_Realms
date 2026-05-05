# Peer Keypair & Session Token

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Implement the runtime primitives behind the Plan-24 identity model:
keypair generation / persistence / load / rotate, host-side session-
token mint, joiner-side token replay, and the canonicalized
sign / verify primitives consumed by every signed signaling
envelope. Builds the `src/net/identity/` surface; consumed by
[Task 26](./26-signed-signaling-envelope.md), [Task 27](./27-dtls-fingerprint-pinning.md),
and [Task 28](./28-abandon-penalty-and-quorum-disconnect.md).

Plan 24 § Critical Fix 2.

Read First:
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)
- [`docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`](../../../docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md)
- [`content-schema/schemas/peer-identity.schema.json`](../../../content-schema/schemas/peer-identity.schema.json)
- [`content-schema/schemas/session-token.schema.json`](../../../content-schema/schemas/session-token.schema.json)
- [`content-schema/schemas/signaling-envelope.schema.json`](../../../content-schema/schemas/signaling-envelope.schema.json)

Inputs:
- WebCrypto Ed25519 (Chrome 120+, Firefox 121+, Safari 17+).
- IndexedDB profile slice (`hr-profile.peerIdentity`).
- Canonical-JSON encoder per
  [`determinism.md` § Canonical JSON](../../../docs/architecture/determinism.md#canonical-json).

Outputs:
- `src/net/identity/keypair.ts` — `mintPeerKeypair()`,
  `loadPeerKeypair()`, `rotatePeerKeypair()`, plus a
  `getPeerId(publicKey): PeerId` derivation that emits a stable
  UUID v4 from the public key bytes.
- `src/net/identity/session-token.ts` — host-side `mintSessionToken`,
  joiner-side `loadSessionToken`, `hashSessionToken`, and a
  `verifySessionToken(token, hostPublicKey)` primitive.
- `src/net/identity/envelope.ts` — `canonicalizeEnvelope`,
  `signEnvelope`, `verifyEnvelope` primitives over the
  signaling-envelope shape.
- `src/net/identity/__tests__/*.test.ts` — canonicalization parity
  (browser vs. node), signature roundtrip, replay rejection,
  clock-skew tolerance, tampered-envelope rejection.

Owned Paths:
- `src/net/identity/keypair.ts`
- `src/net/identity/session-token.ts`
- `src/net/identity/envelope.ts`
- `src/net/identity/__tests__/`

Dependencies:
- phase-3.01-multiplayer.16-peer-keypair-and-denylist
- mvp.02-content-schemas.43-multiplayer-trust-and-identity-schemas

Acceptance Criteria:
- `mintPeerKeypair()` returns a fresh Ed25519 keypair via WebCrypto;
  the private key never enters logs, telemetry, or any structured
  payload outside IndexedDB.
- `loadPeerKeypair()` lazily generates a keypair on first profile
  load and persists `state.profile.peerKeypair`; subsequent loads
  return the same key. Conforms to
  [`peer-identity.schema.json`](../../../content-schema/schemas/peer-identity.schema.json).
- `rotatePeerKeypair()` mints a fresh keypair and overwrites the
  profile slice; the previous keypair is irrecoverable. Surfaced
  via the future `ROTATE_PEER_KEYPAIR` command (M7-deferred per
  [`peer-identity.md` § 10](../../../docs/architecture/peer-identity.md#10-out-of-scope)).
- `mintSessionToken({ hostKey, roomCode, subjectPeerId })` returns
  a [`session-token.schema.json`](../../../content-schema/schemas/session-token.schema.json)-conformant
  token with `iat` ≤ wall-clock and `exp - iat <= 86400000` (24 h).
  Surfaced via `MINT_SESSION_TOKEN` per
  [`docs/architecture/command-schema.md` § Multiplayer Trust & Identity Commands](../../../docs/architecture/command-schema.md#multiplayer-trust--identity-commands).
- `hashSessionToken(token)` returns the canonical
  `sha256(canonicalJson(token))` value, base64url-encoded; matches
  the `sessionTokenHash` field on every envelope per
  [`signaling-envelope.md` § 3](../../../docs/architecture/signaling-envelope.md#3-canonicalization-rule).
- `signEnvelope(payload, key)` and `verifyEnvelope(env, pubKey)`
  produce / consume conformant
  [`signaling-envelope.schema.json`](../../../content-schema/schemas/signaling-envelope.schema.json)
  records. The signature input is the canonical-JSON encoding of
  `[schemaVersion, payloadType, payload, nonce, iat, sessionTokenHash]`.
- Cross-environment parity test: the same
  `(privateKey, payload, nonce, iat, sessionTokenHash)` tuple
  produces a signature accepted by `verifyEnvelope` on Chrome,
  Firefox, Safari, and Node.js (Playwright cross-engine job).
- Tampered-envelope rejection test: flipping any bit in the
  canonicalized input yields `verifyEnvelope === false`.
- Replay-rejection test: two envelopes with identical `nonce`
  inside the per-`(signerId, sessionId)` 256-entry ring yield
  `verifyEnvelope === false` on the second consumption.
- Clock-skew test: `iat` outside `±60_000` ms of the receiver's
  wall-clock is rejected before signature check; the rejection
  reason is `clockSkew`.
- The implementation imports no PCG32 RNG; nonces are CSPRNG
  via `crypto.getRandomValues`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
