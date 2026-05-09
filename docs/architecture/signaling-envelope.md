# Signaling Envelope

Canonical doctrine for the **end-to-end signed signaling envelope**
that wraps every `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `HOST_CHANGED`,
`PEER_DISCONNECTED`, `JOIN_ROOM`, `CHALLENGE`, and
`CHALLENGE_RESPONSE` message. The envelope makes the signaling
server unable to impersonate, swap fingerprints, or inject candidates
even when fully compromised.

Companion docs:

- [`peer-identity.md`](./peer-identity.md) — Ed25519 keypair contract.
- [`transport-security.md`](./transport-security.md) — WSS / HSTS
  baseline.
- [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) —
  reconnect identity continuity.
- [`multiplayer-security.md`](./multiplayer-security.md) — room
  secret + handshake.
- Schema: [`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json).
- Schema: [`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json).

---

## 1. Envelope Shape

Every signaling frame after the initial `JOIN_HANDSHAKE` is wrapped
in an envelope with this exact shape:

```jsonc
{
  "schemaVersion": 1,
  "payloadType": "OFFER",          // closed enum, see § 2
  "payload": { /* opaque inner message */ },
  "signerId": "<peerId UUID>",
  "sig": "<base64url Ed25519 signature, 64 bytes>",
  "nonce": "<base64url 16 bytes>",
  "iat": 1730000000000,            // ms epoch, peer wall-clock
  "sessionTokenHash": "<base64url sha256, 32 bytes>"
}
```

The `signerId` is the sender's `peerId` (a UUID derived from the
public key per [`peer-identity.md`](./peer-identity.md)). The `sig`
covers the canonicalized concatenation defined in § 3.

## 2. Payload Type Enum

`payloadType` is a closed enum:

| Value | Inner shape | Notes |
|---|---|---|
| `JOIN_ROOM` | per [`peer-identity.md` § 6](./peer-identity.md#6-join_room-envelope) | First post-handshake frame from a joiner |
| `OFFER` | `{ sdp }` | SDP exchange |
| `ANSWER` | `{ sdp }` | SDP exchange |
| `ICE_CANDIDATE` | `{ candidate, sdpMid, sdpMLineIndex }` | ICE relay |
| `HOST_CHANGED` | `{ newHostPeerId, electionTurn }` | Signed by the elected host |
| `PEER_DISCONNECTED` | `{ peerId, observedAt, signalingObservedAt, kind }` | Signed by the elected host |
| `CHALLENGE` | `{ nonce }` | Reconnect continuity prompt |
| `CHALLENGE_RESPONSE` | `{ nonce, sig }` | Reply signed with the original session keypair |

Adding a new `payloadType` is an enum-lifecycle bump per
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).

## 3. Canonicalization Rule

The signature input is the canonical-JSON encoding of:

```
[ schemaVersion, payloadType, payload, nonce, iat, sessionTokenHash ]
```

- Canonical JSON per
  [`determinism.md` § Canonical JSON](./determinism.md#canonical-json):
  sorted keys, no whitespace, `"` quoting, `\u` escapes for control
  chars, integers as decimals, fractions banned.
- The `signerId` and `sig` fields are excluded from the signature
  input.
- The signature algorithm is **Ed25519** (RFC 8032) over the UTF-8
  bytes of the canonicalized array.

Two independent implementations (the browser client via
`crypto.subtle` and the Node-side signaling adapter via
`node:crypto`) MUST produce byte-identical canonicalized inputs;
the cross-environment parity test in
[`tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
pins this.

## 4. Replay Window

- `iat` MUST be within ±60 seconds of the receiver's wall-clock.
- The receiver maintains a per-`(signerId, sessionId)` ring buffer
  of the **last 256 nonces** seen. A duplicate nonce in the
  window is rejected; the third occurrence in 30 s dispatches
  `TRUST_VIOLATION_DETECTED`.
- The signaling server runs the same nonce check per-room before
  relaying; this catches obvious replay attempts at the relay
  edge without the receiver having to do the work. Server
  rejection emits `RATE_LIMITED { reason: "envelope_replay" }`.

## 5. Verification Order

On every inbound envelope the receiver MUST run these checks in
order; **first failure aborts**, and the abort surfaces a closed
`TRUST_VIOLATION_DETECTED` reason:

1. Schema-shape match (every required field present).
2. `iat` within ±60 s of local wall-clock.
3. `nonce` not already in the per-`(signerId, sessionId)` ring
   buffer.
4. `sessionTokenHash` matches the room's active session token
   hash (host-issued, see § 7).
5. `signerId` resolves to a known public key (lobby slot row or
   pending-peer queue).
6. `sig` verifies against `(canonicalize([…]), publicKey)`.
7. Inner-`payload` schema validates against the kind-specific
   sub-schema embedded in `signaling-envelope.schema.json`.

A passing envelope is consumed; a failing envelope dispatches
`TRUST_VIOLATION_DETECTED` with a closed reason
(`schemaShapeMismatch` / `clockSkew` / `nonceReplay` /
`sessionTokenMismatch` / `unknownSigner` / `badSignature` /
`payloadShapeMismatch`).

## 6. Signaling-Server Role

The signaling server is a **relay**; it does NOT verify the inner
signature (it does not have peer public keys). It DOES:

- Validate envelope **shape** (every required field present).
- Validate `iat` ± 60 s (using its own wall-clock).
- Validate nonce freshness against its per-room ring buffer.
- Validate `sessionTokenHash` against the host-issued token hash
  it has on file (see § 7).
- Drop any envelope whose `payloadType` is not in the closed enum.

Relay failures emit a closed `signaling-error.schema.json` payload
to the sender; they do NOT broadcast the failure to other peers,
to avoid amplifying a forged-envelope flood.

## 7. Session Token

The host mints a `session-token.schema.json` on `JOIN_ROOM` and
delivers it to the joiner over the room's WSS channel. The token
carries:

- `tokenId` (UUID), `roomCode`, `issuerPeerId`, `subjectPeerId`,
  `iat`, `exp` (≤ 24 h), `nonceWindow`, `sig` (issuer-signed).

`sessionTokenHash = sha256(canonicalJson(token))` is embedded in
every envelope. The signaling server stores the hash and validates
membership; the joiner stores the full token and replays the hash
on every outbound envelope.

Token rate limits live in
[`signaling-rate-limits.md`](./signaling-rate-limits.md); this doc owns the shape, that doc owns the budgets.

## 8. Failure Modes & Surface

| Failure | Surface | Owner |
|---|---|---|
| Bad signature on inbound envelope | `TRUST_VIOLATION_DETECTED { kind: 'badSignature' }` → 5 s grace toast → leave room | [Task 26](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md) |
| Replay (duplicate nonce) | `TRUST_VIOLATION_DETECTED { kind: 'nonceReplay' }` | Same |
| Clock skew > ±60 s | `TRUST_VIOLATION_DETECTED { kind: 'clockSkew' }`; UI hint to check device clock | Same |
| Unknown signer | `TRUST_VIOLATION_DETECTED { kind: 'unknownSigner' }` | Same |
| Server attestation lost | Envelope validation fails on `sessionTokenMismatch`; client transitions to reconnect path | [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |

## 9. Out of scope

- **Forward secrecy** for envelope signatures — the per-session
  HMAC ([`command-stream-integrity.md`](./command-stream-integrity.md))
  provides that for the command stream; the envelope is short-lived
  per-room and acceptable to sign with the long-lived peer key.
- **Server-side signature verification** — explicitly **not** done;
  the server is stateless on identity per
  [`peer-identity.md` § 6](./peer-identity.md#6-join_room-envelope).
