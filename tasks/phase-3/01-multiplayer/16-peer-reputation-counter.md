# Peer Reputation Counter — Signaling Side

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Implement the bounded, in-memory peer-reputation counter on the
signaling server. Counts attributed `MATCH_ABORTED_DESYNC` events
per `(peerHash, ipPrefix)` with a 24-hour TTL; soft-rate-limits a
peer at 5 attributed early-game aborts in 24 hours by rejecting
new `CREATE_ROOM` / `JOIN_ROOM` requests. Plan 26 § System
Improvements / Architecture / Peer reputation.

Read First:
- [`docs/architecture/peer-reputation.md`](../../../docs/architecture/peer-reputation.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/signaling-stateless-invariant.md`](../../../docs/architecture/signaling-stateless-invariant.md)
- [`docs/architecture/bisect-protocol.md`](../../../docs/architecture/bisect-protocol.md)
- [`docs/architecture/signaling-edge-defense.md`](../../../docs/architecture/signaling-edge-defense.md)

Inputs:
- Bisect-attribution feed: post-match `MATCH_ABORTED_DESYNC`
  notifications carrying `attributedPeer` and
  `attributionConfidence`.
- Signaling-server admit gate (`CREATE_ROOM`, `JOIN_ROOM`).

Outputs:
- `docs/architecture/peer-reputation.md` — canonical doctrine.
- `services/signaling/src/reputation/counter.ts` — bounded LRU
  with TTL eviction; pure in-memory; no disk persistence.
- Prometheus metric `signaling_reputation_aborts_total{peer,
  prefix}` exposed on the admin port from
  [`signaling-edge-defense.md`](../../../docs/architecture/signaling-edge-defense.md).
- Updates to
  [Task 01](./01-signaling-server-node-js-websocket-lobby.md):
  add **Peer Reputation** subsection cross-linking Plan 25.

Owned Paths:
- `docs/architecture/peer-reputation.md`
- `services/signaling/src/reputation/`

Dependencies:
- phase-3.01-multiplayer.13-security-model-and-doctrine
- phase-3.01-multiplayer.05-auto-bisect-on-hash-mismatch

Acceptance Criteria:
- Counter increments only when both:
  (a) `MATCH_ABORTED_DESYNC` arrives with
  `attributionConfidence: high`, and
  (b) divergence occurred within the first 3 turns of the match.
- The counter increments on the **opposing peer's** report when
  the offender refuses to self-report (consent-resilient).
- Counter LRU cap is bounded (≤ 100 000 entries); TTL evicts
  inactive entries at 24 hours since `lastSeen`.
- Reaching `AUTO_RATE_LIMIT_THRESHOLD = 5` rejects subsequent
  `CREATE_ROOM` / `JOIN_ROOM` with
  `RATE_LIMITED { kind: 'reputation' }`.
- Existing matches in flight when the threshold trips are
  unaffected.
- The counter file imports zero disk-persistent modules per
  [`signaling-stateless-invariant.md`](../../../docs/architecture/signaling-stateless-invariant.md);
  `npm run validate:signaling-stateless` continues to pass.
- Peer keys are SHA-256 hashed to 16 chars before storage; raw
  `peerId` is never logged. IP is bucketed to `/24` (IPv4) or
  `/64` (IPv6) before storage.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
