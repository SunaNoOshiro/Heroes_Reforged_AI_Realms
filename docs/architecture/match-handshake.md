# Match Handshake

Canonical doctrine for the start-of-match three-phase commit-reveal
handshake. Both peers contribute equal CSPRNG entropy; both peers
freeze the same `(contentHash, engineHash, packManifestDigest,
bundleSha256, signaturePolicy)` tuple; both peers derive `seed`,
`matchId`, and `matchKey` deterministically from the revealed
nonces. This handshake is the **first** message exchange on the
open DataChannel — no in-game `seq = 0` envelope is permitted
before both peers have exchanged `ACCEPT`.

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

Without one, the host picks the seed unilaterally and then knows
every PCG32 sub-stream cursor for the whole match — invisible to
per-turn state-hash detection because both peers agree on the rolls
the host chose. The commit-reveal cycle removes that unilateral
control: each peer commits to its nonce **before** seeing the
other's, so the seed depends on both nonces or none.

The same exchange pins
`(contentHash, engineHash, packManifestDigest, bundleSha256,
signaturePolicy)` so a peer cannot lie about its load-time content
and later claim "we both agreed".

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

If any verification fails, **both** peers emit `ABORT { reason }`
with the matching reason and tear down the channel. The lockstep
transport MUST NOT fall back to a single-peer "default" for any
pinned value — there is no canonical agreement until both peers
explicitly produce the same hash.

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
are normalized to canonical-JSON byte strings before
concatenation, in the order listed.

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
`required-ranked` or `required-friendly`; allowed but not required
when `optional`. The signature scheme MUST be `ed25519` per
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

"A" is the peer whose `peerId` sorts **first** lexicographically;
"B" is the other. This makes `seed`, `matchId`, and `matchKey`
byte-stable regardless of which side called itself host.

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

The peer that detects the violation emits the `ABORT`. The peer
that receives an `ABORT` MUST tear down the DataChannel and
surface the reason to the lobby UI per
[`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/).

---

## 6. Mid-match re-validation

At end-of-turn, alongside the per-turn state-hash exchange (see
[`04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)),
each peer re-sends `packManifestDigest`. A digest that disagrees
with the digest agreed at handshake dispatches a
`MID_MATCH_PACK_SWAP` desync abort. This catches a peer that
hot-swaps a pack mid-match (visuals, AI personality) while keeping
canonical state-hash agreement.

The re-validated digest rides the existing per-turn-hash payload
as an additional field — it does **not** carry its own schema. See
the task above for the payload shape.

---

## 7. Pack manifest digest derivation

```ts
packManifestDigest = xxh64( canonicalJsonBytes( manifest.json ) )
```

Pinned in
[`src/content-runtime/manifest-digest.ts`](../../src/content-runtime/manifest-digest.ts)
(owned by task 10). The canonical-JSON rule is the same as for the
lockstep envelope: sorted keys, no whitespace, integer-only
numerics. Two peers with the same pack always derive the same
digest. The digest is **deterministic over `manifest.json` only**;
asset-tree coverage is provided by `contentHash` per
[`pack-contract.md`](./pack-contract.md).

---

## 7a. Resumed-from-save mode

Two peers may agree to resume a saved match into a fresh
multiplayer session. Resume mode is a strict superset of the
fresh-match handshake — COMMIT and REVEAL phases are unchanged —
with one extra agreement step before ACCEPT:

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
   set (from REVEAL's existing `packManifestDigest` plus the
   companion `contentPackHashes` if the save adds packs); mismatch
   dispatches `ABORT { reason: "RESUME_PACK_HASHES_MISMATCH" }`.

A fresh match (no save) sends `resumedFromSave: null`. The save's
own `mac` (when M5+ enables it) is **not** accepted as
authentication between peers — each peer verifies its own copy
locally under its own `deviceKey`, then proves agreement by
exchanging the post-replay `stateHash`. The resume handshake is
therefore independent of the save envelope's per-installation MAC.

---

## 8. Single-player and replay

