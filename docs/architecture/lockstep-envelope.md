# Lockstep Envelope

Canonical wire-shape doctrine for the M5 lockstep DataChannel. Every
in-game command, every per-turn state-hash payload, and every bisect
midpoint rides the **lockstep envelope** and is authenticated with a
per-match HMAC keyed by `matchKey` derived in
[`match-handshake.md`](./match-handshake.md).

This envelope **supersedes** the legacy
[`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json)
shape for the M5 multiplayer module. The legacy envelope still owns
the Phase-3 single-session HMAC contract documented in
[`command-stream-integrity.md`](./command-stream-integrity.md);
new code under `src/net/lockstep/` MUST use the lockstep envelope.

Companion docs:
[`match-handshake.md`](./match-handshake.md),
[`command-stream-integrity.md`](./command-stream-integrity.md),
[`bisect-protocol.md`](./bisect-protocol.md),
[`determinism.md`](./determinism.md),
[`crypto-primitives.md`](./crypto-primitives.md) (HMAC-SHA-256
per-match catalogue entry).

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
| `matchId` | UUID-shape string | Derived during the handshake as `xxh64("matchId-v1" ∥ nonceA ∥ nonceB)`, rendered as a UUID v4 textual form. |
| `matchEpoch` | integer `0..65535` | Starts at `0` on first `ACCEPT`. Incremented on host migration / reconnect-replay per [`07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md). Old-epoch envelopes are rejected as stale. |
| `seq` | integer `0..2^32−1` | Per-`(playerId, matchEpoch)` monotonic uint32. Validation rules live in [`03-input-only-lockstep-command-serialization-plus-sequencing.md` § Sequence Validation](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md). |
| `playerId` | UUID-shape string | Pinned at handshake. The receiver rejects any envelope whose `playerId` does not match the channel's pinned peer. |
| `turn` | integer `0..2^32−1` | Issuance turn. Used by canonical intra-turn order (sort by `(turn, playerId, seq)`) and by the visibility precondition. |
| `command` | object | Inner record. For in-game commands, validates against [`command.schema.json`](../../content-schema/schemas/command.schema.json) **after** the MAC check passes. May also be a `BISECT_MIDPOINT` per [`bisect-protocol.md` § 2](./bisect-protocol.md). |
| `mac` | hex(64) | Lower-case-hex HMAC-SHA-256 over canonical-JSON of the envelope with `mac` absent (see § 3). |

`additionalProperties: false` is enforced by the schema.

---

## 2. Canonical-JSON serialization

The MAC input is canonical JSON of the envelope object **with the
`mac` field removed**. Canonical JSON, as pinned by
[`determinism.md`](./determinism.md):

- Object keys sorted lexicographically (UTF-16 code-unit order).
- No whitespace between tokens.
- Integers serialized as decimal; no leading zeros, no `+`, no `-0`.
- Strings double-quoted; control chars escaped as `\u00XX`.
- No `NaN`, no `Infinity`.

Two independent implementations MUST produce byte-identical canonical
JSON for the same envelope. The cross-environment serializer parity
test pinned in
[`runtime-requirements.md` RR-09](./runtime-requirements.md#rr-09-cross-environment-serializer-parity)
covers this.

---

## 3. MAC input

```text
mac = lower_hex( HMAC_SHA_256(
        key   = matchKey,
        input = canonicalJsonBytes(envelope without mac)
      ) )
```

- `matchKey` is the 32-byte key derived in
  [`match-handshake.md` § 4 Derivation rules](./match-handshake.md):
  `matchKey = HKDF-SHA-256(salt = "lockstep-mac-v1", ikm = nonceA ∥ nonceB, length = 32)`.
- `lower_hex` uses the alphabet `0123456789abcdef` (no upper-case,
  no separators).
- Comparison is constant-time only. A single byte mismatch rejects
  the envelope (see § 5).

The MAC covers `matchId`, `matchEpoch`, `seq`, `playerId`, `turn`,
and the entire `command` payload. Tampering with any of those
invalidates the MAC.

---

## 4. Verification order

On every received envelope, in this order:

1. **Schema-shape match** against `lockstep-envelope.schema.json`.
2. **`matchId` matches** the locally pinned `matchId` from the
   handshake.
3. **`matchEpoch` matches** the locally pinned current epoch.
4. **`playerId` matches** the channel's pinned peer (no cross-peer
   spoofing).
5. **MAC verifies** against
   `(canonicalJson(envelopeWithoutMac), matchKey)`.
6. **Sequence validation** per
   [`03-input-only-lockstep-command-serialization-plus-sequencing.md` § Sequence Validation](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md).
7. **Inner `command` validation** against
   [`command.schema.json`](../../content-schema/schemas/command.schema.json).
8. **Visibility precondition** per
   [`command-schema.md`](./command-schema.md) § Visibility Precondition.

---

## 5. Rejection behavior

| Failure | Action | Telemetry |
| --- | --- | --- |
| Schema-shape | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'schema' }` |
| `matchId` mismatch | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'matchId' }` |
| `matchEpoch` mismatch | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'matchEpoch' }` |
| `playerId` mismatch | Drop. | `LOCKSTEP_ENVELOPE_REJECTED { reason: 'playerId' }` |
| MAC mismatch | Drop **and** dispatch `TRUST_VIOLATION_DETECTED { kind: 'lockstepMacInvalid' }` per [`command-stream-integrity.md` § 6](./command-stream-integrity.md#6-verification-order). | `LOCKSTEP_MAC_REJECTED` |
| Sequence rule violation | Drop per [`03-...md` § Sequence Validation](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md). | `LOCKSTEP_SEQ_REJECTED { reason }` |
| Inner-command schema | Drop. | `LOCKSTEP_COMMAND_INVALID` |
| Visibility precondition | Reject canonically (both peers reject the same way based on canonical state). | `COMMAND_REJECTED_PRECONDITION` |

Telemetry is count + reason only; rejects MUST NOT log the raw
envelope payload, command body, or MAC bytes.

---

## 6. Why hex(64) instead of base64url(22)?

The legacy
[`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json)
truncates the HMAC to 16 bytes (22 base64url chars) for wire-cost
reasons. The lockstep envelope keeps the full 32-byte MAC (64 hex
chars):

