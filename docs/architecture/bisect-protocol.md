# Byzantine-Tolerant Bisect Protocol

Canonical doctrine for the binary-search bisect that runs after a
per-turn state-hash mismatch. Closes the assumption-of-honest-peer
gap in the original
[`05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md):
malicious peers can lie about midpoints, refuse to participate, or
replay an old hash from a different match.

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`match-handshake.md`](./match-handshake.md).

---

## 1. Threat model for the bisect

A peer engaged in bisect can:

| Attack | Defense |
| --- | --- |
| Lie about a midpoint hash | Both peers exchange their *own* per-prefix hashes; the bisect tool's offline canonical replay is the tiebreaker. |
| Replay an old midpoint hash from a previous match | Every midpoint exchange rides the [`lockstep-envelope.md`](./lockstep-envelope.md); cross-match replay is rejected by `matchId` + `matchKey`. |
| Refuse to send a midpoint at all | Per-step timeout (`BISECT_STEP_TIMEOUT_MS = 10_000`); on miss, fall back to "report unverifiable bisect" with the last-good prefix index. |
| Send malformed payloads to confuse the bisect state machine | Schema-shape check rejects; the malformed payload counts as a missed step. |

---

## 2. Wire shape — `BISECT_MIDPOINT`

The midpoint message rides the lockstep envelope as a special
`command` with `kind: "BISECT_MIDPOINT"`:

```jsonc
{
  "matchId": "<UUID>",
  "matchEpoch": 0,
  "seq":  9001,
  "playerId": "<UUID of sending peer>",
  "turn": 25,
  "command": {
    "kind": "BISECT_MIDPOINT",
    "prefixIndex": 128,
    "stateHash": "<16 hex chars>"
  },
  "mac": "<64 hex chars>"
}
```

`prefixIndex` is the count of canonical commands consumed before the
hash was sampled. `stateHash` is the canonical xxh64 of the engine
state immediately after applying that prefix. Both fields are signed
by the envelope MAC; replaying or forging either is rejected.

The envelope schema is unchanged
([`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json));
the inner `command` is a new discriminator added to
[`command.schema.json`](../../content-schema/schemas/command.schema.json)
per
[`05-...md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md).

---

## 3. Two-way exchange

For every prefix index in the bisect search, **both** peers send
their *own* midpoint hash:

```text
At prefixIndex K:
  Peer A → Peer B :  BISECT_MIDPOINT { prefixIndex: K, stateHash: H_A_K }
  Peer B → Peer A :  BISECT_MIDPOINT { prefixIndex: K, stateHash: H_B_K }
```

Each peer records both hashes against the prefix. The standard
binary-search step is:

- If `H_A_K == H_B_K`: divergence is **after** index K; recurse on
  `[K+1 .. high]`.
- If `H_A_K != H_B_K`: divergence is **at or before** index K;
  recurse on `[low .. K]`.
- Termination: `low == high`; that index is the first command at
  which the peers' canonical states diverged.

This is symmetric: neither peer trusts the other's claim about its
own state. The first divergent index is reported even if one peer
later refuses to continue.

---

## 4. Timeout and fallback

If a peer does not send its midpoint hash within
`BISECT_STEP_TIMEOUT_MS = 10_000` of the prior step:

1. The waiting peer emits `LOCKSTEP_BISECT_TIMEOUT` telemetry.
2. The bisect ends with `outcome: "unverifiable"` and the
   last-good prefix index (the largest `K` for which both peers
   agreed). The desync report carries `attributedPeer = <peerId
   that timed out>` and `attributionConfidence: "high"`.
3. Both peers tear down the match.

If both peers time out simultaneously (network partition), the
report carries `attributedPeer: "ambiguous"` and
`attributionConfidence: "low"`. This case is rare and is logged
without ladder consequence.

---

## 5. Blame attribution

The desync report shape (extended in
[`05-...md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)):

```jsonc
{
  "matchId": "<UUID>",
  "divergentPrefixIndex": 128,
  "divergentCommand": { /* the command at that index */ },
  "preDivergeHash": "<16 hex>",
  "peerAHash": "<16 hex>",
  "peerBHash": "<16 hex>",
  "canonicalReplayHash": "<16 hex>",
  "attributedPeer": "<UUID>",
  "attributionConfidence": "high" | "low" | "ambiguous"
}
```

`canonicalReplayHash` is computed by the future Phase-4 hosted
audit-pipeline service per
[`replay-audit-pipeline.md`](./replay-audit-pipeline.md) § 4,
re-running the deterministic reducer with the agreed seed, content
hash, engine hash, and command log up to `divergentPrefixIndex`.
M5 ships the contract; the consumer is Phase-4.

Confidence rules:

- `"high"`: exactly one peer's `peerXHash` matches
  `canonicalReplayHash`. The other peer is `attributedPeer`.
- `"low"`: neither peer's hash matches canonical replay. This
  indicates a bug in the engine or a coordinated tamper by both
  peers; the report does not name a `attributedPeer`. Surfaced as
  "Unable to attribute divergence; please file a bug report."
- `"ambiguous"`: both peers timed out before final exchange. No
  `attributedPeer`.

---

## 6. Edge case — divergence at turn 0

If the very first prefix midpoint already diverges (`H_A_0 !=
H_B_0`), the report points to the **handshake** and is reclassified
as `attributionReason: "HANDSHAKE_DRIFT"`. Likely causes:

- A peer's `engineHash` was honestly reported but the local engine
  was patched (build-attestation gap).
- A peer's `packManifestDigest` was honestly reported but a different
  pack was loaded into the runtime (pack-signature gap).
- A peer's seed derivation produced a different value due to
  canonical-JSON serializer drift (cross-environment serializer
  parity test in [`runtime-requirements.md`](./runtime-requirements.md)
  RR-09 should have caught this).

The report payload includes both `bundleSha256` values, both
`packManifestDigest` values, and both `engineHash` values for the
maintainer to triage.

---

## 7. CI golden tests

Pinned in
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md):

- **Lying peer**: a peer sends `H_A_K` that does not match its
  actual prefix; the offline replay tiebreaker attributes the
  divergence to that peer; report `attributionConfidence = "high"`.
- **Silent peer**: a peer stops responding mid-bisect; timeout
  fires; report `attributionConfidence = "high"` against the
  silent peer.
- **Both honest, real bug**: a hand-constructed engine bug is
  introduced; both peers' hashes match each other but neither
  matches canonical replay; report
  `attributionConfidence = "low"`.
- **Cross-match replay attempt**: a `BISECT_MIDPOINT` envelope from
  a different match is injected; `matchId` mismatch rejects it
  before the bisect state machine runs.

---

## 8. Out of scope

- **Multi-peer bisect** (3+ peers). M5 is 1v1 lockstep. Future
  scenarios with N > 2 peers need a quorum-based variant of this
  protocol; this doctrine is 2-peer only.
- **Replay protection beyond `matchId`.** The envelope MAC and
  `matchId` cover replay across matches. Replay within the same
  match by repeating the same prefix index is harmless: the
  bisect state machine accepts the first valid sample per
  prefix and ignores later duplicates.
