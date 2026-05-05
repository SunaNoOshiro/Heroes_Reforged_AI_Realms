# Peer Reputation Counter (Plan 26 — Improvement)

> Source plan:
> [`docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md`](../implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md)
> § System Improvements / Architecture / Peer reputation.

Canonical doctrine for the bounded, in-memory reputation counter
that throttles peers who repeatedly trigger early-game desync aborts
with attributed blame. Closes the "free griefing aborts" gap from
audit Q521.

Owning task:
[`tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md`](../../tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md).

Companion docs:
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md),
[`bisect-protocol.md`](./bisect-protocol.md),
[`security-model.md`](./security-model.md).

---

## 1. The problem

A malicious peer joins a match, plays 1–2 turns, then deliberately
diverges canonical state. The state-hash exchange catches the
divergence and the bisect tool attributes blame, but the abort is
**free**: the offender simply joins another match and repeats. The
opponent loses time on every aborted match.

Without a reputation counter, the only consequence is the per-IP
rate limit from Plan 25 — which is much coarser than per-peer
identity and easy to evade by reconnecting from a different
network.

---

## 2. Counter shape

```text
key   = ( peerId , prefixOf( ip , /24 IPv4 / /64 IPv6 ) )
value = { aborts: integer, firstSeen: epoch, lastSeen: epoch }
```

The counter lives in **process memory** on the signaling server.
Allowed under
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
because:

- TTL is bounded (≤ 24 h per inactive entry).
- Total memory is bounded (LRU cap of 100 000 entries).
- No disk persistence; counter resets on restart.
- Keyed on `peerId` + IP-prefix bucket (not raw IP), matching the
  privacy bucket used for TLS observability.

---

## 3. When to increment

The counter increments **only** when:

1. The match aborted via `DESYNC_DETECTED` (per
   [`bisect-protocol.md`](./bisect-protocol.md)).
2. The bisect attributed blame with `attributionConfidence = "high"`.
3. The blamed peer's `peerId` matches the counter key.
4. The divergence occurred within the **first 3 turns** of the match
   (heuristic for "intentional grief" rather than "late-game engine
   bug" or "honest engine drift").

The peer reports its own attributed-abort to the signaling server
via a one-shot post-match notification:

```jsonc
{ "kind": "MATCH_ABORTED_DESYNC", "matchId": "<UUID>",
  "attributionConfidence": "high", "divergentTurn": 2 }
```

The signaling server cross-references the notification against the
peer's `peerId` (already known from the room session) and increments
the counter only if the peer's own report names them as the
`attributedPeer`. This is consent-based: the offender effectively
flags themselves. Because the offender controls their own client,
they could refuse to send the notification — which is fine; the
opposing peer will also send a `MATCH_ABORTED_DESYNC` notification
naming the offender, and the signaling server uses the **opposing
peer's** notification when it disagrees with the offender's.

---

## 4. Soft rate-limit threshold

`AUTO_RATE_LIMIT_THRESHOLD = 5`. Once a counter key reaches 5
attributed aborts within 24 hours:

- **CREATE_ROOM** is rejected for the remainder of the TTL window
  with `RATE_LIMITED { kind: 'reputation' }`.
- **JOIN_ROOM** is rejected with the same error.
- **Existing matches in flight** are unaffected. The throttle only
  prevents *new* matches.
- The lobby UI surfaces "You have been temporarily restricted from
  creating or joining matches due to repeated early-match aborts.
  Please wait ~24 hours."

After the entry's `lastSeen + 24h` elapses with no new aborts, the
key is evicted by the TTL sweeper and the peer can play again.

---

## 5. Escalation path

The reputation counter is the **soft** throttle. Hard escalation
(persistent ban) is owned by Plan 25's blocklist surface
([`signaling-edge-defense.md`](./signaling-edge-defense.md)) and
is **not** populated automatically by this counter — a maintainer
reviews the audit log and decides whether to persist.

The counter exposes a Prometheus metric on the admin port:

```
signaling_reputation_aborts_total{peer="<hash>", prefix="<bucket>"} <count>
```

The `peer` label is the SHA-256 hash of the `peerId` truncated to 16
chars; raw `peerId` is never exposed.

---

## 6. Implementation

```
services/signaling/src/reputation/counter.ts
```

- Backing store: a bounded LRU keyed on `(peerHash, prefix)`.
- Eviction: TTL = 24 h since `lastSeen`; LRU max = 100 000 entries.
- Increment: called from the match-abort notification handler.
- Query: called from the `CREATE_ROOM` / `JOIN_ROOM` admit gate.

The implementation MUST NOT import any disk-persistent module
(per [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md));
the in-memory LRU is the only allowed shape.

---

## 7. Privacy

- Counter keys hash `peerId` to a 16-char digest before storage.
- IP is bucketed to `/24` (IPv4) or `/64` (IPv6) before storage.
- No match contents, no command logs, no chat are persisted.
- TTL eviction is automatic.
- The counter is purged on `WIPE_LOCAL_DATA scope=session|all`
  for the local peer's own keys (best effort; the signaling
  server may have already evicted them).

---

## 8. Out of scope

- **Cross-restart persistence.** Counter is process-memory only;
  a signaling-server restart resets all counters. This is by
  design — it limits the worst-case griefing rate to "5 aborts
  per 24 h per active signaling instance" rather than enabling
  long-tail bans.
- **Cross-deployment federation.** Each signaling instance runs
  its own counter; there is no shared backend. Operators who run
  multiple instances accept that a determined offender can
  bounce between them.
- **Public reputation display.** The counter is invisible to
  other peers; it only gates the offender's own ability to
  CREATE_ROOM / JOIN_ROOM. There is no "trust badge" or "abort
  count" surfaced to other lobby members. That responsibility
  lives with the per-installation `peer-trust.md` allowlist.
