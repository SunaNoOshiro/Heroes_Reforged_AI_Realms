# Match Handshake (Plan 26 — Critical Fix 2)

> Source plan:
> [`docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md`](../implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md)
> § Critical Fix 2.

Canonical doctrine for the start-of-match three-phase commit-reveal
handshake that derives the per-match `seed`, `matchId`, and
`matchKey`, and binds both peers to the same
`(contentHash, engineHash, packManifestDigest, bundleSha256,
signaturePolicy)` before the first command is sent.

This handshake is the **first** message exchange on the open
DataChannel. No in-game `seq=0` envelope is permitted before both
peers have exchanged `ACCEPT`.

Schema:
[`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json).
Owning task:
[`tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md`](../../tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md).
Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`pack-contract.md`](./pack-contract.md),
[`build-attestation.md`](./build-attestation.md).

---

## 1. Why a handshake?

Without a handshake, the host picks the seed unilaterally. The host
then knows every PCG32 sub-stream cursor for the whole match and can
optimize strategy against future RNG. This is invisible to per-turn
state-hash detection because both peers agree on the rolls — the
host just picked them. The handshake removes the host's unilateral
control by deriving the seed from **both** peers' fresh CSPRNG
nonces, after both peers have **committed** to their nonce without
having seen the other's.

It also pins the `(contentHash, engineHash, packManifestDigest,
bundleSha256, signaturePolicy)` tuple so a peer who lies about their
load-time content cannot escape detection by claiming "we both
agreed".

---

## 2. Three phases

```text
Peer A                                    Peer B
  |                                          |
  |--- COMMIT { peerId: A, commit: HA } --->|
  |<-- COMMIT { peerId: B, commit: HB } ----|
  |                                          |
  |--- REVEAL { peerId: A, nonce, ... } --->|
  |<-- REVEAL { peerId: B, nonce, ... } ----|
  |                                          |
  |  verify HA = xxh64(reveal-fields-A)     |
  |  verify HB = xxh64(reveal-fields-B)     |
  |  agree on contentHash, engineHash, ...  |
  |  derive seed, matchId, matchKey         |
  |                                          |
  |--- ACCEPT { peerId: A, matchId } ----->|
  |<-- ACCEPT { peerId: B, matchId } ------|
  |                                          |
  |    --- match begins, seq=0 onward ---   |
```

If any verification fails, **both** peers must emit `ABORT { reason }`
with the matching reason and tear down the channel. The lockstep
transport MUST NOT fall back to a single-peer "default" for any of
the pinned values — there is no canonical pack agreement until both
peers explicitly produce the same hash.

---

## 3. Phase shapes

### COMMIT

```jsonc
{
  "phase": "COMMIT",
  "peerId": "<UUID v4>",
  "commit": "<16 hex chars>"     // xxh64 hex
}
```

`commit = xxh64(nonce ∥ contentHash ∥ engineHash ∥
packManifestDigest ∥ bundleSha256 ∥ signaturePolicy)`. All inputs
are normalized to canonical-JSON byte strings before concatenation,
in the order listed.

### REVEAL

```jsonc
{
  "phase": "REVEAL",
  "peerId": "<UUID v4>",
  "nonce": "<64 hex chars>",     // 32 raw CSPRNG bytes
  "contentHash": "<16 hex chars>",
  "engineHash": "<16 hex chars>",
  "packManifestDigest": "<16 hex chars>",
  "bundleSha256": "<64 hex chars>",
  "signaturePolicy": "optional" | "required-friendly" | "required-ranked",
  "packSignature": { "scheme": "ed25519", "keyId": "<…>", "sig": "<128 hex chars>" }
}
```

`packSignature` is **required** when `signaturePolicy` is
`required-ranked`; **required** when `required-friendly`; allowed
but not required when `optional`. The signature scheme MUST be
`ed25519` per
[`pack-contract.md`](./pack-contract.md) § Signature Policy.

### ACCEPT

```jsonc
{
  "phase": "ACCEPT",
  "peerId": "<UUID v4>",
  "matchId": "<UUID v4>"
}
```

Sent only after both peers have verified each other's REVEAL and
agreed on the pinned values.

### ABORT

```jsonc
{
  "phase": "ABORT",
  "peerId": "<UUID v4>",
  "reason": "COMMIT_MISMATCH"
              | "CONTENT_HASH_MISMATCH"
              | "ENGINE_HASH_MISMATCH"
              | "PACK_DIGEST_MISMATCH"
              | "BUILD_ATTESTATION_MISMATCH"
              | "PACK_SIGNATURE_REQUIRED"
              | "PACK_SIGNATURE_INVALID"
              | "HANDSHAKE_TIMEOUT"
              | "PROTOCOL_ERROR"
}
```

`HANDSHAKE_TIMEOUT` triggers if any phase does not complete within
`HANDSHAKE_PHASE_TIMEOUT_MS = 10_000` per side.

---

## 4. Derivation rules

After both REVEALs verify and the pinned tuples match:

```text
N    = bytes(nonceA) || bytes(nonceB)        // lexicographic peerId order
seed = xxh64( N )                            // canonical PCG32 seed
matchId  = uuidV4FromBytes( xxh64( "matchId-v1" || N ) )
matchKey = HKDF-SHA-256( salt = "lockstep-mac-v1",
                         ikm  = N,
                         length = 32 )
```

Lexicographic peerId order on the concatenation: when concatenating
`bytes(nonceA) || bytes(nonceB)`, the peer whose `peerId` sorts
**first** lexicographically is "A". This makes `seed`, `matchId`,
and `matchKey` byte-stable regardless of which side called itself
host.

`matchEpoch` starts at `0` after both `ACCEPT` are sent. Host
migration / reconnect-replay (per
[`07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md))
increments `matchEpoch` and re-derives `matchKey` from a fresh
handshake exchange.

