# Lockstep Envelope (Plan 26 — Critical Fix 1)

> Source plan:
> [`docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md`](../implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md)
> § Critical Fix 1.
>
> Crypto primitive in use here (HMAC-SHA-256 per-match) is
> catalogued in [`crypto-primitives.md`](./crypto-primitives.md).

Canonical wire-shape doctrine for the M5 lockstep DataChannel. Every
in-game command, every per-turn state-hash payload, and every bisect
midpoint is wrapped in the **lockstep envelope** and authenticated
with a per-match HMAC keyed by `matchKey` derived in
[`match-handshake.md`](./match-handshake.md).

This envelope **supersedes** the legacy
[`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json)
shape for the M5 multiplayer module. The legacy envelope is retained
for the Phase-3 single-session HMAC contract documented in
[`command-stream-integrity.md`](./command-stream-integrity.md);
new code under `src/net/lockstep/` MUST use the lockstep envelope.

Schema:
[`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json).
Owning task:
[`tasks/phase-3/01-multiplayer/09-lockstep-envelope-and-mac.md`](../../tasks/phase-3/01-multiplayer/09-lockstep-envelope-and-mac.md).

---

## 1. Wire shape

```jsonc
{
  "matchId":    "550e8400-e29b-41d4-a716-446655440000",
  "matchEpoch": 0,
  "seq":        42,
  "playerId":   "11111111-2222-3333-4444-555555555555",
  "turn":       7,
  "command":    { /* inner record per command.schema.json */ },
  "mac":        "<64 lower-case hex chars>"
}
```

| Field | Type | Source |
| --- | --- | --- |
| `matchId` | UUID v4 | Derived during the handshake `xxh64("matchId-v1" ∥ nonceA ∥ nonceB)`; rendered as a v4-shape UUID. |
| `matchEpoch` | integer ≥ 0 | Starts at `0`. Incremented on host migration / reconnect-replay per [`07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md). Old-epoch envelopes are rejected. |
| `seq` | integer ≥ 0 | Per-`(playerId, matchEpoch)` monotonic. Validation rules live in [`03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) § Sequence Validation. |
| `playerId` | UUID v4 | Pinned at handshake. The receiver rejects any envelope whose `playerId` does not match the channel's pinned peer. |
| `turn` | integer ≥ 0 | Issuance turn. Used by visibility precondition + canonical intra-turn order. |
| `command` | object | Inner record validated against [`command.schema.json`](../../content-schema/schemas/command.schema.json) **after** the MAC check passes. May also be a `BISECT_MIDPOINT` per [`bisect-protocol.md`](./bisect-protocol.md). |
| `mac` | hex(64) | Lower-case-hex HMAC-SHA-256 over the canonical-JSON of the envelope with `mac` absent (see § 3). |

`additionalProperties: false` is enforced by the schema.

---

## 2. Canonical-JSON serialization rule

The MAC input is canonical JSON of the envelope object **with the
`mac` field removed**. Canonical JSON, as pinned by
[`determinism.md` § Canonical JSON](./determinism.md):

- Object keys sorted lexicographically (UTF-16 code-unit order).
- No whitespace between tokens.
- Integers serialized as decimal; no leading zeros, no `+`, no `-0`.
- Strings are double-quoted; control chars escaped as `\u00XX`.
- No `NaN`, no `Infinity`.

Two independent implementations MUST produce byte-identical canonical
JSON for the same envelope. The cross-environment serializer parity
test from
[`runtime-requirements.md` RR-09](./runtime-requirements.md) covers
this.

---

## 3. MAC input definition

```text
mac = lower_hex( HMAC_SHA_256(
        key   = matchKey,
        input = canonicalJsonBytes(envelope without mac)
      ) )
```

- `matchKey` is the 32-byte key derived in
  [`match-handshake.md`](./match-handshake.md) §
  Derivation: `matchKey = HKDF-SHA-256(salt = "lockstep-mac-v1",
  ikm = nonceA ∥ nonceB, length = 32)`.
- `lower_hex` is the standard hex encoding using the alphabet
  `0123456789abcdef` (no upper-case, no separators).
