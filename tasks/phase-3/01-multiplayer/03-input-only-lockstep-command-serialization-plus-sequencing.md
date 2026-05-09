# Input-Only Lockstep — Command Serialization + Sequencing

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Only Commands travel over the network — never state. Each command includes a sequence number. Both peers apply commands in the same sequence number order. Out-of-order commands are queued until their turn.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/command-stream-integrity.md`](../../../docs/architecture/command-stream-integrity.md)
- [`docs/architecture/lockstep-envelope.md`](../../../docs/architecture/lockstep-envelope.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/turn-timer.md`](../../../docs/architecture/turn-timer.md)

Inputs:
- Command dispatcher (`01-engine-core.md` Task 6)
- Peer connection (Task 2)

Outputs:
- `src/net/webrtc/lockstep.ts`
- `src/net/webrtc/constants.ts` (shared budget + queue-cap constants)
- `LockstepTransport`: wraps `PeerConn`, handles command sequencing
- Wire format: `{ schemaVersion, seq, playerId, turn, command, mac }` per
  [`command-envelope.schema.json`](../../../content-schema/schemas/command-envelope.schema.json).
  The `mac` is the truncated HMAC-SHA256 keyed by the per-session
  key derived from `RTCDtlsTransport.exportKeyingMaterial("hr-cmd-mac", 32)`
  (or the host-minted fallback per
  [`command-stream-integrity.md` § 2a](../../../docs/architecture/command-stream-integrity.md#2a-fallback-key)).
  Sign / verify primitives are owned by
  [Task 30](./30-command-stream-hmac.md). Duplicate-`seq` policy
  per
  [`command-stream-integrity.md` § 4](../../../docs/architecture/command-stream-integrity.md#4-duplicate-seq-policy);
  gap-`seq` policy per
  [`command-stream-integrity.md` § 5](../../../docs/architecture/command-stream-integrity.md#5-gap-seq-policy).
- Both peers must apply turn N's commands before processing turn N+1
- Turn gate: local player presses "End Turn" in the UI, which sends
  canonical `END_DAY` through the command log, then waits for all peers
  to send their same-turn commands before advancing

Owned Paths:
- `src/net/webrtc/lockstep.ts`
- `src/net/webrtc/constants.ts`

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup
- phase-3.01-multiplayer.09-lockstep-envelope-and-mac

### Cross-cutting additions

#### Sequence Validation
- Drop on `seq <= lastApplied[playerId]` (stale).
- Reject duplicate `(playerId, matchEpoch, seq)` after delivery.
- Buffer `seq > lastApplied + 1` until contiguous; reject with
  `LOCKSTEP_SEQ_GAP` once gap exceeds `MAX_OUT_OF_ORDER = 64`.
- Reject any `seq` whose `turn` differs from the receiver's known
  `(turn, matchEpoch)` window.

#### Canonical Intra-Turn Order
- All envelopes for the same `turn` are sorted by
  `(turn ascending, playerId lexicographic ascending, seq ascending)`
  — stable sort — and the reducer applies them in that order
  regardless of arrival order. This rule is part of the determinism
  contract; the per-turn state-hash check operates on canonical
  order, not arrival order.

#### Wire-Shape Note
- Wire shape moves from the legacy `command-envelope.schema.json`
  to the M5 lockstep envelope
  [`lockstep-envelope.schema.json`](../../../content-schema/schemas/lockstep-envelope.schema.json)
  per [Task 09](./09-lockstep-envelope-and-mac.md). The envelope
  adds the match identifier and the match-epoch counter and uses a
  full 32-byte HMAC-SHA-256 keyed by the per-match key. The MAC
  verify is the only entry point into the lockstep reducer queue
  per
  [`lockstep-envelope.md`](../../../docs/architecture/lockstep-envelope.md)
  § 7.

#### Turn Timer & Stall Detection
- A connected-but-idle peer escalates `WAITING → STALLED → AUTO_END_DAY`
  per [`turn-timer.md`](../../../docs/architecture/turn-timer.md);
  the auto-`END_DAY { source: 'auto-timeout' }` envelope is
  canonical and rides this task's transport pipeline. Owning task:
  [Task 11](./11-turn-timer-and-stall-detection.md).

Acceptance Criteria:
- 100 commands sent and received in sequence with no drops (on good connection)
- Out-of-order delivery (simulate by artificial delay) is handled correctly
- Same command applied at same position → same state on both peers (fuzz test variant)

Idempotency:
- `(playerId, seq)` is the canonical command key (see
  [`docs/architecture/determinism.md` § Canonical Command Key](../../../docs/architecture/determinism.md#canonical-command-key)).
- Lockstep transport keeps a `Set<string>` of seen `${playerId}:${seq}`
  keys; on `RECEIVE_COMMAND`, drop and increment
  `dup_command_dropped_total` if the key is present.
- Acceptance: replay a 1000-command match, then re-feed the last 200
  commands; reducer state is bit-identical and the dup counter equals 200.

Input-Delay Budget:
- Soft budget: 2 s per command (UI status indicator goes yellow above
  this).
- Hard budget: 10 s (UI overlay).
- Forfeit-or-wait: 120 s (cross-link
  [`06-reconnection-log-range-request-plus-replay.md`](./06-reconnection-log-range-request-plus-replay.md)).
- Constants live in `src/net/webrtc/constants.ts` as
  `INPUT_DELAY_BUDGETS = { softMs: 2000, hardMs: 10000, forfeitMs: 120000 }`.
  Cross-referenced by Task 8 (status indicator) and Task 11
  (chaos test plan).

Pending-Queue Cap:
- Per-peer pending (out-of-order, not yet contiguous) command queue is
  capped at 256: `LOCKSTEP_PENDING_MAX = 256` in
  `src/net/webrtc/constants.ts`.
- On overflow, drop the new command and emit `STALLED_PEER`. UI
  surfaces the same overlay as the 30 s wait threshold.
- Acceptance: synthetic test withholds `seq=10` and floods
  `seq=11..400`; the receiving peer reports stalled by `seq=266`.

Bot Commands:
- Bots run on every peer with deterministic sub-streams
  (`botRngStreamId = hash(matchSeed, botId)`) per
  [`docs/architecture/determinism.md` § Bot RNG Sub-Streams](../../../docs/architecture/determinism.md#bot-rng-sub-streams).
- The lockstep transport accepts only the elected broadcaster's bot
  commands; broadcaster election reuses the peer-priority order from
  Task 7 (host migration). Non-broadcasters compute and verify
  locally but do not transmit.
- Acceptance: 1v1+1bot match on two peers; both peers replay
  bit-identical state over 200 turns.

Network-Chaos Coverage:
- Per-PR module-level chaos: this task must pass the **lockstep
  under loss + jitter** scenario in
  [`12-network-chaos-harness.md`](./12-network-chaos-harness.md).
  The chaos harness owns NetSim and the scenario file; this task
  consumes them. The acceptance bar is bit-identical reducer state
  across both peers under the named adversarial conditions.
- Nightly stack-level chaos: this task is also exercised by the
  consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
