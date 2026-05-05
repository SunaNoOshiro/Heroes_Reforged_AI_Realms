# Command Stream Integrity

Canonical doctrine for the **HMAC over every lockstep command
envelope**, the **per-session key derivation rule**, and the
**duplicate-`seq` / gap-`seq` policies**. Closes the bit-tampering
window that DTLS alone cannot close once a peer client is compromised
post-handshake.

> Source plan:
> [`docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md`](../implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md)
> § Critical Fix 4.

Companion docs:

- [`signaling-envelope.md`](./signaling-envelope.md) — outer
  signed-envelope contract (the HMAC fallback key is delivered
  through it).
- [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) —
  closes the SDP swap that would otherwise let an attacker derive
  their own session key.
- [`determinism.md`](./determinism.md) — canonical-JSON rule used
  by HMAC canonicalization.
- Schema:
  [`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json).

---

## 1. Wire Format

The lockstep DataChannel `commands` carries one command envelope
per message:

```jsonc
{
  "schemaVersion": 1,
  "seq": 42,                       // uint32, per-peer monotonic
  "playerId": 1,                   // uint8, 1-based
  "turn": 7,                       // uint32
  "command": { /* Command */ },    // canonical command shape
  "mac": "<base64url 16 bytes>"    // truncated HMAC-SHA256
}
```

The `mac` is the **first 16 bytes** of HMAC-SHA256 over the
canonicalized envelope (see § 3), encoded base64url without
padding. Truncation to 128 bits is standard for HMAC integrity
tags and balances overhead against forgery resistance.

## 2. Session Key Derivation

The per-session HMAC key is derived from the DTLS exporter:

```
sessionKey = exportKeyingMaterial("hr-cmd-mac", 32)
```

- Label: `"hr-cmd-mac"` (literal ASCII, no terminator).
- Length: 32 bytes (HMAC-SHA256 key length).
- Source: `RTCDtlsTransport.exportKeyingMaterial()` per RFC 5705.

The derived key is cached as a non-extractable `CryptoKey` in
`state.net.peers[peerId].cmdKey` and used only for HMAC sign /
verify. It MUST NOT be exported, logged, or cross the network in
any form.

### 2a. Fallback Key

Browsers without `exportKeyingMaterial` (currently: older Safari
revisions; verify per
[`tasks/phase-3/01-multiplayer/30-command-stream-hmac.md`](../../tasks/phase-3/01-multiplayer/30-command-stream-hmac.md))
fall back to a host-minted 32-byte CSPRNG key delivered to the
joiner inside the signed signaling envelope. The fallback path
MUST log a structured `tls-observability` warning (see
[`tls-observability.md`](./tls-observability.md)) so operators
can see how often it triggers, and the lobby UI shows a small
`(reduced MITM protection)` hint next to the trust badge.

## 3. Canonicalization Rule

The HMAC input is canonical JSON of:

```
[ schemaVersion, seq, playerId, turn, command ]
```

- `mac` itself is excluded from the input.
- Canonical JSON per
  [`determinism.md` § Canonical JSON](./determinism.md#canonical-json):
  sorted keys, no whitespace, integer-only numerics, `"` quoting,
  `\u` escapes for control chars.
- Two independent implementations MUST produce byte-identical
  inputs for the same envelope; the cross-engine parity test
  pins this.

## 4. Duplicate-`seq` Policy

`seq` is per-`(peerId, sessionId)` monotonic. Receivers maintain a
ring of the last 1024 accepted `seq` values per peer.

| Condition | Action |
|---|---|
| `seq` already in ring → `mac` matches an earlier-accepted envelope | Drop silently (network reorder / retransmit) |
| `seq` already in ring → `mac` differs | `TRUST_VIOLATION_DETECTED { kind: 'commandReplayMismatch', peerId, seq }` |
| Drop count > 3 in 30 s | `TRUST_VIOLATION_DETECTED { kind: 'commandReplayBurst', peerId }` |

The "drop count > 3 in 30 s" gate exists because a single
duplicate is normal; a burst of duplicates indicates either a
broken transport or a deliberate replay flood.

## 5. Gap-`seq` Policy

If a received `seq` is greater than the last accepted `seq + 1`,
the receiver:

1. Queues the inbound envelope.
2. Waits up to **2 turns** of wall-clock for the missing seqs to
   arrive (per the lockstep budget in
   [`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)).
3. After the 2-turn budget elapses with the gap still open,
   transitions into the bisect path
   ([Task 5](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md))
   and surfaces `Connection lost — recovering`.

Gap recovery is a determinism / network concern, not a trust
concern; it does NOT escalate to `TRUST_VIOLATION_DETECTED`.

## 6. Verification Order

On every inbound command envelope:

1. Schema-shape match.
2. `playerId` matches the channel's pinned `peerId` (no cross-peer
   spoofing).
3. `seq` not in the duplicate ring (per § 4).
4. `mac` verifies against `(canonicalize([…]), sessionKey)`.
5. Inner `command` validates against `command.schema.json`.

`mac`-failure escalation is **strict**: a single `mac` mismatch
dispatches `TRUST_VIOLATION_DETECTED { kind: 'commandMacInvalid' }`
immediately. There is no per-burst threshold here because a single
forged HMAC is already evidence of either a key compromise or a
transport-layer attack; in both cases the match is unsafe to
continue.

## 7. Telemetry

The desync-detection telemetry per
[`docs/architecture/desync-redaction.md`](./desync-redaction.md)
gains a `macFailureCount` counter, redacted to the same
`/24` IPv4 / `/64` IPv6 bucket as TLS observability. No raw peer
identity is logged.

## 8. Out of scope

- **Replay protection across rooms** — per-session keys make
  cross-room replay impossible by construction; no extra rule
  needed.
- **Forward secrecy** — DTLS already provides per-session forward
  secrecy on the keying material; the HMAC key inherits this.
- **Encryption of the command stream** — DTLS already encrypts
  every DataChannel byte; the HMAC adds *integrity* on top of
  *confidentiality*, not redundant encryption.
