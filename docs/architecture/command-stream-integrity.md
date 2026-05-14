# Command Stream Integrity

Canonical doctrine for the **HMAC over every lockstep command
envelope**, the **per-session key derivation rule**, and the
**duplicate-`seq` / gap-`seq` policies**. Closes the bit-tampering
window that DTLS alone cannot close once a peer client is compromised
post-handshake.

Companion docs:

- [`signaling-envelope.md`](./signaling-envelope.md) — outer
  signed-envelope contract; carries the HMAC fallback key (§ 2a).
- [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) —
  closes the SDP swap that would otherwise let an attacker derive
  their own session key.
- [`determinism.md`](./determinism.md) § Canonical JSON — the
  canonical-JSON rule used by HMAC canonicalization (§ 3).
- [`lockstep-envelope.md`](./lockstep-envelope.md) — M5 successor
  envelope. New code under `src/net/lockstep/` MUST use that shape;
  this doc remains canonical for the legacy `commands` channel
  HMAC contract.
- Schema:
  [`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json)
  (legacy; superseded by `lockstep-envelope.schema.json` for M5).

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
  "mac": "<base64url 22 chars>"    // truncated HMAC-SHA256
}
```

`mac` is the **first 16 bytes** of HMAC-SHA256 over the canonicalized
envelope (§ 3), encoded base64url without padding (22 url-safe
chars). Truncation to 128 bits is standard for HMAC integrity tags
and balances overhead against forgery resistance.

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

Browsers without `exportKeyingMaterial` (currently older Safari
revisions; supported baselines pinned per
[`tasks/phase-3/01-multiplayer/30-command-stream-hmac.md`](../../tasks/phase-3/01-multiplayer/30-command-stream-hmac.md))
fall back to a host-minted 32-byte CSPRNG key delivered to the
joiner inside the signed signaling envelope.

The fallback path:

- Logs a structured `tls-observability` warning per
  [`tls-observability.md`](./tls-observability.md) so operators can
  see how often it triggers.
- Surfaces a `(reduced MITM protection)` hint next to the lobby
  trust badge.

## 3. Canonicalization Rule

The HMAC input is canonical JSON of:

```
[ schemaVersion, seq, playerId, turn, command ]
```

- `mac` itself is excluded from the input.
- Canonical JSON per
  [`determinism.md`](./determinism.md) § Canonical JSON: sorted
  keys, no whitespace, integer-only numerics, double-quoted strings,
  `\u` escapes for control chars.
- Two independent implementations MUST produce byte-identical
  inputs for the same envelope; the cross-engine parity test pins
  this.

## 4. Duplicate-`seq` Policy

`seq` is per-`(peerId, sessionId)` monotonic. Receivers maintain a
ring of the last 1024 accepted `seq` values per peer.

| Condition | Action |
|---|---|
| `seq` in ring; `mac` matches an earlier-accepted envelope | Drop silently (network reorder / retransmit) |
| `seq` in ring; `mac` differs | `TRUST_VIOLATION_DETECTED { kind: 'commandReplayMismatch', peerId, seq }` |
| Drop count > 3 in 30 s | `TRUST_VIOLATION_DETECTED { kind: 'commandReplayBurst', peerId }` |

The `> 3 in 30 s` gate exists because a single duplicate is normal;
a burst indicates either a broken transport or a deliberate replay
flood.

## 5. Gap-`seq` Policy

If a received `seq` is greater than the last accepted `seq + 1`,
the receiver:

1. Queues the inbound envelope.
2. Waits up to **2 turns** of wall-clock for the missing seqs
   (per the lockstep budget in
   [`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)).
3. After the 2-turn budget elapses with the gap still open,
   transitions into the bisect path
   ([Task 5](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md))
   and surfaces `Connection lost — recovering`.

Gap recovery is a determinism / network concern, not a trust
concern; it does NOT escalate to `TRUST_VIOLATION_DETECTED`.

## 6. Verification Order

On every inbound command envelope, in this order:

1. Schema-shape match.
2. `playerId` matches the channel's pinned `peerId` (no cross-peer
   spoofing).
3. `seq` not in the duplicate ring (§ 4).
4. `mac` verifies against `(canonicalize([…]), sessionKey)`.
5. Inner `command` validates against `command.schema.json`.

`mac`-failure escalation is **strict**: a single `mac` mismatch
dispatches `TRUST_VIOLATION_DETECTED { kind: 'commandMacInvalid' }`
immediately. There is no per-burst threshold here — a single forged
HMAC is already evidence of either a key compromise or a
transport-layer attack, and continuing the match is unsafe in both
cases.

## 7. Telemetry

The desync-detection telemetry per
[`desync-redaction.md`](./desync-redaction.md) gains a
`macFailureCount` counter, redacted to the same `/24` IPv4 / `/64`
IPv6 bucket as TLS observability. No raw peer identity is logged.

## 8. Out of scope

- **Replay protection across rooms** — per-session keys make
  cross-room replay impossible by construction; no extra rule
  needed.
- **Forward secrecy** — DTLS already provides per-session forward
  secrecy on the keying material; the HMAC key inherits it.
- **Encryption of the command stream** — DTLS already encrypts
  every DataChannel byte; the HMAC adds *integrity* on top of
  *confidentiality*, not redundant encryption.

---

## 🔍 Sync Check

- **UI: ✔** — Lobby `(reduced MITM protection)` hint and
  trust-violation banner attribution match
  [`wiki/screens/64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  § Trust; `Connection lost — recovering` surfaces during the
  bisect path described in § 5.
- **Schema: ⚠** — Wire shape, `mac` pattern (`^[A-Za-z0-9_-]{22}$`),
  and `commandMacInvalid` escalation match
  [`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json).
  The schema is marked `x-supersededBy: lockstep-envelope.schema.json`
  for M5; this doc still owns the legacy contract per
  [`lockstep-envelope.md`](./lockstep-envelope.md) and that
  relationship is now linked from the companion block.
- **Tasks: ⚠** — Owning task
  [`phase-3.01-multiplayer.30-command-stream-hmac`](../../tasks/phase-3/01-multiplayer/30-command-stream-hmac.md)
  reads-first this doc; `TRUST_VIOLATION_DETECTED` `kind` enum and
  duplicate-/gap-seq policies match its acceptance criteria. The
  `cmdKey` slice and `macFailureCount` counter referenced here are
  forward-looking claims not yet present in
  [`data-inventory.md`](./data-inventory.md) /
  [`desync-redaction.md`](./desync-redaction.md) — see Issues.

## ⚠ Issues

- **Broken anchor `determinism.md#canonical-json` removed.** The
  original linked `[determinism.md § Canonical JSON](./determinism.md#canonical-json)`,
  but [`determinism.md`](./determinism.md) has no `## Canonical
  JSON` heading (the relevant material lives across § State-shape
  invariants and § Canonical Command Key). Sibling doc
  [`lockstep-envelope.md`](./lockstep-envelope.md) § 2 uses the
  same `§ Canonical JSON` link text without a fragment; the rewrite
  matches that pattern (section reference in prose, no broken
  anchor). Per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md)-style
  alias-before-remove, the long-term fix is to add an anchored
  `## Canonical JSON` heading in `determinism.md` so cross-doc
  references can target it; that is owned by whichever task next
  edits `determinism.md` (the determinism doc itself has no
  dedicated owning task in the registry).
- **Missing `data-inventory.md` row for
  `state.net.peers[peerId].cmdKey`.** This doc and Task 30 both
  assert the per-session HMAC key is cached at that state path
  (non-extractable, in-memory only, never persisted). Per CLAUDE.md
  root contract ("every persisted field is registered in
  data-inventory.md") and the precedent set by
  `state.net.lobby.chat` (in-memory, transient, but registered),
  [`data-inventory.md`](./data-inventory.md) should carry a row.
  Owning task:
  [`phase-3.01-multiplayer.30-command-stream-hmac`](../../tasks/phase-3/01-multiplayer/30-command-stream-hmac.md).
  Suggested values: Field=`per-peer HMAC session key`, State path=
  `state.net.peers[peerId].cmdKey`, Medium=`in-memory`,
  Sensitivity=`high`, Retention=`session`, Wipe scope=`n/a`,
  Notes=`non-extractable CryptoKey; never persisted, exported, or
  logged`. Skill did not edit `data-inventory.md` (Hard Prohibition
  D — never edit cross-checked files).
- **`macFailureCount` counter not yet defined in
  `desync-redaction.md`.** Section 7 prescribes the counter and the
  redaction bucket; the counter is owed by Task 30's acceptance
  criterion ("Telemetry counter `macFailureCount` flows into the
  desync-detection telemetry per `desync-redaction.md`"). Not
  CI-blocking today (the counter ships alongside the runtime), but
  flagged so the desync-redaction doc adds a paragraph when Task 30
  lands. Owning task:
  [`phase-3.01-multiplayer.30-command-stream-hmac`](../../tasks/phase-3/01-multiplayer/30-command-stream-hmac.md).
