# Peer Reputation Counter

Canonical doctrine for the bounded, in-memory reputation counter on
the M5 signaling server. It throttles peers who repeatedly trigger
**early-game**, **bisect-attributed** desync aborts, closing the
"free griefing aborts" gap in
[`security-model.md`](./security-model.md) § 1.

Owning task:
[`tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md).

Companion docs:
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md),
[`bisect-protocol.md`](./bisect-protocol.md),
[`security-model.md`](./security-model.md),
[`signaling-edge-defense.md`](./signaling-edge-defense.md),
[`signaling-message-schema.md`](./signaling-message-schema.md),
[`signaling-audit-log.md`](./signaling-audit-log.md),
[`peer-trust.md`](./peer-trust.md).

---

## 1. The problem

A malicious peer joins, plays 1–2 turns, then deliberately diverges
canonical state. The per-turn hash exchange catches the divergence
and the bisect attributes blame, but the abort itself is **free**:
the offender reconnects and repeats. The opposing peer loses time
on every aborted match.

The per-IP rate limit at the signaling edge
([`signaling-edge-defense.md`](./signaling-edge-defense.md)) is too
coarse for this case — it gates `Upgrade` floods and `CREATE_ROOM`
bursts, not match-level griefing, and is easy to evade by switching
networks. The reputation counter is the per-peer-identity layer
beneath it.

---

## 2. Counter shape

```text
key   = ( sha256(peerId).slice(0, 16) , prefixOf(ip, /24 v4 / /64 v6) )
value = { aborts: integer, firstSeen: epoch, lastSeen: epoch }
```

The counter lives in **process memory** on the signaling server.
Allowed under
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
because every entry is bounded:

- TTL ≤ 24 h since `lastSeen`; idle entries are evicted.
- Total memory bounded by an LRU cap of **100 000** entries.
- No disk persistence; the counter resets on restart (see § 8).
- Keys are **redacted-by-construction**: `peerId` is hashed before
  storage; raw `peerId` is never held. IP is reduced to its `/24`
  v4 / `/64` v6 prefix bucket before storage. The bucket size
  matches the privacy bucket used by
  [`signaling-audit-log.md`](./signaling-audit-log.md) (the audit
  log additionally salts and hashes the prefix; the counter does
  not, since the prefix is itself non-PII at that granularity).

---

## 3. When to increment

The counter increments **only when all four** hold:

1. The match aborted via desync detection per
   [`bisect-protocol.md`](./bisect-protocol.md).
2. The bisect attributed blame with
   `attributionConfidence: "high"`.
3. The blamed peer's `peerId` matches the counter key.
4. Divergence occurred within the **first 3 turns** of the match
   (heuristic for "intentional grief" rather than late-game engine
   bug or honest engine drift).

### 3.1 Notification flow

After the bisect concludes, each peer's lockstep layer posts a
one-shot post-match notification to the signaling server:

```jsonc
{ "type":   "MATCH_ABORTED_DESYNC",
  "matchId": "<UUID>",
  "attributedPeer":         "<UUID>",
  "attributionConfidence":  "high",
  "divergentTurn":          2 }
```

The signaling server cross-references the `attributedPeer` against
the room's known `peerId` set and increments only if the named peer
is a participant of that room. Consent-resilient by design: if the
offender refuses to send the notification, the **opposing peer's**
notification still names them, and the server uses whichever
notification arrives. Disagreement between the two notifications is
resolved in favor of the **non-`attributedPeer`'s** report (the
offender cannot vote themselves innocent).

---

## 4. Soft rate-limit threshold

`AUTO_RATE_LIMIT_THRESHOLD = 5`. Once a counter key reaches 5
attributed early-game aborts within 24 h:

- **`CREATE_ROOM`** is rejected for the remainder of the TTL window
  with `RATE_LIMITED { reason: "reputation" }` (see ⚠ Issues — the
  schema enum still needs that value).
- **`JOIN_ROOM`** is rejected with the same error.
- **Matches in flight** when the threshold trips are **unaffected**;
  the throttle only blocks *new* matches.
- The lobby UI surfaces the localized string: "You have been
  temporarily restricted from creating or joining matches due to
  repeated early-match aborts. Please wait ~24 hours."

After `lastSeen + 24 h` elapses with no new aborts, the entry is
evicted by the TTL sweeper and the peer can play again.

---

## 5. Escalation path

The reputation counter is the **soft** throttle. Hard escalation
(persistent ban) is owned by the signaling-edge blocklist surface
([`signaling-edge-defense.md` § 4](./signaling-edge-defense.md#4-time-bound-blocklist))
and is **not** auto-populated by this counter — a maintainer reviews
the audit log and decides whether to persist.

The counter exposes a Prometheus metric on the admin port:

```
signaling_reputation_aborts_total{peer="<hash>", prefix="<bucket>"} <count>
```

The `peer` label is the same 16-char SHA-256 digest used in § 2;
raw `peerId` is never exposed.

---

## 6. Implementation

```
services/signaling/src/reputation/counter.ts
```

| Concern | Shape |
| --- | --- |
| Backing store | Bounded LRU keyed on `(peerHash, prefix)`. |
| Eviction | TTL = 24 h since `lastSeen`; LRU max = 100 000. |
| Increment | Called from the `MATCH_ABORTED_DESYNC` handler. |
| Query | Called from the `CREATE_ROOM` / `JOIN_ROOM` admit gate. |

The implementation **MUST NOT** import any disk-persistent module per
[`signaling-stateless-invariant.md` § 2](./signaling-stateless-invariant.md#2-forbidden-state).
The in-memory LRU is the only allowed shape. The mechanical gate
`npm run validate:signaling-stateless` enforces this on every CI run.

---

## 7. Privacy

- Counter keys store the 16-char SHA-256 digest of `peerId`; the
  raw value is never held.
- IP is bucketed to `/24` (v4) or `/64` (v6) before storage.
- No match contents, no command logs, no chat are persisted.
- TTL eviction is automatic.
- The counter is invisible to other peers (no public reputation
  surface; see § 8).

---

## 8. Out of scope

- **Cross-restart persistence.** Counter is process-memory only;
  a signaling-server restart resets all counters. By design — it
  caps the worst-case griefing rate at "5 aborts per 24 h per
  active signaling instance" rather than enabling long-tail bans.
- **Cross-deployment federation.** Each signaling instance runs
  its own counter; there is no shared backend. Operators who run
  multiple instances accept that a determined offender can bounce
  between them.
- **Public reputation display.** The counter is invisible to other
  peers; it gates only the offender's own `CREATE_ROOM` /
  `JOIN_ROOM`. There is no "trust badge" or "abort count" surfaced
  to other lobby members. That responsibility lives with the
  per-installation allowlist in
  [`peer-trust.md`](./peer-trust.md).
- **Client-initiated reset.** There is no client→server payload to
  drop a peer's own reputation entry. The 24-h TTL is the only
  expiry mechanism.

---

## 🔍 Sync Check

- **UI: ⚠** — Lobby data contracts in [`wiki/screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md) consume `RATE_LIMITED { tier, retryAfterMs, reason }` per [`signaling-rate-limits.md`](./signaling-rate-limits.md), but the `reason: "reputation"` value this doc relies on is not yet in the closed enum (see ⚠ Issues). The localized restriction string in § 4 is not yet present in any screen package's i18n bindings.
- **Schema: ❌** — `MATCH_ABORTED_DESYNC` (§ 3.1) is **not** in the closed `signaling-message.schema.json` discriminator listed in [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-discriminator); `RATE_LIMITED.reason` enum in [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json) lacks `"reputation"`. Both gaps are CI-blocking. See ⚠ Issues.
- **Tasks: ⚠** — Owning task [`phase-3.01-multiplayer.16-peer-reputation-counter`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md) reads this doc First; deps on `13-security-model-and-doctrine` and `05-auto-bisect-on-hash-mismatch` are reciprocal. [`docs/architecture/INDEX.md`](./INDEX.md) does **not** list this file — see ⚠ Issues.

