# Auto-Bisect on Hash Mismatch

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
When a desync is detected, automatically bisect the command log to find the first command that caused the divergence. Both peers replay from the beginning in parallel, exchanging hashes at midpoints.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/bisect-protocol.md`](../../../docs/architecture/bisect-protocol.md)
- [`docs/architecture/lockstep-envelope.md`](../../../docs/architecture/lockstep-envelope.md)
- [`docs/architecture/peer-reputation.md`](../../../docs/architecture/peer-reputation.md)

### Plan 26 cross-cutting additions

#### Byzantine Handling (Improvement / Bisect Protocol)
- Every midpoint hash rides a lockstep envelope with the inner
  command kind reserved for bisect midpoints per
  [`bisect-protocol.md`](../../../docs/architecture/bisect-protocol.md);
  cross-match replay rejected by match-identifier and match-key.
- Both peers exchange their *own* per-prefix hash at every midpoint
  so the report can attribute divergence rather than trust one
  peer's claim about the other.
- Per-step timeout 10 seconds; on miss, fallback to an
  unverifiable-bisect outcome with the last-good prefix index and
  the attributed peer pointing at the peer that timed out.

#### Blame Attribution (Improvement / Blame Attribution)
- Bisect emits an extended report carrying both peers' per-prefix
  hashes and the offline canonical-replay hash; the report shape
  extends the legacy fields additively.
- The canonical replay hash is computed by the future Phase-4
  hosted audit-pipeline service per
  [`replay-audit-pipeline.md`](../../../docs/architecture/replay-audit-pipeline.md)
  § 4; M5 ships the contract, not a terminal CLI.
- Attribution confidence is `high` when only one peer's hash matches
  canonical; `low` when neither matches; `ambiguous` on simultaneous
  timeout.
- The attributed peer feeds the signaling-side reputation counter
  per [Task 16](./16-peer-reputation-counter.md) when divergence
  occurs within the first 3 turns and confidence is high.

Inputs:
- Task 4, Replay API (`01-engine-core.md` Task 8)
- Full command log (synchronized via signaling)

Outputs:
- `src/net/webrtc/bisect.ts`
- `bisectDesync(log: Command[], expected: bigint): number` — returns index of first diverging command
- Binary search: check midpoint hash; recurse into the half with mismatch
- Report: `{ commandIndex, command, preMismatchHash, postMismatchHash }`

Owned Paths:
- `src/net/webrtc/bisect.ts`

Dependencies:
- phase-3.01-multiplayer.03-input-only-lockstep-command-serialization-plus-sequencing
- phase-3.01-multiplayer.04-per-turn-hash-exchange-plus-desync-detection

Acceptance Criteria:
- Given a log with a known-bad command at index 47: bisect finds index 47 in ≤ log₂(N) steps
- Bisect completes in < 10 seconds for a 1000-command log
- Output report is human-readable and suitable for filing a determinism bug
- Bisect runs only after [Task 9 snapshot-resync](./09-snapshot-resync-fallback.md)
  emits `SNAPSHOT_DISAGREE` for every entry in the snapshot ring;
  see [`04-per-turn-hash-exchange-plus-desync-detection.md`](./04-per-turn-hash-exchange-plus-desync-detection.md)
  for the full recovery state machine.

Network-Chaos Coverage:
- Per-PR module-level chaos: this task must pass the **bisect under
  reorder** scenario in
  [`12-network-chaos-harness.md`](./12-network-chaos-harness.md).
  Acceptance: bisect correctly identifies the first diverging
  command index even when message ordering inside the NetSim
  reorder window varies run-to-run.
- Nightly stack-level chaos: also exercised by the consolidated
  network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
