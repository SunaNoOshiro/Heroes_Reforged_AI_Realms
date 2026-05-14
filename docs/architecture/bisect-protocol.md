# Byzantine-Tolerant Bisect Protocol

Canonical doctrine for the binary-search bisect that runs after a
per-turn state-hash mismatch. Closes the assumption-of-honest-peer
gap in
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md):
malicious peers can lie about midpoints, refuse to participate, or
replay an old hash from a different match.

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`match-handshake.md`](./match-handshake.md),
[`replay-audit-pipeline.md`](./replay-audit-pipeline.md),
[`peer-reputation.md`](./peer-reputation.md).

Schemas:
[`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json)
(carrier; `command.kind = "BISECT_MIDPOINT"` is an inner-record
shape pinned in § 2 below — it is **not** a discriminator in
[`command.schema.json`](../../content-schema/schemas/command.schema.json),
which is the in-game-command oneOf).

---

## 1. Threat model

A peer engaged in bisect can:

| Attack | Defense |
| --- | --- |
| Lie about a midpoint hash | Both peers exchange their *own* per-prefix hashes; the offline canonical replay (§ 5) is the tiebreaker. |
| Replay an old midpoint hash from a previous match | Every midpoint rides the [`lockstep-envelope.md`](./lockstep-envelope.md); cross-match replay is rejected by `matchId` + `matchKey`. |
| Refuse to send a midpoint at all | Per-step timeout `BISECT_STEP_TIMEOUT_MS = 10_000`; on miss, fall back to `outcome: "unverifiable"` with the last-good prefix index (§ 4). |
| Send malformed payloads to confuse the state machine | Schema-shape check rejects; the malformed payload counts as a missed step. |

---

## 2. Wire shape — `BISECT_MIDPOINT`

A midpoint rides the lockstep envelope as an inner record with
`kind: "BISECT_MIDPOINT"`. The envelope schema is unchanged
([`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json));
the inner shape is pinned here (canonical example:
[`bisect-midpoint.lockstep-envelope.json`](../../content-schema/examples/lockstep-envelope/bisect-midpoint.lockstep-envelope.json)).

```jsonc
{
  "matchId":    "<UUID>",
  "matchEpoch": 0,
  "seq":        9001,
  "playerId":   "<UUID of sending peer>",
  "turn":       25,
  "command": {
    "kind":         "BISECT_MIDPOINT",
    "prefixIndex":  128,
    "stateHash":    "<16 hex chars>"
  },
  "mac": "<64 hex chars>"
}
```

| Field | Meaning |
| --- | --- |
| `prefixIndex` | Count of canonical commands consumed before the hash was sampled. |
| `stateHash` | Canonical xxh64 of the engine state immediately after applying that prefix. |

Both fields are signed by the envelope MAC; replay or forgery is
rejected before the bisect state machine sees them. The inner
`BISECT_MIDPOINT` shape is **not** part of
[`command.schema.json`](../../content-schema/schemas/command.schema.json)'s
in-game-command oneOf; the lockstep envelope's `command` field is
typed `object` and routes by `kind` per
[`lockstep-envelope.md` § 1](./lockstep-envelope.md#1-wire-shape).

---

## 3. Two-way exchange

For every prefix index in the search, **both** peers send their
*own* midpoint hash:

```text
At prefixIndex K:
  Peer A → Peer B :  BISECT_MIDPOINT { prefixIndex: K, stateHash: H_A_K }
  Peer B → Peer A :  BISECT_MIDPOINT { prefixIndex: K, stateHash: H_B_K }
```

Each peer records both hashes against the prefix. Standard
binary-search step:

- `H_A_K == H_B_K` → divergence is **after** `K`; recurse on
  `[K+1 .. high]`.
- `H_A_K != H_B_K` → divergence is **at or before** `K`; recurse on
  `[low .. K]`.
- Termination: `low == high`; that index is the first command at
  which the peers' canonical states diverged.

Symmetric by construction: neither peer trusts the other's claim
about its own state. The first divergent index is reported even if
one peer later refuses to continue.

---

## 4. Timeout and fallback

If a peer does not send its midpoint hash within
`BISECT_STEP_TIMEOUT_MS = 10_000` of the prior step:

1. The waiting peer emits `LOCKSTEP_BISECT_TIMEOUT` telemetry.
2. The bisect ends with `outcome: "unverifiable"` and the last-good
   prefix index (the largest `K` for which both peers agreed). The
   desync report carries `attributedPeer = <peerId that timed out>`
   and `attributionConfidence: "high"`.
3. Both peers tear down the match.

If both peers time out simultaneously (network partition), the
report carries `attributedPeer: "ambiguous"` and
`attributionConfidence: "low"`. This case is rare and is logged
without ladder consequence.

---

## 5. Blame attribution

Desync report shape (extended additively from the legacy fields per
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)):

```jsonc
{
  "matchId":              "<UUID>",
  "divergentPrefixIndex": 128,
  "divergentCommand":     { /* the command at that index */ },
  "preDivergeHash":       "<16 hex>",
  "peerAHash":            "<16 hex>",
  "peerBHash":            "<16 hex>",
  "canonicalReplayHash":  "<16 hex>",
  "attributedPeer":       "<UUID>",
  "attributionConfidence": "high" | "low" | "ambiguous"
}
```

