# Signaling Envelope

Canonical doctrine for the **end-to-end signed signaling envelope**
that wraps every `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `HOST_CHANGED`,
`PEER_DISCONNECTED`, `JOIN_ROOM`, `CHALLENGE`, and
`CHALLENGE_RESPONSE` frame. The envelope keeps a fully-compromised
signaling server from impersonating peers, swapping fingerprints, or
injecting candidates; the server holds no peer's private key.

Companion docs:

- [`peer-identity.md`](./peer-identity.md) — Ed25519 keypair contract.
- [`transport-security.md`](./transport-security.md) — WSS / HSTS
  baseline.
- [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) —
  reconnect identity continuity.
- [`multiplayer-security.md`](./multiplayer-security.md) — room
  secret + handshake.
- Schemas:
  [`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json),
  [`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json).

---

## 1. Envelope Shape

Every signaling frame after the initial `JOIN_HANDSHAKE` is wrapped
in an envelope of this exact shape:

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

`signerId` is the sender's `peerId` (UUID derived from the public
key per [`peer-identity.md`](./peer-identity.md)). `sig` covers the
canonicalized concatenation defined in § 3; `signerId` and `sig`
themselves are excluded from the signature input.

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
  [`determinism.md` § Non-Negotiable Stack](./determinism.md#non-negotiable-stack)
  item 4: sorted keys, no whitespace, `"` quoting, `\u` escapes
  for control chars, integers as decimal literals, fractions banned.
- `signerId` and `sig` are excluded from the input.
- The signature algorithm is **Ed25519** (RFC 8032) over the UTF-8
  bytes of the canonicalized array.

Browser (`crypto.subtle`) and Node-side (`node:crypto`)
implementations MUST produce byte-identical canonicalized inputs;
the cross-environment parity test in
[`tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
pins this.

## 4. Replay Window

- `iat` MUST be within ±60 s of the receiver's wall-clock.
- The receiver maintains a per-`(signerId, sessionId)` ring buffer
  of the **last 256 nonces** seen. A duplicate nonce in the window
  is rejected; the third occurrence in 30 s dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'nonceReplay' }`.
- The signaling server runs the same nonce check per-room before
  relaying, catching obvious replay attempts at the relay edge.
  Server rejection emits `RATE_LIMITED { reason: "envelope_replay" }`
  (see Issues — this `reason` is not yet in the closed enum in
  [`signaling-rate-limits.md` § 3](./signaling-rate-limits.md#3-rate_limited-reply)).

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

A failing envelope dispatches `TRUST_VIOLATION_DETECTED` with one
of the closed reasons (`schemaShapeMismatch` / `clockSkew` /
`nonceReplay` / `sessionTokenMismatch` / `unknownSigner` /
`badSignature` / `payloadShapeMismatch`), aligned 1-to-1 with
steps 1–7. See Issues — `schemaShapeMismatch` is not yet declared
in the closed `TRUST_VIOLATION_DETECTED.kind` enum in
[`command-schema.md`](./command-schema.md#multiplayer-trust--identity-commands).

## 6. Signaling-Server Role

The signaling server is a **relay**; it does NOT verify the inner
signature (it holds no peer public keys). It DOES:

- Validate envelope **shape** (every required field present).
- Validate `iat` ± 60 s against its own wall-clock.
- Validate nonce freshness against its per-room ring buffer.
- Validate `sessionTokenHash` against the host-issued token hash
  on file (see § 7).
- Drop any envelope whose `payloadType` is not in the closed enum.

Relay failures emit a closed
[`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json)
payload to the sender; the failure is **not** broadcast to other
peers, to avoid amplifying a forged-envelope flood.

## 7. Session Token

The host mints a
[`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json)
on `JOIN_ROOM` and delivers it to the joiner over the room's WSS
channel. The token carries:

- `schemaVersion`, `tokenId` (UUID v4), `roomCode`, `issuerPeerId`,
  `subjectPeerId`, `iat`, `exp` (≤ 24 h), `nonceWindow`
  (default 256, max 4096), `sig` (issuer-signed over
  `[schemaVersion, tokenId, roomCode, issuerPeerId, subjectPeerId, iat, exp, nonceWindow]`).

`sessionTokenHash = sha256(canonicalJson(token))` is embedded in
every envelope. The signaling server stores the hash and validates
membership; the joiner stores the full token and replays the hash
on every outbound envelope. The token's `nonceWindow` MUST equal
the receiver ring-buffer size in § 4.

This doc owns the envelope and token shapes; rate-limit budgets and
the per-token throttle live in
[`signaling-rate-limits.md`](./signaling-rate-limits.md).

## 8. Failure Modes & Surface

| Failure | Surface | Owner |
|---|---|---|
| Bad signature on inbound envelope | `TRUST_VIOLATION_DETECTED { kind: 'badSignature' }` → 5 s grace toast → leave room | [Task 26](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md) |
| Replay (duplicate nonce) | `TRUST_VIOLATION_DETECTED { kind: 'nonceReplay' }` | Same |
| Clock skew > ±60 s | `TRUST_VIOLATION_DETECTED { kind: 'clockSkew' }`; UI hint to check device clock | Same |
| Unknown signer | `TRUST_VIOLATION_DETECTED { kind: 'unknownSigner' }` | Same |
| Server attestation lost | Envelope validation fails on `sessionTokenMismatch`; client transitions to reconnect path | [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |

## 9. Out of scope

- **Forward secrecy** for envelope signatures. The per-session HMAC
  in
  [`command-stream-integrity.md`](./command-stream-integrity.md)
  provides that for the command stream; the envelope is short-lived
  per-room and acceptable to sign with the long-lived peer key.
- **Server-side signature verification.** Explicitly **not** done;
  the server is stateless on identity per
  [`peer-identity.md` § 6](./peer-identity.md#6-join_room-envelope).

---

## 🔍 Sync Check

- **UI: ✔** — `TRUST_VIOLATION_DETECTED` banner shape, the 5-second
  grace toast, and the `Verifying identity…` row state all match
  [`wiki/screens/64-network-lobby/spec.md` § Trust](./wiki/screens/64-network-lobby/spec.md);
  every envelope-related `kind` value in this doc resolves to the
  closed enum used by the lobby banner.
- **Schema: ⚠** —
  [`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json)
  matches §§ 1–2 verbatim (`payloadType` enum, base64url widths
  for `sig` (86), `nonce` (22), `sessionTokenHash` (43)); both
  the envelope row and the `SessionToken` row are present in
  [`schema-matrix.md`](./schema-matrix.md).
  [`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json)
  matches § 7 once `schemaVersion` and the `nonceWindow`
  default / max are pinned (added in this rewrite).
- **Tasks: ❌** — Owning task
  [`26-signed-signaling-envelope`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
  and prerequisite
  [`25-peer-keypair-and-session-token`](../../tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md)
  read-first this doc and pin §§ 3, 5, 7. However, the
  `TRUST_VIOLATION_DETECTED.kind` enum in
  [`command-schema.md`](./command-schema.md#multiplayer-trust--identity-commands)
  is missing `schemaShapeMismatch`, and
  [`signaling-rate-limits.md` § 3](./signaling-rate-limits.md#3-rate_limited-reply)
  is missing `envelope_replay` from the `RATE_LIMITED.reason` enum.
  Both are CI-blocking enum gaps — see Issues.

## ⚠ Issues

- **`schemaShapeMismatch` missing from the
  `TRUST_VIOLATION_DETECTED.kind` closed enum.** § 5 dispatches
  `schemaShapeMismatch` for verification step 1 (outer envelope
  shape) and `payloadShapeMismatch` for step 7 (inner payload
  shape); the two are semantically distinct. The current enum in
  [`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands)
  carries `payloadShapeMismatch` but not `schemaShapeMismatch`. Per
  CLAUDE.md root contract ("schema evolution is additive-first") and
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md), the
  owning task —
  [`26-signed-signaling-envelope`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
  — must add `schemaShapeMismatch` to the enum and regenerate
  `enums.snapshot.json`. Skill did not edit `command-schema.md`
  (Hard Prohibition D).
- **`envelope_replay` missing from the `RATE_LIMITED.reason` closed
  enum.** § 4 says the signaling server emits
  `RATE_LIMITED { reason: "envelope_replay" }` on relay-edge replay
  rejection;
  [`signaling-rate-limits.md` § 3](./signaling-rate-limits.md#3-rate_limited-reply)
  defines the closed enum as
  `"join_flood" | "create_flood" | "wrong_code" | "global"`. Per
  the same enum-lifecycle policy, either
  [`13-signaling-rate-limiting`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  or Task 26 must add `envelope_replay` (or pick an existing reason
  and refit § 4 here). Suggested value: `envelope_replay` (matches
  this doc's wording). Skill did not edit
  `signaling-rate-limits.md` (Hard Prohibition D).
- **Missing `data-inventory.md` row for the joiner-side session
  token.** § 7 says "the joiner stores the full token and replays
  the hash on every outbound envelope" — this is in-flight session
  state held outside the engine. Sibling slices like
  `state.net.lobby.chat` (transient) and the in-flight
  `state.net.peers[peerId].dtlsFp` / `.nonceRing` rows flagged by
  [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md)'s
  `## ⚠ Issues` belong in the same batch. Per CLAUDE.md root
  contract ("every persisted field is registered in
  `data-inventory.md`"), the owning task —
  [`26-signed-signaling-envelope`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md)
  — should add a row. Suggested values:
  Field=`active session token`,
  State path=`state.net.lobby.sessionToken` (or the slice the runtime
  picks under `src/net/identity/`),
  Medium=`in-memory`, Sensitivity=`low` (token is host-issued,
  short-lived, room-scoped), Retention=`session`, Wipe scope=`n/a`,
  Notes=`session-token.schema.json`; replayed as
  `sha256(canonicalJson(token))` on every outbound envelope per § 7.
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
- **Stale `determinism.md#canonical-json` anchor repointed.** The
  previous § 3 cited `[determinism.md § Canonical JSON]`, but
  [`determinism.md`](./determinism.md) has no `## Canonical JSON`
  heading — the canonical-serializer rules live in
  [`§ Non-Negotiable Stack`](./determinism.md#non-negotiable-stack)
  item 4 (sorted keys, no whitespace, xxh64). The rewrite repoints
  the link without changing the cited rule. Not CI-blocking; FYI.