The handshake is **multiplayer-only**. In single-player and in
replay-from-save the seed is pinned by save metadata per
[`command-schema.md` § Seed Source Precedence](./command-schema.md#seed-source-precedence);
the handshake is skipped because there is no second peer.

In **multiplayer** the seed is **always** the commit-reveal output.
The host-unilateral path is forbidden in multiplayer; the
`SCENARIO_LOAD` reducer entry under multiplayer accepts only the
handshake-derived seed.

---

## 🔍 Sync Check

- **UI: ✔** — Screen 77 (`wiki/screens/77-multiplayer-game/`) consumes `matchId`, `matchEpoch`, and the handshake schema as documented; [`spec.md`](./wiki/screens/77-multiplayer-game/spec.md) and [`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md) reference [`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json) directly, and the `BUILD_ATTESTATION_MISMATCH` ABORT path lines up with the friendly-mode banner copy in [`build-attestation.md` § 5](./build-attestation.md).
- **Schema: ⚠** — Phase shapes, `signaturePolicy` enum, `packSignature` (ed25519 + keyId + 128-hex sig), and the nine fresh-match abort reasons all match [`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json); `MatchHandshake` row registered in [`schema-matrix.md`](./schema-matrix.md) with `commit`, `reveal`, `accept`, and three `abort-*` example fixtures. § 7a's `resumedFromSave` REVEAL field and the `RESUME_STATE_HASH_MISMATCH` / `RESUME_PACK_HASHES_MISMATCH` ABORT reasons are not yet in the schema; owning task is `phase-3.01-multiplayer.36-resumed-from-save` (planned). See ⚠ Issues.
- **Tasks: ⚠** — Owning task [`10-match-handshake-protocol.md`](../../tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md) reads-first this doc and the schema; [`04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md) reciprocates the mid-match re-validation cross-link; task 36 owns the § 7a additive extensions. Two task-side gaps remain: task 07 does not name `matchEpoch`, and task 36's output-name casing diverges from the existing UPPER_SNAKE_CASE enum. See ⚠ Issues.

## ⚠ Issues

- **Schema does not yet carry the § 7a additive entries.** This doc names the REVEAL field `resumedFromSave: { saveId, loadedStateHash } | null` and two new ABORT reasons `RESUME_STATE_HASH_MISMATCH` / `RESUME_PACK_HASHES_MISMATCH`. [`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json) currently defines only the nine fresh-match reasons (`COMMIT_MISMATCH` … `PROTOCOL_ERROR`) and has no `resumedFromSave` field. Per CLAUDE.md root contract on schema evolution ("additive-first; alias before remove" per [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md)), the additive change is owned by [`tasks/phase-3/01-multiplayer/36-resumed-from-save.md`](../../tasks/phase-3/01-multiplayer/36-resumed-from-save.md), which is `planned` (last touched 2026-05-06). Suggested values: extend `Reveal` with optional `resumedFromSave: { saveId: string (UUID), loadedStateHash: 16-hex } | null`; extend the `Abort.reason` enum with `RESUME_STATE_HASH_MISMATCH` and `RESUME_PACK_HASHES_MISMATCH`; add the three fixtures task 36 already enumerates. Skill did not edit the schema (Hard Prohibition D — the schema is on task 36's `Owned Paths (shared)` block).
- **Task 36 names the new abort reasons in camelCase; the schema enum is UPPER_SNAKE_CASE.** [`36-resumed-from-save.md`](../../tasks/phase-3/01-multiplayer/36-resumed-from-save.md) Outputs / Acceptance lists the new reasons as `resumeStateHashMismatch` and `resumePackHashesMismatch`, but the existing [`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json) `Abort.reason` enum uses UPPER_SNAKE_CASE for every entry (`COMMIT_MISMATCH`, `HANDSHAKE_TIMEOUT`, etc.). This doc's § 7a uses the UPPER_SNAKE_CASE form (consistent with the schema). Per Hard Prohibition A, meaning is preserved here; the fix is to update task 36's spec to UPPER_SNAKE_CASE before implementation lands. Skill did not edit task 36 (Hard Prohibition D).
- **Task 07 does not explicitly own `matchEpoch` increments.** § 4 ("Host migration / reconnect-replay … increments `matchEpoch`") and [`lockstep-envelope.md` § 1](./lockstep-envelope.md) both pin the increment to [`07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md), but task 07's spec covers heartbeat election, signed `HOST_CHANGED` envelopes, and quorum-attested `PEER_DISCONNECTED` — never `matchEpoch` or matchKey re-derivation. Per CLAUDE.md root contract ("every 'owned by …' claim must resolve to a real task ID or module path"), task 07 needs an explicit acceptance bullet such as "On `HOST_CHANGED`, both peers increment `state.net.match.matchEpoch` and re-run the COMMIT/REVEAL/ACCEPT exchange so the next envelope rides under the new `(matchEpoch, matchKey)` pair." Same gap was already surfaced by `lockstep-envelope.md`'s audit. Skill did not edit task 07 (Hard Prohibition D).
- **Anchor fix: `Seed Source Precedence` lives in `command-schema.md`, not `determinism.md`.** The pre-rewrite text cited "`determinism.md` § Seed Source Precedence"; that heading does not exist in [`determinism.md`](./determinism.md), which itself chains through to [`command-schema.md` § Seed Source Precedence](./command-schema.md#seed-source-precedence) (line 465). Rewrote the link inline (Option A — meaning preserved, anchor now resolves). No further change required.
