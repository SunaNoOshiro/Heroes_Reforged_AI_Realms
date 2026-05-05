# DTLS Fingerprint Pinning

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Extract and pin DTLS fingerprints per `peerId`, run the reconnect
continuity challenge (signed `CHALLENGE` / `CHALLENGE_RESPONSE`),
and abort on either gate failing. Implements the doctrine from
[`dtls-fingerprint-pinning.md`](../../../docs/architecture/dtls-fingerprint-pinning.md)
and the diagram in
[`diagrams/31-reconnect-continuity-challenge.md`](../../../docs/architecture/diagrams/31-reconnect-continuity-challenge.md).

Plan 24 § Critical Fix 3.

Read First:
- [`docs/architecture/dtls-fingerprint-pinning.md`](../../../docs/architecture/dtls-fingerprint-pinning.md)
- [`docs/architecture/diagrams/31-reconnect-continuity-challenge.md`](../../../docs/architecture/diagrams/31-reconnect-continuity-challenge.md)
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)

Inputs:
- `RTCPeerConnection.localDescription` / `remoteDescription` SDP
  (Chrome 120+, Firefox 121+, Safari 17+).
- `src/net/identity/` primitives from
  [Task 25](./25-peer-keypair-and-session-token.md).
- Signed envelope wrap / verify from
  [Task 26](./26-signed-signaling-envelope.md).

Outputs:
- `src/net/dtls/fingerprint.ts` — `extractFromSdp(sdp): string` (RFC
  8122; sha-256 only) and `compare(a, b): boolean` (constant-time
  string-equals on the canonical normalized form).
- `src/net/dtls/continuity.ts` — `issueChallenge(peerId)`,
  `verifyChallengeResponse(env, originalPubKey)`, plus the
  `state.net.peers[peerId].dtlsFp` and
  `state.net.peers[peerId].nonceRing` slice updates.
- `src/net/dtls/__tests__/*.test.ts` — fingerprint extraction,
  weak-hash rejection, mismatch detection on rejoin, continuity-
  challenge round-trip.

Owned Paths:
- `src/net/dtls/fingerprint.ts`
- `src/net/dtls/continuity.ts`
- `src/net/dtls/__tests__/`

Dependencies:
- phase-3.01-multiplayer.26-signed-signaling-envelope

Acceptance Criteria:
- `extractFromSdp(sdp)` parses the `a=fingerprint:` attribute per
  [`dtls-fingerprint-pinning.md` § 1](../../../docs/architecture/dtls-fingerprint-pinning.md#1-extraction-rule);
  `sha-1` / `md5` algorithms are rejected with
  `TRUST_VIOLATION_DETECTED { kind: 'weakDtlsFingerprint' }`;
  missing `a=fingerprint:` line returns `null` and dispatches
  `{ kind: 'missingDtlsFingerprint' }`.
- On initial handshake, `state.net.peers[peerId].dtlsFp` is
  populated after `setLocalDescription` and `setRemoteDescription`
  resolve. Surfaced via `PIN_DTLS_FINGERPRINT` per
  [`docs/architecture/command-schema.md` § Multiplayer Trust & Identity Commands](../../../docs/architecture/command-schema.md#multiplayer-trust--identity-commands).
- On reconnect (`LOG_REQUEST` flow per
  [Task 06](./06-reconnection-log-range-request-plus-replay.md)),
  the new SDP's fingerprint is compared to the stored value;
  mismatch dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'dtlsFingerprintMismatch', peerId }`
  and aborts the rejoin. Surfaced via `VERIFY_DTLS_FINGERPRINT`.
- `issueChallenge(peerId)` mints a fresh 16-byte CSPRNG nonce,
  wraps it in a signed envelope (`payloadType: 'CHALLENGE'`), and
  records the outstanding challenge in
  `state.net.peers[peerId].pendingChallenge`.
- `verifyChallengeResponse(env, originalPubKey)` confirms (a) the
  envelope's outer signature passes, and (b) the inner
  `payload.sig` is an Ed25519 signature over the original nonce
  by the **same** keypair that signed the original `JOIN_ROOM`.
  Mismatched signer dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'challengeResponseInvalid' }`.
- Both gates (continuity challenge AND fingerprint match) MUST
  pass before re-pinning the new SDP fingerprint and emitting
  `RECORD_CONTINUITY_CHALLENGE` per
  [`docs/architecture/command-schema.md` § Multiplayer Trust & Identity Commands](../../../docs/architecture/command-schema.md#multiplayer-trust--identity-commands).
- Trust-violation banner on
  [`64-network-lobby`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
  renders the 5-second grace toast on every fingerprint /
  challenge failure.
- Simulation test: a DTLS-fingerprint swap mid-reconnect
  dispatches `TRUST_VIOLATION_DETECTED` and the rejoin is
  rejected.
- Browser parity test: `compare(a, b)` returns `true` for the same
  canonical fingerprint string regardless of SDP origin
  (Chrome 120+, Firefox 121+, Safari 17+).
- Comparison is constant-time per
  [`crypto-rules.md` § 1](../../../docs/architecture/crypto-rules.md#1-compare--constant-time-always);
  no `===` / `Buffer.compare` shortcut.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
