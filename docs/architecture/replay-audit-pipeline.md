# Replay Audit Pipeline

Canonical contract for the **opt-in, post-match** audit pipeline.
The hosted service consumes the deterministic replay payload,
re-runs the reducer offline, and surfaces statistical anomalies for
human review. Closes the "no anti-cheat tool that consumes replays"
gap.

This file is the **contract**. The hosted ingestion service is a
**Phase-4** follow-up. M5 ships:

1. The contract pinned in this file.
2. The post-match opt-in prompt on screen
   [`77-multiplayer-game`](./wiki/screens/77-multiplayer-game/)
   (`PostMatchAuditConsentPrompt`), rendered disabled while no
   endpoint is configured.

M5 has **no terminal / CLI surface**. The consumer is the future
hosted service plus its admin review UI.

Owning task:
[`tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md`](../../tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md).

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`match-handshake.md`](./match-handshake.md),
[`bisect-protocol.md`](./bisect-protocol.md),
[`determinism.md`](./determinism.md),
[`privacy.md`](./privacy.md),
[`chat-safety.md`](./chat-safety.md).

---

## 1. Opt-in flow

At end-of-match the post-match summary on screen
[`77-multiplayer-game`](./wiki/screens/77-multiplayer-game/) renders
`PostMatchAuditConsentPrompt`:

> **Submit replay for analysis?**
> Helps maintainers detect cheats and engine bugs.
> Includes: command log, seed, content hash, engine hash, handshake
> nonces, attributed-peer (if any), match outcome.
> Excludes: chat, display names, IP, anything that identifies you.
> [Submit] [No thanks]

- **Accept** → dispatches `SUBMIT_REPLAY_AUDIT` with the § 2 payload.
- **Decline / disabled** → no upload; the prompt is disabled in M5
  builds (no endpoint), per
  [`wiki/screens/77-multiplayer-game/interactions.md`](./wiki/screens/77-multiplayer-game/interactions.md)
  `PostMatchAuditConsentPrompt`.

The consent record (`state.profile.consent.replayAudit.state`,
`unset | granted | denied`) persists locally only.
**Per-match opt-in is not remembered across matches** — the prompt
re-fires at every match end regardless of any prior `granted`.

---

## 2. Upload payload

```jsonc
{
  "schemaVersion": 1,
  "matchId":             "<UUID>",
  "matchEpoch":          0,
  "seed":                "<16 hex>",
  "contentHash":         "<16 hex>",
  "engineHash":          "<16 hex>",
  "packManifestDigest":  "<16 hex>",
  "bundleSha256":        "<64 hex>",
  "handshakeNonces":     { "A": "<64 hex>", "B": "<64 hex>" },
  "commandLog": [
    { /* lockstep envelope (with mac) per lockstep-envelope.md § 1 */ }
  ],
  "matchOutcome": {
    "winner":     "<peerHash | 'draw' | 'aborted'>",
    "totalTurns": 42,
    "endedAt":    "<ISO 8601>"
  },
  "abortReport": {
    "kind":                  "DESYNC_DETECTED" | "DISCONNECT_FORFEIT" | "AUTO_END_DAY_LIMIT",
    "attributedPeer":        "<peerHash | null>",
    "attributionConfidence": "high" | "low" | "ambiguous"
  }
}
```

Privacy invariants (must hold for every upload):

- `peerId` is hashed to a 16-char digest before payload assembly;
  raw `peerId` is never uploaded.
- `displayName` is never uploaded.
- IP is never uploaded.
- Chat is never included. Chat rides a separate DataChannel per
  [`chat-safety.md`](./chat-safety.md) § 2 and never enters the
  canonical command log.

---

## 3. Self-authentication

Every envelope in `commandLog` is HMAC-signed with the per-match
`matchKey` derived from `handshakeNonces` per
[`match-handshake.md` § 4](./match-handshake.md). The audit service
re-verifies every MAC offline. A peer who tampers with the upload
either:

- invalidates a MAC → audit detects it; or
- re-signs the tampered envelope with a `matchKey` re-derived from
  the same nonces → MAC verifies, but the resulting per-turn state
  hashes diverge from the audit-tool's canonical replay run, caught
  at the state-hash check.