- Comparison is constant-time only. A single byte mismatch
  rejects the envelope (see § 5).

The MAC covers `matchId`, `matchEpoch`, `seq`, `playerId`, `turn`,
and the entire `command` payload. Tampering with any of those
invalidates the MAC.

---

## 4. Verification order

On every received envelope:

1. **Schema-shape match** against `lockstep-envelope.schema.json`.
2. **`matchId` matches** the locally pinned `matchId` from the
   handshake.
3. **`matchEpoch` matches** the locally pinned current epoch.
4. **`playerId` matches** the channel's pinned peer (no
   cross-peer spoofing).
5. **MAC verifies** against
   `(canonicalJson(envelopeWithoutMac), matchKey)`.
6. **Sequence validation** per
   [`03-...md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
   § Sequence Validation.
7. **Inner `command` validation** against
   [`command.schema.json`](../../content-schema/schemas/command.schema.json).
8. **Visibility precondition** per
   [`command-schema.md`](./command-schema.md) § Visibility
   Precondition.

---

## 5. Rejection behavior

| Failure | Action | Telemetry |
| --- | --- | --- |
| Schema-shape | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'schema' }` |
| `matchId` mismatch | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'matchId' }` |
| `matchEpoch` mismatch | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'matchEpoch' }` |
| `playerId` mismatch | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'playerId' }` |
| MAC mismatch | Drop **and** dispatch `TRUST_VIOLATION_DETECTED { kind: 'lockstepMacInvalid' }` per [`command-stream-integrity.md` § 6](./command-stream-integrity.md#6-verification-order). | `LOCKSTEP_MAC_REJECTED` |
| Sequence rule violation | Drop per § Sequence Validation. | `LOCKSTEP_SEQ_REJECTED { reason }` |
| Inner-command schema | Drop. | `LOCKSTEP_COMMAND_INVALID` |
| Visibility precondition | Reject canonically (both peers reject the same way based on canonical state). | `COMMAND_REJECTED_PRECONDITION` |

In **no case** does a reject log the raw envelope payload.
Telemetry is count + reason only; no command bodies, no MAC bytes.

---

## 6. Why hex(64) instead of base64url(22)?

The legacy
[`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json)
truncates the HMAC to 16 bytes for wire-cost reasons. The lockstep
envelope keeps the full 32-byte MAC (64 hex chars) because:

1. The lockstep envelope rides the `commands` DataChannel which is
   already congestion-bounded by per-turn cadence, not by per-byte
   throughput.
2. The lockstep envelope is also the carrier for `BISECT_MIDPOINT`
   payloads (see [`bisect-protocol.md`](./bisect-protocol.md));
   forging a midpoint hash with a 128-bit MAC search is *theoretical*
   but the full 256-bit MAC removes any debate.
3. Hex output is canonical-JSON friendly: no `=` padding, fixed
   length, deterministic alphabet.

---

## 7. `unwrap` is the only entry point

`src/net/lockstep/envelope.ts` exposes:

```ts
export function wrap(matchKey: CryptoKey, inner: EnvelopeInner): Envelope;
export function unwrap(matchKey: CryptoKey, raw: unknown):
  | { ok: true; inner: EnvelopeInner }
  | { ok: false; reason: RejectReason };
```

The lockstep transport MUST call `unwrap` on every received payload
before any decision. Raw JSON never reaches the reducer queue. `wrap`
is called by the local-player command pipeline before transmission.
The MAC is computed using `globalThis.crypto.subtle.sign('HMAC', …)`
exclusively; `node:crypto` MUST NOT be imported under
`src/net/lockstep/` so the same code path runs in browser and Node
test harness.

---

## 8. Out of scope

- **Confidentiality of the command stream.** DTLS-SRTP already
  encrypts every DataChannel byte; the MAC adds *integrity and
  per-match binding* on top of *confidentiality*, not redundant
  encryption.
- **Forward secrecy of `matchKey`.** Each match derives a fresh
  `matchKey` from fresh CSPRNG nonces; cross-match secrecy is
  by-construction.
- **Replay across rooms.** `matchId` binding rejects this by
  construction; no extra rule needed.
