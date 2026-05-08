# Snapshot + Rebase

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement the snapshot-and-rebase policy that bounds command-log
length, save size, and load latency. Every K turns (or every M
commands), capture a verified canonical state snapshot. On the next
save, drop commands prior to the latest snapshot and persist
`(snapshot, log_since_snapshot)` instead of `(seed, full_log)`. The
seed remains in metadata for archival.

Read First:
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](./02-log-only-save-format.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/diagrams/25-load-flow.md`](../../../docs/architecture/diagrams/25-load-flow.md)

Inputs:
- `SaveRecord` + `Checkpoint` from `02-log-only-save-format.md`
- State serializer + xxh64 hash from
  `mvp.01-engine-core.07-state-serializer-plus-xxh64-hash`
- Replay API from `mvp.01-engine-core.08-replay-api`

Outputs:
- `src/persistence/snapshot.ts`
- `captureSnapshot(state, logIndex): Checkpoint` — canonical-JSON
  serializes the live `GameState`, hashes it, and returns the new
  `Checkpoint { logIndex, stateHash, snapshot }`.
- `rebaseLog(record): SaveRecord` — drops commands prior to the
  latest verified snapshot in `record.checkpoints` and returns a
  rebased `SaveRecord`. The seed and metadata are preserved.
- `shouldRebase(record): boolean` — returns true when
  `turnsSinceLastSnapshot >= 50` OR
  `commandsSinceLastSnapshot >= 5000` OR the projected compressed
  size exceeds 1 MB.

Owned Paths:
- `src/persistence/snapshot.ts`

## Cadence

A snapshot is captured when **either** trigger fires:

- **K = 50 turns** since the last snapshot (or since seed).
- **M = 5 000 commands** since the last snapshot (or since seed).

Whichever fires first. The cadence is adjustable in the ruleset for
fixtures and CI but defaults to (50, 5000) at runtime.

## Rebase Semantics

After a snapshot is captured at `logIndex = N`:

```
rebased.commandLog       = original.commandLog.slice(N)
rebased.checkpoints      = [..., { logIndex: N, stateHash, snapshot }]
rebased.seed             = original.seed                 // preserved
rebased.contentPackHashes = original.contentPackHashes   // preserved
rebased.turnNumber       = original.turnNumber           // preserved
```

Replay on load starts from the latest snapshot if present, falling
through to seed only if no snapshot is available. The contract:

> Replay from `(snapshot, log_since_snapshot)` is **bit-identical**
> to replay from `(seed, full_log)` for any verified snapshot.

The determinism CI gate
([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
asserts this equivalence.

## 1 MB Compressed Cap

The total compressed save artifact is capped at **1 MB**. The cap is
enforced before write:

1. Compute the canonical-JSON + gzip size.
2. If `> 1 MB`, force a rebase (drop everything before the latest
   snapshot and re-measure).
3. If still `> 1 MB` after rebase, surface a localized "save too
   large — start a new chapter?" dialog instead of writing the
   oversized blob silently.

`06-autosave.md` calls `shouldRebase(record)` and `rebaseLog(record)`
before writing so autosave never breaches the cap.

Dependencies:
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.08-replay-api
- mvp.08-persistence.02-log-only-save-format

Acceptance Criteria:
- `captureSnapshot(state, logIndex)` returns a `Checkpoint` whose
  `stateHash` matches the canonical state-hash of `state`.
- `rebaseLog(record)` produces a `SaveRecord` whose replay yields
  the same final `stateHash` as replay of the unrebased record.
- A determinism test asserts: for the fuzz-harness fixtures, replay
  from `(snapshot, log_since_snapshot)` produces the same
  `stateHash` at every checkpoint as replay from `(seed, full_log)`.
- `shouldRebase(record)` returns true once the K-turn or M-command
  threshold is crossed; false otherwise.
- A save that would exceed 1 MB compressed triggers the cap path
  (rebase, then dialog if still over) and never writes silently.
- The Load flow consults the latest verified snapshot before falling
  back to seed (see
  [`docs/architecture/diagrams/25-load-flow.md`](../../../docs/architecture/diagrams/25-load-flow.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
