# Replay API

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Given a `(seed, commandLog)` pair, replay every command from scratch and return the final `GameState`. This is how saves work (log-only format) and how multiplayer reconnection works (replay from checkpoint).

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `seed: bigint`
- `commandLog: Command[]`

Outputs:
- `src/engine/replay.ts` — `replay(seed: bigint, log: Command[]): GameState`
- Optional: `replayUntil(seed, log, index)` for checkpoint seeks

Owned Paths:
- `src/engine/replay.ts`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash

Acceptance Criteria:
- `replay(seed, log)` produces identical state to live-play on both Node and browser
- `hashState(replay(seed, log)) === hashState(liveState)` after same command sequence
- Empty log returns initial state for given seed

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