The upload is its own integrity proof. The audit service does not
need to trust the uploader.

---

## 4. Reducer-replay protocol

Reference algorithm the future hosted service runs on every accepted
upload. M5 ships only the contract; no implementation.

1. **Schema-shape check** the payload.
2. **Re-derive** `matchId`, `matchKey`, `seed` from
   `handshakeNonces` per
   [`match-handshake.md` § 4](./match-handshake.md).
3. **Verify** every envelope MAC against `matchKey`.
4. **Replay** the deterministic reducer over `commandLog` using
   `seed`, `contentHash`, `engineHash`.
5. **Compare** every per-turn state hash against the hashes
   embedded in the envelope-signed per-turn-hash payloads in the
   log.
6. **Emit** the analysis record: total turns, divergence index (if
   any), per-player RNG luck statistics (initial conservative pass,
   see § 5), and `attributedPeer` from `abortReport`. Surfaced
   through the admin review queue UI.

---

## 5. Anomaly detection (initial, conservative)

Every flagged signal produces a **maintainer review queue entry**;
nothing is auto-actioned without a human in the loop.

| Signal | Test |
| --- | --- |
| Per-player RNG luck | Aggregate Bernoulli p-value across coin-flip-equivalent decisions per player; flag `p < 0.001` over ≥ 100 draws. |
| Win rate vs. expected | Flag players whose win-rate against opponents of similar skill exceeds a 99 % confidence interval. |
| Abort pattern clustering | Flag peers whose attributed aborts cluster on specific opponents or specific scenario IDs. |
| Visibility-precondition rejection rate | Flag peers whose `COMMAND_REJECTED_PRECONDITION` rate exceeds a baseline (suggests scripted fog-probing). |

---

## 6. Retention

Pinned values; the umbrella policy lives in
[`privacy.md`](./privacy.md). The values must mirror into
[`privacy.md`](./privacy.md) § 2 before the hosted service ships.

| Artefact | TTL |
| --- | --- |
| Raw uploaded replay payloads | 30 days |
| Per-player aggregated statistics (no per-match payload) | 1 year |
| Maintainer review queue entries | until resolved |

The user may request erasure of their replays via the consent
surface; erasure is processed within 30 days per
[`privacy.md`](./privacy.md) § 6.

---

## 7. Out of scope (M5)

- **The hosted ingestion service.** M5 ships the contract + the
  on-screen opt-in surface only; the service is a Phase-4
  deliverable.
- **Real-time anti-cheat.** The pipeline is *post-match*; it does
  not affect live match outcomes.
- **Cross-pack normalization.** Replays from different packs are
  audited per-pack; no cross-pack statistical pooling.

---

## 8. Phase-4 placeholder

`services/audit-pipeline/` is **declared** by this contract; M5 does
not implement it. When the Phase-4 work-stream lands, the service
will:

- accept POST uploads matching § 2;
- run the analyses in § 5 in batch;
- persist per § 6;
- surface the maintainer review queue via a separate admin UI.

---

## 🔍 Sync Check

- **UI: ✔** — `PostMatchAuditConsentPrompt`, `SUBMIT_REPLAY_AUDIT` dispatch, the disabled-state copy, and the `state.profile.consent.replayAudit.state` binding match [`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md), [`interactions.md`](./wiki/screens/77-multiplayer-game/interactions.md), and [`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md). Trust-banner gating to friendly / closed-beta lines up with [`security-model.md` § 4](./security-model.md).
- **Schema: ❌** — `consent.schema.json` `ConsentScope` enum is `storage | multiplayer | aiGeneration | telemetry | crashReports | analytics | unsignedPacks` and has **no `replayAudit` value**, but screen 77 and § 1 of this doc bind `state.profile.consent.replayAudit.state`. The upload-payload shape itself is not yet pinned by a JSON schema. See ⚠ Issues.
- **Tasks: ❌** — Owning task [`phase-3.01-multiplayer.17-replay-audit-pipeline-contract`](../../tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md) reads-first this doc and is registered in [`tasks/task-registry.json`](../../tasks/task-registry.json). Cross-references from [`security-model.md`](./security-model.md), [`bisect-protocol.md`](./bisect-protocol.md), [`turn-timer.md`](./turn-timer.md), and [`spectator-mode-requirements.md`](./spectator-mode-requirements.md) all resolve. However, `SUBMIT_REPLAY_AUDIT` is registered in [`screen-command-coverage.json`](./screen-command-coverage.json) (line 140) but is **not** defined in [`command-schema.md`](./command-schema.md). See ⚠ Issues.

