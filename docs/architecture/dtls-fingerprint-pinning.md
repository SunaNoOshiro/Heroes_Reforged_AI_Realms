# DTLS Fingerprint Pinning

Canonical doctrine for **DTLS-fingerprint pinning per `peerId`**, the
**reconnect continuity challenge**, and **identity continuity** across
WebRTC PeerConnection lifecycles. Closes the SDP-swap window that
[`signaling-envelope.md`](./signaling-envelope.md) cannot close on its
own.

> Source plan:
> [`docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md`](../implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md)
> § Critical Fix 3.

Companion docs:

- [`peer-identity.md`](./peer-identity.md) — Ed25519 keypair contract.
- [`signaling-envelope.md`](./signaling-envelope.md) — signed signaling
  envelope.
- [`multiplayer-security.md`](./multiplayer-security.md) — room secret,
  TURN credentials.
- Diagram: [`diagrams/31-reconnect-continuity-challenge.md`](./diagrams/31-reconnect-continuity-challenge.md).

---

## 1. Extraction Rule

After both `setLocalDescription(...)` and `setRemoteDescription(...)`
resolve, parse the SDP for the `a=fingerprint:` attribute and pin
the value in `state.net.peers[peerId].dtlsFp`.

Grammar (RFC 8122):

```
a=fingerprint:<hash-func> <fingerprint>
```

- `<hash-func>` MUST be `sha-256` (case-insensitive). Anything weaker
  (`sha-1`, `md5`) is rejected at extraction time and surfaces a
  `TRUST_VIOLATION_DETECTED { kind: 'weakDtlsFingerprint' }`.
- `<fingerprint>` is 32 colon-separated uppercase hex bytes
  (`AB:12:CD:…`). The pinned value is the canonical normalized form:
  uppercase, colon-separated.

If the SDP has no `a=fingerprint:` line (synthetic / malformed SDP),
extraction returns `null` and the dispatch immediately fails with
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

The host's authoritative state owns the canonical pinned value. On
reconnect, the host compares the new SDP's fingerprint against this
slice; mismatched values are a hard rejection.

## 3. Comparison Rule

Comparison is **string-equals over the normalized form**. Both sides
MUST be uppercased and colon-joined before comparison.

- The comparison MUST be constant-time per
  [`crypto-rules.md` § 1](./crypto-rules.md#1-compare--constant-time-always)
  to avoid timing-channel leaks (the fingerprint is not strictly a
  secret, but the rule is uniform across the codebase).
- A mismatch dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'dtlsFingerprintMismatch', peerId }`
  and aborts the rejoin.

## 4. Reconnect Continuity Challenge

On every rejoin (the host re-signals after a peer drops), the host
issues a `CHALLENGE` envelope:

1. Host picks a fresh 16-byte CSPRNG `nonce`.
2. Host wraps `{ payloadType: "CHALLENGE", payload: { nonce } }` in
   the signed envelope (per [`signaling-envelope.md`](./signaling-envelope.md))
   and broadcasts to the reconnecting peer.
3. Reconnecting peer signs `nonce` with its **original** Ed25519
   keypair (the one that signed the original `JOIN_ROOM`) and
   replies with `{ payloadType: "CHALLENGE_RESPONSE", payload:
   { nonce, sig } }`.
4. Host verifies the signature against the peer's pinned public
   key. Mismatched signer = reject.
5. On success, host re-pins the new SDP's DTLS fingerprint **only if**
   the comparison in § 3 also passes; both gates must pass.

The CHALLENGE flow is documented end-to-end in
[`diagrams/31-reconnect-continuity-challenge.md`](./diagrams/31-reconnect-continuity-challenge.md).

## 5. Failure Surface

| Failure | UI surface | Behavior |
|---|---|---|
| `dtlsFingerprintMismatch` | `Connection identity changed — match aborted` banner | Reject rejoin; record `abandon-penalty.schema.json` only against the *originally pinned* peer (i.e. the peer that successfully completed § 4 originally), never against the unverified rejoiner |
| `missingDtlsFingerprint` | `Connection metadata missing — match aborted` banner | Reject rejoin |
| `weakDtlsFingerprint` | `Connection used a weak hash — match aborted` banner | Reject rejoin |
| `challengeResponseInvalid` | `Reconnect identity check failed` banner | Reject rejoin |

All failure surfaces share the 5-second grace toast pattern from
[`undo-policy.md`](./undo-policy.md): the user sees the banner,
the room transitions to `awaitingTrustViolationDecision`, and the
`LEAVE_ROOM` dispatches after 5 s unless the user clicks
`Stay (read-only)`.

## 6. Browser Support

WebRTC DTLS fingerprints are exposed in SDP across all supported
browsers (Chrome 120+, Firefox 121+, Safari 17+); no polyfill is
required.

`exportKeyingMaterial()` (used by
[`command-stream-integrity.md`](./command-stream-integrity.md)) is a
separate concern; on browsers where it is unavailable, the command
HMAC uses a host-minted fallback key delivered through the signed
envelope.

## 7. Out of scope

- **DTLS-SRTP** (audio/video) — the project has no media surface;
  only DataChannels are used.
- **mTLS** between peers — DTLS already authenticates the channel
  endpoints; the envelope + fingerprint pinning add identity
  continuity on top.
- **Identity revocation** — the keypair-rotation path is M7 scope
  per [`peer-identity.md` § 2](./peer-identity.md#2-lifecycle).
