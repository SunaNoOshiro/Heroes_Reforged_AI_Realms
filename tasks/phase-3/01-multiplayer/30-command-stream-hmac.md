# Command Stream HMAC

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Derive a per-session HMAC key from the DTLS exporter and HMAC every
`{ seq, playerId, turn, command }` envelope on the lockstep
DataChannel; enforce the duplicate-`seq` policy per
[`command-stream-integrity.md`](../../../docs/architecture/command-stream-integrity.md).
Closes the bit-tampering and replay-injection windows that DTLS
alone cannot close once a peer client is compromised.


Read First:
- [`docs/architecture/command-stream-integrity.md`](../../../docs/architecture/command-stream-integrity.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/dtls-fingerprint-pinning.md`](../../../docs/architecture/dtls-fingerprint-pinning.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`content-schema/schemas/command-envelope.schema.json`](../../../content-schema/schemas/command-envelope.schema.json)

Inputs:
- `RTCDtlsTransport.exportKeyingMaterial` (Chrome 120+, Firefox
  121+; Safari fallback path lives in
  [`command-stream-integrity.md` § 2a](../../../docs/architecture/command-stream-integrity.md#2a-fallback-key)).
- Signed envelope wrap / verify from
  [Task 26](./26-signed-signaling-envelope.md) (the fallback key
  is delivered through it).
- Lockstep wire format from
  [Task 03](./03-input-only-lockstep-command-serialization-plus-sequencing.md).

Outputs:
- `src/net/commands/mac.ts` — `deriveSessionKey(rtcDtls)`,
  `signCommandEnvelope(env, key)`, `verifyCommandEnvelope(env,
  key)` over the
  [`command-envelope.schema.json`](../../../content-schema/schemas/command-envelope.schema.json)
  shape.
- `src/net/commands/__tests__/*.test.ts` — bit-tamper detection,
  replay rejection, duplicate-`seq` policy, gap-`seq` policy,
  cross-session-key isolation.

Owned Paths:
- `src/net/commands/mac.ts`
- `src/net/commands/__tests__/`

Dependencies:
- phase-3.01-multiplayer.27-dtls-fingerprint-pinning

Acceptance Criteria:
- `deriveSessionKey(rtcDtls)` returns a non-extractable
  `CryptoKey` derived from
  `exportKeyingMaterial("hr-cmd-mac", 32)`. Cached in
  `state.net.peers[peerId].cmdKey`. The key MUST NOT be exported,
  logged, or cross the network in any form.
- Browsers without `exportKeyingMaterial` use the host-minted
  fallback key delivered through the signed signaling envelope
  per
  [`command-stream-integrity.md` § 2a](../../../docs/architecture/command-stream-integrity.md#2a-fallback-key).
  Falling back emits a structured `tls-observability` warning.
- `signCommandEnvelope` HMACs canonical-JSON of
  `[schemaVersion, seq, playerId, turn, command]` with HMAC-SHA256;
  the wire `mac` is the first 16 bytes, base64url-encoded
  (22 url-safe chars without padding).
- `verifyCommandEnvelope` runs the verification order from
  [`command-stream-integrity.md` § 6](../../../docs/architecture/command-stream-integrity.md#6-verification-order):
  schema-shape, `playerId` matches the channel's pinned `peerId`,
  `seq` not duplicated, `mac` matches, inner `command` validates
  against `command.schema.json`.
- A single `mac` mismatch dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'commandMacInvalid' }`
  immediately; there is no per-burst threshold.
- Duplicate-`seq` policy: a duplicate with mismatched `mac`
  dispatches `TRUST_VIOLATION_DETECTED { kind: 'commandReplayMismatch' }`;
  drop count > 3 in 30 s dispatches
  `{ kind: 'commandReplayBurst' }`.
- Gap-`seq` policy: queues envelopes up to 2 turns wall-clock,
  then transitions into the bisect path
  ([Task 5](./05-auto-bisect-on-hash-mismatch.md)) without
  escalating to `TRUST_VIOLATION_DETECTED`.
- Tamper test: flipping any bit in `seq` / `playerId` / `turn` /
  `command` / `mac` causes `verifyCommandEnvelope` to return
  `false`.
- Cross-session-key isolation test: a `mac` from session A is
  rejected when verified with session B's key.
- Telemetry counter `macFailureCount` flows into the desync-
  detection telemetry per
  [`docs/architecture/desync-redaction.md`](../../../docs/architecture/desync-redaction.md);
  no raw peer identity is logged.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