`canonicalReplayHash` is computed by the future Phase-4 hosted
audit-pipeline service per
[`replay-audit-pipeline.md` § 4](./replay-audit-pipeline.md), which
re-runs the deterministic reducer with the agreed seed, content
hash, engine hash, and command log up to `divergentPrefixIndex`.
M5 ships the contract; the consumer is Phase-4.

Confidence rules:

- `"high"` — exactly one peer's `peerXHash` matches
  `canonicalReplayHash`; the other peer is `attributedPeer`. Also
  set on a single-peer timeout per § 4.
- `"low"` — neither peer's hash matches canonical replay. Indicates
  an engine bug or a coordinated tamper by both peers; the report
  does not name an `attributedPeer`. Surfaced as "Unable to
  attribute divergence; please file a bug report."
- `"ambiguous"` — both peers timed out before the final exchange.
  No `attributedPeer`.

A `"high"` attribution within the first 3 turns feeds the
signaling-side reputation counter per
[`peer-reputation.md`](./peer-reputation.md).

---

## 6. Edge case — divergence at turn 0

If the very first prefix midpoint already diverges (`H_A_0 !=
H_B_0`), the report points to the **handshake** and is reclassified
as `attributionReason: "HANDSHAKE_DRIFT"`. Likely causes:

- A peer's `engineHash` was honestly reported but the local engine
  was patched (build-attestation gap).
- A peer's `packManifestDigest` was honestly reported but a
  different pack was loaded into the runtime (pack-signature gap).
- A peer's seed derivation produced a different value due to
  canonical-JSON serializer drift (cross-environment serializer
  parity test in
  [`runtime-requirements.md` RR-09](./runtime-requirements.md#rr-09-cross-environment-serializer-parity)
  should have caught this).

The report payload includes both `bundleSha256`, both
`packManifestDigest`, and both `engineHash` values for the
maintainer to triage.

---

## 7. CI golden tests

Pinned in
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md):

- **Lying peer** — a peer sends `H_A_K` that does not match its
  actual prefix; the offline replay tiebreaker attributes the
  divergence to that peer; report `attributionConfidence = "high"`.
- **Silent peer** — a peer stops responding mid-bisect; timeout
  fires; report `attributionConfidence = "high"` against the silent
  peer.
- **Both honest, real bug** — a hand-constructed engine bug is
  introduced; both peers' hashes match each other but neither
  matches canonical replay; report
  `attributionConfidence = "low"`.
- **Cross-match replay attempt** — a `BISECT_MIDPOINT` envelope
  from a different match is injected; `matchId` mismatch rejects it
  before the bisect state machine runs.

---

## 8. Out of scope

- **Multi-peer bisect (3+ peers).** M5 is 1v1 lockstep. Any future
  N > 2 scenario needs a quorum-based variant; this doctrine is
  2-peer only.
- **Replay protection beyond `matchId`.** The envelope MAC and
  `matchId` cover replay across matches. Replay within the same
  match by repeating the same prefix index is harmless: the bisect
  state machine accepts the first valid sample per prefix and
  ignores later duplicates.

---

## 🔍 Sync Check

- **UI: ⚠** — Screen [`77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md) and [`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md) consume `attributedPeer`, `attributionConfidence`, `divergentPrefixIndex`, `divergentCommand.kind`, and the `BISECT_*` telemetry families consistently — but the `desyncReport` binding row uses the field name `attributedAbortPeer` while this doc, [`replay-audit-pipeline.md` § 2](./replay-audit-pipeline.md) and that same spec's Mechanics Mapping use `attributedPeer`. See ⚠ Issues.
- **Schema: ✔** — Carrier [`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json) describes the `BISECT_MIDPOINT` inner shape as "pinned in docs/architecture/bisect-protocol.md"; canonical example [`bisect-midpoint.lockstep-envelope.json`](../../content-schema/examples/lockstep-envelope/bisect-midpoint.lockstep-envelope.json) matches § 2 byte-for-byte; row present in [`schema-matrix.md`](./schema-matrix.md) under `LockstepEnvelope`.
- **Tasks: ✔** — Owning task [`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md) reads this doc First; downstream consumers ([`16-peer-reputation-counter.md`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md), [`14-screen-multiplayer-game-status.md`](../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md), [`13-security-model-and-doctrine.md`](../../tasks/phase-3/01-multiplayer/13-security-model-and-doctrine.md)) all reciprocate the link.

## ⚠ Issues

- **Misleading claim corrected in place.** The previous wording said "the inner `command` is a new discriminator added to `command.schema.json`". That is not the case: `command.schema.json` is the in-game-command `oneOf` and does **not** include `BISECT_MIDPOINT`; [`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json) types the `command` field as `object` and explicitly defers the `BISECT_MIDPOINT` shape to this file. Rewrote § 2 (and the new top-of-file schemas block) to reflect reality. No code or schema change implied.
- **Field-name drift in screen-77 `desyncReport` binding.** [`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md) line 62 names the binding field `attributedAbortPeer`, but every other site (this doc § 5, [`replay-audit-pipeline.md` § 2](./replay-audit-pipeline.md), the same spec's Mechanics Mapping line 75, [`peer-reputation.md` § 56-58](./peer-reputation.md)) calls it `attributedPeer`. Per the canonical name in this doc and the audit-pipeline contract, the screen-77 spec row should be retitled to `attributedPeer`. The owning task is [`tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md`](../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md). Suggested values: `attributedPeer: <UUID | "ambiguous" | null>`, `attributionConfidence: "high" | "low" | "ambiguous"`. Skill did not edit the screen file (Hard Prohibition D).