1. The lockstep envelope rides the `commands` DataChannel which is
   bounded by per-turn cadence, not by per-byte throughput.
2. The same envelope carries `BISECT_MIDPOINT` payloads (see
   [`bisect-protocol.md`](./bisect-protocol.md)); forging a midpoint
   hash with a 128-bit MAC search is theoretical, but the full
   256-bit MAC removes any debate.
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

- **Inputs.** `matchKey` (non-extractable `CryptoKey`); for `unwrap`,
  one `unknown` raw value off the wire.
- **Outputs.** `wrap` returns a fully-formed envelope with `mac`
  populated; `unwrap` returns either the validated inner record or a
  typed `RejectReason`.
- **Side effects.** None beyond `crypto.subtle.sign` / `verify`.

The lockstep transport MUST call `unwrap` on every received payload
before any decision; raw JSON never reaches the reducer queue.
`wrap` is called by the local-player command pipeline before
transmission. The MAC is computed using
`globalThis.crypto.subtle.sign('HMAC', …)` exclusively;
`node:crypto` MUST NOT be imported anywhere under
`src/net/lockstep/`, so the same code path runs in browser and Node
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

---

## 🔍 Sync Check

- **UI: ✔** — Screen-77 surfaces `envelopeStats { macFailureCount, duplicateSeqDrops, preconditionRejects, lastBisectOutcome }` and `matchInfo { matchId, matchEpoch, currentTurn, lastAgreedHash }` against this doc per [`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md) and [`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md); field names and counter labels match.
- **Schema: ✔** — Wire shape (`matchId` / `matchEpoch` / `seq` / `playerId` / `turn` / `command` / `mac`), patterns, ranges, and the `lockstepMacInvalid` escalation match [`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json); row present in [`schema-matrix.md`](./schema-matrix.md) under `LockstepEnvelope` with all four canonical example fixtures registered. The `BISECT_MIDPOINT` inner shape lives in [`bisect-protocol.md` § 2](./bisect-protocol.md), not in `command.schema.json` (which is the in-game `oneOf`); the schema's `command: object` typing matches that split.
- **Tasks: ❌** — Owning task [`phase-3.01-multiplayer.09-lockstep-envelope-and-mac`](../../tasks/phase-3/01-multiplayer/09-lockstep-envelope-and-mac.md) reads-first this doc and pins MAC golden tests; downstream task [`03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) reciprocates the link. However, [`07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — the task this doc and the schema name as the owner of `matchEpoch` increment — has no mention of `matchEpoch` in its spec, and [`command-schema.md`](./command-schema.md) has no `## Visibility Precondition` heading even though step 8 of § 4 (and several sibling docs) cite that anchor. See ⚠ Issues.

## ⚠ Issues

- **Task 07 does not name `matchEpoch`.** [`lockstep-envelope.md` § 1](./lockstep-envelope.md) and [`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json)'s `matchEpoch` description both pin the increment to [`07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md), but task 07's spec covers heartbeat election, `HOST_CHANGED` envelope signing, and quorum-attested disconnect — it never mentions `matchEpoch` or epoch-bumping at all. Per CLAUDE.md root contract ("every 'owned by …' claim must resolve to a real task ID or module path"), task 07 must add an explicit acceptance criterion that re-election bumps `state.net.match.matchEpoch` and re-derives `matchKey` from a fresh handshake exchange (already implied by [`match-handshake.md` § 4](./match-handshake.md)). Suggested values: acceptance bullet "On `HOST_CHANGED`, both peers increment `matchEpoch` and re-run the COMMIT/REVEAL/ACCEPT exchange so the next envelope rides under the new `(matchEpoch, matchKey)` pair." Skill did not edit task 07 (Hard Prohibition D).
- **Broken cross-reference `command-schema.md § Visibility Precondition`.** § 4 step 8 and § 5's last row link to that section; the same anchor is referenced from [`security-model.md` § 49 / § 120](./security-model.md), [`build-attestation.md` § 190](./build-attestation.md), and [`spectator-mode-requirements.md` § 46](./spectator-mode-requirements.md). [`command-schema.md`](./command-schema.md) has no such heading; the closest existing material is `## Field Visibility (Desync Redaction)` (a redactor convention, not a runtime precondition) and `### Gate 2 — Semantic validation` (per-command preconditions, but unnamed for fog-of-war). The runtime contract is owned by [`tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md`](../../tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md). Per CLAUDE.md root contract on canonical anchors, the fix is to add a `## Visibility Precondition` section to `command-schema.md` (defined: "the issuing peer's projection at `turn` must permit observation of every tile / entity referenced by `command`; rejected commands canonically resolve to `COMMAND_REJECTED_PRECONDITION` on both peers"). Owner: the task above. Surfaced rather than rewritten because four other arch docs share the link target — unilateral edits in this file alone would split the canonical statement. Skill did not edit `command-schema.md` (Hard Prohibition D).
