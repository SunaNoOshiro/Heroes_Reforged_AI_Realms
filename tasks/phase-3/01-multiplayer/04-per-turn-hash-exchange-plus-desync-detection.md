# Per-Turn Hash Exchange + Desync Detection

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
At the end of every turn, both peers exchange their state hash. If
hashes match, proceed. If they mismatch, the game is desynced.
Recovery flow:

1. **Snapshot-resync first** ([Task 9](./09-snapshot-resync-fallback.md))
   — both peers walk the in-memory snapshot ring and restore the
   newest snapshot whose hash agrees on both sides.
2. **Bisect on no agreement** ([Task 5](./05-auto-bisect-on-hash-mismatch.md))
   — if no snapshot agrees, fall through to the existing
   bisect-and-quit path.
3. **Report + quit** — if bisect cannot recover, present the player
   with the desync report.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- State hash (`01-engine-core.md` Task 7)
- Lockstep transport (Task 3)

Outputs:
- `src/net/webrtc/sync-check.ts`
- `exchangeHashes(transport, localHash): Promise<SyncResult>`
- `SyncResult`: `"in_sync" | "desynced"`
- On desync: emit `DESYNC_DETECTED` event with both hashes + turn number for debugging

Owned Paths:
- `src/net/webrtc/sync-check.ts`

Dependencies:
- phase-3.01-multiplayer.03-input-only-lockstep-command-serialization-plus-sequencing

Acceptance Criteria:
- In-sync peers successfully complete 100 turns without desync detection false positives
- Artificial desync (manually corrupt one peer's state) is detected within 1 turn
- Desync report includes: turn number, both hashes, last 10 commands (for bug report)
- On `DESYNC_DETECTED`, the recovery state machine first delegates
  to snapshot-resync (Task 9); only on `SNAPSHOT_DISAGREE` for every
  ring entry does it fall through to bisect (Task 5).

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
