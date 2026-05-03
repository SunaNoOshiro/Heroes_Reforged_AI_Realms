# Snapshot-Resync Fallback

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Periodic canonical state snapshots keyed by command-log offset.
On `DESYNC_DETECTED` (Task 4), both peers attempt to roll back to
the latest snapshot whose hash agrees on both sides; only if no
agreeing snapshot exists do we fall through to bisect (Task 5) and
the report-and-quit path. Replaces the unsourced "Resync from last
good state" note in
[`docs/architecture/diagrams/26-multiplayer-sync.md`](../../../docs/architecture/diagrams/26-multiplayer-sync.md)
with an actual implementing task.

Read First:
- [`docs/architecture/determinism.md` § Snapshot Cadence and Resync](../../../docs/architecture/determinism.md#snapshot-cadence-and-resync)
- [`docs/architecture/diagrams/26-multiplayer-sync.md`](../../../docs/architecture/diagrams/26-multiplayer-sync.md)

Inputs:
- Per-turn state hash (Task 4)
- Canonical serializer + state hash (`01-engine-core.md` Task 7)
- Lockstep transport (Task 3) — re-applies commands from
  `seqOffset+1` after restore

Outputs:
- `src/net/webrtc/snapshot.ts`
- `SnapshotRing`: bounded ring of the last 5 canonical state
  snapshots, taken every 20 turns (configurable per match via the
  scenario record).
- Snapshot artifact:
  `{ seqOffset, turn, contentHash, engineHash, canonicalState, stateHash }`.
- Exchange messages:
  - `SNAPSHOT_TAKEN { entries: [(seqOffset, stateHash), ...] }`
  - `SNAPSHOT_AGREE { seqOffset }`
  - `SNAPSHOT_DISAGREE` (sentinel — used to fall through to bisect)
- Restore flow: replace local `state` with `canonicalState`, drain
  the lockstep pending queue from `seqOffset + 1`, resume normal
  per-turn hash exchange.

Owned Paths:
- `src/net/webrtc/snapshot.ts`

Owned Paths (shared):
- `src/net/webrtc/sync-check.ts` — Task 4 owns; this task hooks the
  snapshot-first recovery branch into the desync state machine.

Dependencies:
- phase-3.01-multiplayer.04-per-turn-hash-exchange-plus-desync-detection

Acceptance Criteria:
- Inject a one-formula divergence at turn 30 in a recorded match;
  both peers detect at turn 31, walk the ring, find the turn-20
  snapshot (`seqOffset` agrees), restore, and finish the match
  successfully with bit-identical final state on both sides.
- If snapshot ring entries diverge for every offset (e.g., divergence
  predates turn 0), recovery falls through to bisect (Task 5) within
  one extra turn.
- Snapshots pin `contentHash` and `engineHash`; restoring across a
  pack or engine upgrade fails loudly the same way save-load does.
- Snapshot ring is in-memory only; saves persist the full state, not
  the ring.
- Shared-ownership contract for `src/net/webrtc/sync-check.ts`:
  Task 4 is the **primary owner** of the desync state machine and
  the per-turn hash exchange wire format; this task's edits are
  **additive** — they insert the snapshot-resync branch at the head
  of the recovery ladder. **Do not rewrite** Task 4's hash exchange,
  `DESYNC_DETECTED` emission, or report-and-quit fallback; only the
  recovery dispatch in `sync-check.ts` is touched.

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md))
  — the determinism-injection cells exercise snapshot-resync first
  recovery.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
