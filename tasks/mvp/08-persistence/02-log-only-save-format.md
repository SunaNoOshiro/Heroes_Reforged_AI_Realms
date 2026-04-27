# Log-Only Save Format

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement the log-only save format. A save file contains only the metadata and command log — no game state. Loading a save replays all commands from the seed to reconstruct state. This means saves are typically < 50KB for a 7-day game and supports replay from any turn.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)

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
  id: string,          // UUID
  name: string,        // user-provided name
  createdAt: number,   // timestamp
  savedAt: number,
  seed: bigint,
  rulesetId: string,
  contentPackHashes: string[],  // xxh64 hashes of loaded content packs
  turnNumber: number,
  commandLog: Command[],        // full log
  checkpoints: Checkpoint[],    // optional: log index + hash for faster seek
}
```

Why this is risky: The save is useless if the replay produces a different state than what the player saved. The `contentPackHashes` guard prevents loading a save with modified content packs that would produce different results.

Dependencies:
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.08-replay-api

Acceptance Criteria:
- `save(state, "My Save")` writes correct `SaveRecord` to IndexedDB
- `load(saveId)` replays commands and returns `AdventureState` with identical hash to save time
- Loading with a mismatched content pack hash shows a warning: "Content pack changed since save"
- Save record for a 7-day game is < 50KB

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
