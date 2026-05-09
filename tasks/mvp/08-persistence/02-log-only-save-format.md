# Log-Only Save Format

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement the log-only save format. A save file contains only the metadata and command log — no game state. Loading a save replays all commands from the seed (or the latest verified snapshot) to reconstruct state. This means saves are typically < 50KB for a 7-day game and supports replay from any turn.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md)
- [`docs/architecture/replay-format.md`](../../../docs/architecture/replay-format.md)

Inputs:
- Replay API (`01-engine-core.md` Task 8)
- Command log from `AdventureState`

Outputs:
- `src/persistence/save-format.ts`

Owned Paths:
- `src/persistence/save-format.ts`

Save record format:
```typescript
type SaveRecord = {
  saveVersion: 1,           // first member of the migration chain
  intent: "save" | "replay",
  id: string,               // UUID
  name: string,             // user-provided name (stripped on replay projection)
  createdAt: number,        // timestamp
  savedAt: number,
  seed: bigint,
  rulesetId: string,
  contentPackHashes: string[],   // xxh64 hashes of loaded content packs
  turnNumber: number,
  localeAtSave: string,          // active locale at save time (e.g. "en-US"). Display only; load does not warn on mismatch.
  commandLog: Command[],         // tail since last verified snapshot
  checkpoints: Checkpoint[],     // optional: log index + hash + snapshot
  stateHash: string,             // post-replay xxh64 of canonical state
  canonicalContentHash: string,  // see "Canonical content hash" below
  mp?: {                         // optional MP block, host-written only
    matchId: string,
    participants: string[],
    hostPlayerId: string,
  },
}

type Checkpoint = {
  logIndex: number,
  stateHash: string,
  snapshot?: SerializedState,    // canonical-JSON serialized GameState
}
```

Why this is risky: The save is useless if the replay produces a different state than what the player saved. The `contentPackHashes` guard prevents loading a save with modified content packs that would produce different results.

## Compression Contract

The save artifact is gzipped before it reaches IndexedDB or the
exported `*.hrsa.json` file. The library and level are pinned so the
on-disk bytes are reproducible across machines:

- **Library:** `pako` (added as an explicit M1 dependency).
  `CompressionStream` is rejected for MVP because the spec is not yet
  ubiquitous in the targeted browsers per
  [`01-indexeddb-wrapper.md`](./01-indexeddb-wrapper.md).
- **Level:** `6` (default, deterministic).
- **Dictionary:** none.
- **Determinism:** for any two saves with the same canonical
  pre-compression bytes, the post-compression bytes are byte-identical.
  This is asserted by the determinism CI gate
  ([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)).

The gzip pin is **only** a contract for save artifacts — engine state
itself is the source of truth for determinism. See
[`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md) §
"Save artifact byte determinism".

## Canonical Content Hash

`canonicalContentHash` is xxh64 over the canonical-JSON serialization
of the **content-bearing** subset of the record:

```
canonicalContentHash = xxh64(canonicalJson({
  saveVersion, seed, rulesetId, contentPackHashes,
  turnNumber, commandLog, checkpoints, stateHash, intent
}))
```

It explicitly **excludes** `id`, `name`, `createdAt`, `savedAt`, and
`mp` so two saves of the same session at the same `stateHash` produce
the same `canonicalContentHash`. Full on-disk byte equality across
arbitrary saves is **not** a contract; canonical-content-hash equality
is.

The replay envelope projection (see
[`docs/architecture/replay-format.md`](../../../docs/architecture/replay-format.md))
substitutes a deterministic `id` derived from `canonicalContentHash`,
strips `name` / `createdAt` / `savedAt` / `mp`, and sets
`intent: "replay"`.

## Snapshot Rebase Cap

The command log is not unbounded. Every **K = 50 turns** (or every
M = 5 000 commands, whichever fires first) a verified snapshot is
appended to `checkpoints` and the log is rebased: commands prior to
the snapshot are dropped, `(snapshot, log_since_snapshot)` is what is
serialized. The seed is retained in metadata for archival but replay
on load starts from the snapshot when present. The total compressed
record is capped at **1 MB**; a save that would exceed the cap forces
a rebase or surfaces a "save too large — start a new chapter?"
dialog. The full policy lives in
[`07-snapshot-rebase.md`](./07-snapshot-rebase.md).

## Migration Chain

`saveVersion: 1` is the first member of the migration chain. Schema
evolution is additive-first; breaking changes ship as a new
`saveVersion` plus a registered migrator
(`(prev: SaveRecord_vN) => SaveRecord_vN+1`). The authoring contract,
support window (last 4 versions), and pack-version boundary are
canonical in
[`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md);
the runtime registry is owned by
[`08-migration-registry.md`](./08-migration-registry.md).