## ⚠ Issues

- **`SUBMIT_REPLAY_AUDIT` is not defined in `command-schema.md`.** [`screen-command-coverage.json`](./screen-command-coverage.json) line 140 names task 17 as the owner, [`wiki/screens/77-multiplayer-game/data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md) lists it under "Commands And Events", and the owning task's acceptance criteria pin the dispatch — but [`command-schema.md`](./command-schema.md) carries no entry for it. Per CLAUDE.md root contract ("If the target dispatches commands, verify each one is defined or correctly marked `runtime-only` / `local-ui`"), the gap blocks task 17's `tasks:done` gate. Owner: [`tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md`](../../tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md). Suggested values: command name `SUBMIT_REPLAY_AUDIT`, payload = the § 2 upload object, classification `local-ui` (does not enter the canonical command log; the post-match prompt fires after the match has ended). Skill did not edit `command-schema.md` (Hard Prohibition D — never edit cross-checked files).
- **`replayAudit` is not in the `consent.schema.json` `ConsentScope` enum.** [`consent.schema.json`](../../content-schema/schemas/consent.schema.json) defines `ConsentScope` as a closed enum of seven values (`storage | multiplayer | aiGeneration | telemetry | crashReports | analytics | unsignedPacks`); [`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md) line 64 and [`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md) line 31 both bind to `state.profile.consent.replayAudit.state`. Per CLAUDE.md root contract on schema evolution ("additive-first; alias before remove" per [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md)), the additive change is owned by task 17 (which owns the doctrine that introduced the binding). Suggested values: extend `ConsentScope` with `replayAudit` (`tier: optional`, default `state: unset`), regenerate `enums.snapshot.json`. Skill did not edit `consent.schema.json` (Hard Prohibition D).
- **Missing `data-inventory.md` row for `state.profile.consent.replayAudit`.** § 1 says the consent record persists locally; [`consent.schema.json`](../../content-schema/schemas/consent.schema.json) pins persistence to IndexedDB `hr-profile.consent`. Per the project root contract ("every persisted field is registered in `data-inventory.md`"), the slice needs an inventory row. Owner: task 17. Suggested values: Field=`replay-audit consent`, State path=`state.profile.consent.replayAudit`, Medium=`IndexedDB (hr-profile.consent)`, Sensitivity=`low`, Retention=`until user-deleted`, Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`, Notes=`consent.schema.json (ConsentScope=replayAudit, additive)`. Skill did not edit `data-inventory.md` (Hard Prohibition D).
- **Retention values not yet mirrored into `privacy.md` § 2.** § 6 of this doc pins 30-day raw payload retention and 1-year aggregate-statistics retention; [`privacy.md` § 2](./privacy.md) retention TTL matrix has no rows for "uploaded replay payloads" or "per-player aggregated statistics". The pre-rewrite text said "Per privacy.md:" which read as if those values lived there; rewrote inline so this doc claims canonical authority and [`privacy.md`](./privacy.md) carries the policy umbrella. Per CLAUDE.md privacy contract, the rows must mirror into `privacy.md` § 2 before the Phase-4 service ships, with a matching `policyVersion` bump per [`privacy.md` § 8](./privacy.md). Owner: the Phase-4 audit-service deliverable. Skill did not edit `privacy.md` (Hard Prohibition D).
- **Pre-rewrite § 7 contradicted the preamble.** The original § 7 read "M5 ships the contract + the local CLI" while the preamble (and the owning task's acceptance criterion) read "no terminal / CLI surface in M5." Rewrote § 7 to drop "+ the local CLI" (Option A — meaning preserved against the cross-checked task and screen 77, which agree there is no CLI surface). No further change required.