---

## 5. Rejection table

| Reason | When |
| --- | --- |
| `COMMIT_MISMATCH` | A REVEAL whose `xxh64(reveal-fields)` does not equal the previously sent `commit`. |
| `CONTENT_HASH_MISMATCH` | The two peers' `contentHash` values differ. |
| `ENGINE_HASH_MISMATCH` | The two peers' `engineHash` values differ. |
| `PACK_DIGEST_MISMATCH` | The two peers' `packManifestDigest` values differ. |
| `BUILD_ATTESTATION_MISMATCH` | Ranked play and the opponent's `bundleSha256` is not in the canonical allow-list per [`build-attestation.md`](./build-attestation.md). |
| `PACK_SIGNATURE_REQUIRED` | `signaturePolicy = "required-*"` and the opponent's REVEAL omits `packSignature`. |
| `PACK_SIGNATURE_INVALID` | `packSignature.sig` does not verify against the trusted key list. |
| `HANDSHAKE_TIMEOUT` | Any phase exceeds `HANDSHAKE_PHASE_TIMEOUT_MS = 10_000`. |
| `PROTOCOL_ERROR` | Out-of-order phase, malformed JSON, schema-shape mismatch. |

The peer that detects the violation emits the `ABORT`. The peer that
receives an `ABORT` MUST tear down the DataChannel and surface the
reason to the lobby UI per
[`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/).

---

## 6. Mid-match re-validation

At the end of every turn, alongside the per-turn state-hash exchange
([`04-...md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)),
each peer also re-sends `packManifestDigest`. If the received digest
differs from the digest agreed at handshake, the receiver dispatches
`MID_MATCH_PACK_SWAP` desync abort. This catches the case where a
peer hot-swaps a pack mid-match (e.g., to alter visuals or AI
personality) while keeping the canonical state hash agreement.

The `packManifestDigest` re-validation is **not** wrapped in its own
schema; it rides the existing per-turn-hash payload as an additional
field. See
[`04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
for the payload shape.

---

## 7. Pack manifest digest derivation

Pinned in
[`src/content-runtime/manifest-digest.ts`](../../src/content-runtime/manifest-digest.ts)
(owned by task 10):

```ts
packManifestDigest = xxh64( canonicalJsonBytes( manifest.json ) )
```

The canonical-JSON rule is the same as for the lockstep envelope:
sorted keys, no whitespace, integer-only numerics. Two peers with
the same pack always derive the same digest. The digest is
**deterministic over `manifest.json` only**, not over the asset
files; that latter coverage is provided by `contentHash` (which
covers the entire pack tree) per
[`pack-contract.md`](./pack-contract.md).

---

## 7a. Resumed-from-Save Mode

> Source: Plan 27 § Improvement: MP Load-Resume Protocol.

Two peers may agree to resume a saved match into a fresh
multiplayer session. Resume mode is a strict superset of the
fresh-match handshake — the COMMIT and REVEAL phases are unchanged
— with one extra agreement step before ACCEPT:

1. Both peers load the same save envelope (out-of-band; the
   handshake does not transport the save body).
2. Both peers compute their loaded-from-disk `stateHash` from the
   replayed `commandLog` per
   [`save-migration.md`](./save-migration.md) § Tamper Detection.
3. Each peer attaches `resumedFromSave: { saveId, loadedStateHash }`
   to its REVEAL frame.
4. The receiver compares the opponent's `loadedStateHash` to its
   own; mismatch dispatches
   `ABORT { reason: "RESUME_STATE_HASH_MISMATCH" }`.
5. The receiver also compares the opponent's `contentPackHashes`
   set (from REVEAL's existing `packManifestDigest` and the
   companion `contentPackHashes` if the save adds packs);
   mismatch dispatches
   `ABORT { reason: "RESUME_PACK_HASHES_MISMATCH" }`.

A fresh match (no save) sends `resumedFromSave: null`. The save's
own `mac` (when M5+ enables it) is **not** accepted as
authentication between peers — peers verify their own copy
locally, then prove agreement by exchanging the post-replay
`stateHash`. The resume handshake is independent of the save
envelope's per-installation MAC because each peer re-verifies the
save under its own `deviceKey`.

## 8. Single-player and replay

The handshake is **multiplayer-only**. In single-player and in
replay-from-save, the seed is pinned by save metadata per
[`determinism.md`](./determinism.md) § Seed Source Precedence; the
handshake is skipped because there is no second peer.

In **multiplayer**, the seed is **always** the commit-reveal output.
The host-unilateral path is forbidden in multiplayer; the
`SCENARIO_LOAD` reducer entry under multiplayer accepts only the
handshake-derived seed.
