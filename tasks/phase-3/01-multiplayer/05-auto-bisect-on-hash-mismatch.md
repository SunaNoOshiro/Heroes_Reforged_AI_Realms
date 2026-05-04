# Auto-Bisect on Hash Mismatch

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
When a desync is detected, automatically bisect the command log to find the first command that caused the divergence. Both peers replay from the beginning in parallel, exchanging hashes at midpoints.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

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
