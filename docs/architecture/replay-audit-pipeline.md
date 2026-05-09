# Replay Audit Pipeline

Canonical contract for the **opt-in, post-match** audit pipeline
that consumes the deterministic replay payload, re-runs the reducer
offline, and surfaces statistical anomalies for human review. Closes
the "no anti-cheat tool that consumes replays" gap.

This file is the **contract**. The hosted ingestion service is a
**Phase-4** follow-up that lives alongside the privacy / retention
and trust-boundaries / logging work. M5 ships:

1. The contract pinned in this file.
2. The opt-in surface in the post-match summary
   ([`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/)).

There is no terminal / CLI surface in M5. The consumer of the
upload payload is the future hosted ingestion service plus its
admin review UI; no human runs the audit by hand from a shell.

Owning task:
[`tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md`](../../tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md).

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`match-handshake.md`](./match-handshake.md),
[`determinism.md`](./determinism.md),
[`privacy.md`](./privacy.md).

---

## 1. Opt-in flow

At end-of-match, the multiplayer game screen post-match summary
shows:

> **Submit replay for analysis?**
> Helps maintainers detect cheats and engine bugs.
> Includes: command log, seed, content hash, engine hash, handshake
> nonces, attributed-peer (if any), match outcome.
> Excludes: chat, display names, IP, anything that identifies you.
> [Submit] [No thanks]

Consent is recorded via the consent UX surface; the
acknowledgement persists locally only. Per-match opt-in is *not*
remembered across matches — the user is asked every time a match
ends.

---

## 2. Upload payload

```jsonc
{
  "schemaVersion": 1,
  "matchId": "<UUID>",
  "matchEpoch": 0,
  "seed":            "<16 hex>",
  "contentHash":     "<16 hex>",
  "engineHash":      "<16 hex>",
  "packManifestDigest":"<16 hex>",
  "bundleSha256":    "<64 hex>",
  "handshakeNonces": { "A": "<64 hex>", "B": "<64 hex>" },
  "commandLog": [
    { /* lockstep envelope (with mac) */ }
  ],
  "matchOutcome": {
    "winner": "<peerHash | 'draw' | 'aborted'>",
    "totalTurns": 42,
    "endedAt": "<ISO 8601>"
  },
  "abortReport": {
    "kind": "DESYNC_DETECTED" | "DISCONNECT_FORFEIT" | "AUTO_END_DAY_LIMIT",
    "attributedPeer": "<peerHash | null>",
    "attributionConfidence": "high" | "low" | "ambiguous"
  }
}
```

Privacy invariants:

- `peerId` is never uploaded raw; it is hashed to 16 chars before
  payload assembly.
- `displayName` is never uploaded.
- IP is never uploaded.
- Chat (per [`chat-safety.md`](./chat-safety.md)) is never
  included; chat lives on a separate DataChannel and never enters
  the canonical command log.

---

## 3. Self-authenticating

Because every envelope in `commandLog` is HMAC-signed with the
per-match `matchKey` derived from `handshakeNonces` per
[`match-handshake.md`](./match-handshake.md), the audit service
can re-verify every envelope MAC offline. A peer who tampers with
the upload either:

- Invalidates a MAC → audit detects it.
- Re-signs the tampered envelope with a newly-derived `matchKey`
  using the same nonces → audit re-derives the same `matchKey`,
  the MAC verifies, but the resulting state hash diverges from
  the canonical replay run by the audit tool, so the tamper is
  caught at the state-hash check.

In short: the upload payload is its own integrity proof. The audit
service does not need to trust the uploader.

---

## 4. Reducer-replay protocol (consumed by the Phase-4 service)

The pipeline below is the reference algorithm the hosted service
runs on every accepted upload. M5 does not ship an
implementation; it ships the contract so the future service has
something to conform to.

1. Load the replay payload; schema-shape check.
2. Re-derive `matchId`, `matchKey`, `seed` from
   `handshakeNonces` per [`match-handshake.md`](./match-handshake.md).
3. Verify every envelope's MAC against `matchKey`.
4. Re-run the deterministic reducer on `commandLog` using `seed`,
   `contentHash`, `engineHash`.
5. Compare every per-turn state hash against the hashes embedded
   in the per-turn-hash payloads (also envelope-signed and present
   in the log).
6. Emit the analysis record: total turns, divergence index (if
   any), per-player RNG luck statistics (initial conservative
   pass: Bernoulli p-value over coin-flip-equivalent decisions),
   and the `attributedPeer` from `abortReport`. Surfaced through
   the admin review queue UI.

---

## 5. Anomaly detection (initial, conservative)

The audit service may run any of the following analyses on uploaded
replays. None of them produce a ban; they all produce a **maintainer
review queue entry**.

| Signal | Test |
| --- | --- |
| Per-player RNG luck | Aggregate Bernoulli p-value across coin-flip-equivalent decisions per player; flag p < 0.001 over ≥ 100 draws. |
| Win rate vs. expected | Flag players whose win-rate against opponents of similar skill exceeds a 99% confidence interval. |
| Abort pattern clustering | Flag peers whose attributed aborts cluster on specific opponents or specific scenario IDs. |
| Visibility-precondition rejection rate | Flag peers whose `COMMAND_REJECTED_PRECONDITION` rate exceeds a baseline (suggests scripted fog-probing). |

All flagged entries enter a maintainer review queue; nothing is
auto-actioned without a human in the loop.

---

## 6. Retention

Per [`privacy.md`](./privacy.md):

- Raw uploaded replay payloads: **30 days** retention.
- Per-player aggregated statistics (no per-match payload): **1
  year** retention.
- Maintainer review queue entries: retained until the maintainer
  resolves them.
- The user may request erasure of their replays via the consent
  surface; erasure is processed within 30 days per
  [`privacy.md`](./privacy.md).

---

## 7. Out of scope (M5)

- The hosted ingestion service. M5 ships the contract + the local
  CLI. The hosted service is a Phase-4 deliverable.
- Real-time anti-cheat. The pipeline is *post-match*; it does not
  affect live match outcomes.
- Cross-pack normalization. Replays from different packs are
  audited per-pack; no cross-pack statistical pooling.

---

## 8. Phase-4 placeholder

`services/audit-pipeline/` is **declared** in this contract but is
not implemented in this plan. When the Phase-4 work-stream lands,
the service will:

- Accept POST uploads matching § 2.
- Run the analyses in § 5 in batch.
- Persist per § 6.
- Surface the maintainer review queue via a separate admin UI.