## Tamper Detection

`stateHash` and `canonicalContentHash` use **non-keyed** xxh64. They
detect accidental corruption and replay drift but **not** adversarial
forgery. Ranked / leaderboard / tournament features must layer an HMAC
keyed by a server-issued match secret on top of `canonicalContentHash`.
That work is deferred — see
[`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md) §
"Tamper detection vs. forgery".

Dependencies:
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.08-replay-api

Acceptance Criteria:
- `save(state, "My Save")` writes correct `SaveRecord` to IndexedDB
- `load(saveId)` replays commands and returns `AdventureState` with identical hash to save time
- Loading with a mismatched content pack hash applies the row from [`docs/architecture/version-policy.md`](../../../docs/architecture/version-policy.md) (`degrade` offline → toast "Content pack changed since save"; `refuse loud` in multiplayer/trusted-replay)
- Save record for a 7-day game is < 50KB
- Compression is pinned: re-saving an unchanged session at the same
  `stateHash` produces identical post-compression bytes for the
  canonical-content-bearing subset of the record (the dynamic
  metadata header — `id`, `name`, `createdAt`, `savedAt` — is
  excluded from the byte-equality assertion).
- `canonicalContentHash` is computed on save and verified on load;
  two saves of the same `stateHash` produce identical
  `canonicalContentHash`.
- `intent: "save" | "replay"` is honored: an exported replay strips
  PII and substitutes a hash-derived id (see
  [`docs/architecture/replay-format.md`](../../../docs/architecture/replay-format.md)).
- A compressed `SaveRecord` exceeding 1 MB triggers the rebase /
  cap path declared in [`07-snapshot-rebase.md`](./07-snapshot-rebase.md);
  it never silently writes an oversized blob.
- The save record MUST NOT contain any field whose key matches
  `events?` or `eventLog?`. Events are deterministic byproducts of
  replay, not state, and are never serialized; the per-battle
  `eventLog` returned by `AUTO_RESOLVE_BATTLE` is one-shot UI-bound
  and never enters the save record. See
  [`docs/architecture/event-system.md` § 7 Save & Load](../../../docs/architecture/event-system.md#7-save--load).
- **Save eligibility.** `save()` is rejected when the pure
  predicate `canSaveNow(state)` from
  [`content-schema/save-eligibility.md`](../../../content-schema/save-eligibility.md)
  returns `false` (active battle, multiplayer turn lock, open
  choice modal, mid-end-of-day animation).
- **Animation rehydration.** `load()` replays the command
  log silently; the animation timeline starts empty (no in-flight
  animations). Re-emitted events from replay execute
  synchronously without scheduling. The first post-load command
  schedules animations normally. See
  [`docs/architecture/edge-cases-policy.md` § 8](../../../docs/architecture/edge-cases-policy.md#8-save-gating-q212).
- **Locale metadata.** Save metadata captures `localeAtSave`.
  Load shows no warning when the active locale differs; display
  strings re-resolve normally. See
  [`docs/architecture/edge-cases-policy.md` § 10](../../../docs/architecture/edge-cases-policy.md#10-locale-swap-mid-game-q214).
- **Tab-resume autosave.** On `visibilitychange:hidden`, the
  persistence layer fires a best-effort tab-resume autosave
  (synchronous IDB write where possible, wrapped in a 50 ms
  timeout; falls back to no-save if the budget is exceeded). The
  full visibility policy lives in
  [`docs/architecture/visibility-policy.md`](../../../docs/architecture/visibility-policy.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
