# DTLS Fingerprint Pinning

> Crypto primitive in use here (SHA-256 DTLS fingerprint, RFC 8122
> floor) is catalogued in
> [`crypto-primitives.md`](./crypto-primitives.md).

Canonical doctrine for **DTLS-fingerprint pinning per `peerId`**, the
**reconnect continuity challenge**, and **identity continuity** across
WebRTC PeerConnection lifecycles. Closes the SDP-swap window that
[`signaling-envelope.md`](./signaling-envelope.md) cannot close on its
own.

Companion docs:

- [`peer-identity.md`](./peer-identity.md) — Ed25519 keypair contract.
- [`signaling-envelope.md`](./signaling-envelope.md) — signed signaling
  envelope.
- [`multiplayer-security.md`](./multiplayer-security.md) — room secret,
  TURN credentials.
- Diagram:
  [`diagrams/31-reconnect-continuity-challenge.md`](./diagrams/31-reconnect-continuity-challenge.md).

---

## 1. Extraction Rule

After **both** `setLocalDescription(...)` and
`setRemoteDescription(...)` resolve, parse the SDP for the
`a=fingerprint:` attribute and pin the value in
`state.net.peers[peerId].dtlsFp`. Surfaced via `PIN_DTLS_FINGERPRINT`
per
[`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands).

Grammar (RFC 8122):

```
a=fingerprint:<hash-func> <fingerprint>
```

| Sub-field | Rule |
|---|---|
| `<hash-func>` | MUST be `sha-256` (case-insensitive). `sha-1` / `md5` are rejected at extraction time and dispatch `TRUST_VIOLATION_DETECTED { kind: 'weakDtlsFingerprint' }`. |
| `<fingerprint>` | 32 colon-separated uppercase hex bytes (`AB:12:CD:…`). The pinned value is the canonical normalized form: uppercase, colon-separated. |

If the SDP has no `a=fingerprint:` line (synthetic / malformed SDP),
extraction returns `null` and dispatches
`TRUST_VIOLATION_DETECTED { kind: 'missingDtlsFingerprint' }`.

## 2. Storage

`state.net.peers[peerId]` gains two slices:

```ts
type PeerNetState = {
  // …
  dtlsFp: string | null;       // canonicalized "AB:12:..." form
  nonceRing: string[];         // ring buffer, capacity 256
};
```

- `dtlsFp` is the host's authoritative pinned value. On rejoin the
  host compares the new SDP's fingerprint against this slice (§ 3).
- `nonceRing` is the per-`(signerId, sessionId)` ring described in
  [`signaling-envelope.md` § 4](./signaling-envelope.md#4-replay-window);
  capacity 256.

Both slices are runtime-only and never persisted.

## 3. Comparison Rule

Comparison is **string-equals over the normalized form**. Both sides
MUST be uppercased and colon-joined before comparison.

- The comparison MUST be constant-time per
  [`crypto-rules.md` § 1](./crypto-rules.md#1-compare--constant-time-always)
  to avoid timing-channel leaks (the fingerprint is not strictly a
  secret, but the rule is uniform across the codebase).
- A mismatch dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'dtlsFingerprintMismatch', peerId }`
  and aborts the rejoin. Surfaced via `VERIFY_DTLS_FINGERPRINT`
  (see [`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands)).

## 4. Reconnect Continuity Challenge

On every rejoin (the host re-signals after a peer drops), the host
issues a `CHALLENGE` envelope:

1. Host picks a fresh **16-byte CSPRNG `nonce`**.
2. Host wraps `{ payloadType: "CHALLENGE", payload: { nonce } }` in
   the signed envelope (per
   [`signaling-envelope.md`](./signaling-envelope.md)) and broadcasts
   to the reconnecting peer.
3. Reconnecting peer signs `nonce` with its **original** Ed25519
   keypair (the one that signed the original `JOIN_ROOM`) and replies
   with `{ payloadType: "CHALLENGE_RESPONSE", payload: { nonce, sig } }`.
4. Host verifies the signature against the peer's pinned public key.
   Mismatched signer dispatches
   `TRUST_VIOLATION_DETECTED { kind: 'challengeResponseInvalid' }`.
5. The host re-pins the new SDP's DTLS fingerprint **only when both
   gates pass**: § 3 fingerprint comparison **AND** the signature
   verification in step 4. On success, dispatch
   `RECORD_CONTINUITY_CHALLENGE`.

The full sequence (states, timeouts, mermaid) lives in
[`diagrams/31-reconnect-continuity-challenge.md`](./diagrams/31-reconnect-continuity-challenge.md).

## 5. Failure Surface

| Failure `kind` | UI banner (in [`64-network-lobby`](./wiki/screens/64-network-lobby/spec.md)) | Behavior |
|---|---|---|
| `dtlsFingerprintMismatch` | `Connection identity changed — match aborted` | Reject rejoin; record `abandon-penalty.schema.json` only against the *originally pinned* peer (per [`abandon-penalty.md` § 7](./abandon-penalty.md#7-failure-modes)), never the unverified rejoiner |
| `missingDtlsFingerprint` | `Connection metadata missing — match aborted` | Reject rejoin |
| `weakDtlsFingerprint` | `Connection used a weak hash — match aborted` | Reject rejoin |
| `challengeResponseInvalid` | `Reconnect identity check failed` | Reject rejoin |

All four banners share the 5-second grace toast pattern from
[`undo-policy.md`](./undo-policy.md): the user sees the banner, the
room transitions to `awaitingTrustViolationDecision`, and `LEAVE_ROOM`
dispatches after 5 s unless the user clicks `Stay (read-only)`.

## 6. Browser Support

- **DTLS fingerprints in SDP**: Chrome 120+, Firefox 121+, Safari
  17+. No polyfill required.
- **`exportKeyingMaterial()`** (used by
  [`command-stream-integrity.md`](./command-stream-integrity.md))
  is a separate concern; on browsers where it is unavailable, the
  command HMAC uses a host-minted fallback key delivered through the
  signed envelope. Fingerprint pinning works regardless.

## 7. Out of scope

- **DTLS-SRTP** (audio/video) — the project has no media surface;
  only DataChannels are used.
- **mTLS** between peers — DTLS already authenticates the channel
  endpoints; the envelope + fingerprint pinning add identity
  continuity on top.
- **Identity revocation** — the keypair-rotation path is M7 scope
  per [`peer-identity.md` § 2](./peer-identity.md#2-lifecycle).

---

## 🔍 Sync Check

- **UI: ✔** — Trust-violation banner shape, the four `kind` strings,
  the `awaitingTrustViolationDecision` transition, and the
  `Stay (read-only)` affordance all match
  [`wiki/screens/64-network-lobby/spec.md` § Trust](./wiki/screens/64-network-lobby/spec.md)
  and
  [`wiki/screens/64-network-lobby/interactions.md` § Trust Violation](./wiki/screens/64-network-lobby/interactions.md).
  The `Verifying identity…` row state during `RECORD_CONTINUITY_CHALLENGE`
  also matches the lobby spec.
- **Schema: ✔** — All four `kind` values
  (`dtlsFingerprintMismatch`, `missingDtlsFingerprint`,
  `weakDtlsFingerprint`, `challengeResponseInvalid`) appear in the
  closed `TRUST_VIOLATION_DETECTED.kind` enum in
  [`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands);
  `PIN_DTLS_FINGERPRINT`, `VERIFY_DTLS_FINGERPRINT`, and
  `RECORD_CONTINUITY_CHALLENGE` are all defined there. `payloadType`
  values `CHALLENGE` / `CHALLENGE_RESPONSE` and their inner shapes
  match
  [`signaling-envelope.md` § 2](./signaling-envelope.md#2-payload-type-enum).
  No JSON schema covers the `state.net.peers[peerId]` slice itself
  (TS-only); not a CI gap.
- **Tasks: ❌** — Owning task
  [`27-dtls-fingerprint-pinning`](../../tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md)
  reads-first this doc and pins the runtime; acceptance criteria
  match § 1, § 3, and § 4. However, neither
  `state.net.peers[peerId].dtlsFp` nor
  `state.net.peers[peerId].nonceRing` is registered in
  [`data-inventory.md`](./data-inventory.md). CI-blocking per
  CLAUDE.md root contract — see Issues.

## ⚠ Issues

- **Missing `data-inventory.md` rows for
  `state.net.peers[peerId].dtlsFp` and `.nonceRing`.** This doc § 2
  defines both slices on the per-peer net state. Per CLAUDE.md root
  contract ("every persisted field is registered in
  `data-inventory.md`") and the precedent set by
  `state.net.lobby.chat` (in-memory, transient, but registered),
  [`data-inventory.md`](./data-inventory.md) should carry rows for
  both. The same gap is already flagged for
  `state.net.peers[peerId].cmdKey` by
  [`command-stream-integrity.md`](./command-stream-integrity.md);
  the three slices belong in one batch. Owning task:
  [`27-dtls-fingerprint-pinning`](../../tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md).
  Suggested values:
  - **dtlsFp** — Field=`pinned DTLS fingerprint`,
    State path=`state.net.peers[peerId].dtlsFp`, Medium=`in-memory`,
    Sensitivity=`low`, Retention=`session`, Wipe scope=`n/a`,
    Notes=`canonical "AB:12:..." form; SHA-256 floor per RFC 8122; never persisted`.
  - **nonceRing** — Field=`per-peer envelope nonce ring`,
    State path=`state.net.peers[peerId].nonceRing`, Medium=`in-memory`,
    Sensitivity=`low`, Retention=`session`, Wipe scope=`n/a`,
    Notes=`ring buffer capacity 256; per-(signerId, sessionId) replay window per signaling-envelope.md § 4`.
  Skill did not edit `data-inventory.md` (Hard Prohibition D — never
  edit cross-checked files).