## ⚠ Issues

- **Undefined signaling payload `MATCH_ABORTED_DESYNC`.** This doc § 3.1 dispatches a `MATCH_ABORTED_DESYNC` notification, but the closed enum in [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-discriminator) and the schema [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json) do not include it. Per [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) the addition is an enum-lifecycle bump; the [`signaling-payload-policy.md`](./signaling-payload-policy.md) allowlist must change in the same commit. The owning task is [`phase-3.01-multiplayer.16-peer-reputation-counter`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md), coordinating with [`phase-3.01-multiplayer.31-signaling-message-schema-and-validation`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md) and the schema/payload-policy tasks. Suggested shape: `{ type: "MATCH_ABORTED_DESYNC", matchId: UUID, attributedPeer: UUID, attributionConfidence: "high"|"low"|"ambiguous", divergentTurn: integer ≥ 0 }`. Skill did not edit the schema or sibling docs (Hard Prohibition D).
- **`RATE_LIMITED { reason: "reputation" }` value missing from schema enum.** This doc § 4 returns a `RATE_LIMITED` with `reason: "reputation"`, but [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json) `RateLimited.reason` enum is `["join_flood", "create_flood", "wrong_code", "global", "per_connection_burst", "prefix_socket_cap"]` — `"reputation"` is absent, and `tier` would also need a fitting value (current enum: `["per_ip", "per_code", "per_connection", "per_prefix", "global"]`). Per [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md), additions are an enum-lifecycle bump. Suggested values: `reason: "reputation"`, `tier: "per_peer_id"` (new) or reuse of `per_ip` if a peer-tier slot is unwanted. Owning task: same as above; coordinate with [`signaling-rate-limits.md`](./signaling-rate-limits.md). Doc was rewritten in place to use `reason`, not `kind` (the schema field is `reason`).
- **`WIPE_LOCAL_DATA scope=session|all` claim removed.** Prior wording said the counter is purged on `WIPE_LOCAL_DATA scope=session|all`. The canonical scopes per [`command-schema.md` lines 573–574](./command-schema.md) and [`tasks/mvp/08-persistence/14-wipe-local-data-handler.md`](../../tasks/mvp/08-persistence/14-wipe-local-data-handler.md) are `"all" | "saves" | "profile" | "chat"` — `"session"` does not exist. Furthermore, the counter is **server-side**; a client `WIPE_LOCAL_DATA` cannot reach process-memory state on the signaling server, since that command never traverses signaling per [`signaling-payload-policy.md`](./signaling-payload-policy.md). The bullet was rewritten as the explicit out-of-scope item in § 8 ("Client-initiated reset"). If a future "drop my reputation" payload is desired, it would need a new signaling-message variant; the owning task would be a follow-on of [`phase-3.01-multiplayer.16-peer-reputation-counter`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md).
- **Internal inconsistency: § 2 key shape vs. § 6 / § 7.** Original § 2 keyed on raw `peerId`; § 6 and § 7 (and the owning task's Acceptance Criteria) say keys hash `peerId` to a 16-char SHA-256 digest before storage. § 2 was rewritten to show the hashed shape. No code change implied; the implementation requirement was already correct in the task spec.
- **Missing `INDEX.md` entry for this doc.** [`docs/architecture/INDEX.md`](./INDEX.md) does not list `peer-reputation.md` under any cluster. The owning task is [`phase-3.01-multiplayer.16-peer-reputation-counter`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md) (which owns this doc); the entry should land in the multiplayer / signaling cluster. Skill did not edit `INDEX.md` (Hard Prohibition D).
