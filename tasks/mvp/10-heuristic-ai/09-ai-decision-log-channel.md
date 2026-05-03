# AI Decision Log — Out-of-Band Side Channel

Status: planned

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Add an opt-in, out-of-band `aiDecisionLog` channel that records
the AI's `Want[]`, `ScoredAction[]`, chosen `Command`, and
`reasoning` for each turn. The channel is **not** part of the
canonical command log: enabling it must not change the replay
hash or the save format.

The canonical log is sufficient for replay (the engine re-derives
state from the `Command` log) but insufficient for debugging the
AI itself. This task closes that gap without breaking
determinism for unrelated replays.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 7 Decision Log
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `Want[]` from `mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization`
- `ScoredAction[]` and `reasoning` from `mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring`
- The chosen `Command` from `mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking`

Outputs:
- `src/engine/ai/aiDecisionLog.ts`
- Type:
  ```ts
  type AdventureViewSnapshotHash = string; // xxh64 hex of canonical view
  type AiDecisionLogEntry = {
    turn: number;
    playerId: PlayerId;
    difficulty: DifficultyLevel;
    view: AdventureViewSnapshotHash;
    wants: Want[];
    scored: ScoredAction[];
    chosen: Command;
    reasoning: string;
  };
  ```
- Runtime flag: `Engine.config.aiDecisionLog: boolean` (default
  `false`).
- In-memory ring buffer: last `N = 64` turns when the flag is on.
- Optional disk serializer for QA: gated behind a separate
  `Engine.config.aiDecisionLogPath?: string`.

Owned Paths:
- `src/engine/ai/aiDecisionLog.ts`

Owned Paths (shared):
- `src/ai/bots/tactical-evaluator.ts` — additively plumbs
  `reasoning` into the channel (primary owner:
  [`04-tactical-evaluator-combat-move-scoring.md`](./04-tactical-evaluator-combat-move-scoring.md)).
- `src/ai/bots/ai-worker.ts` — additively emits
  `AiDecisionLogEntry` when the flag is on (primary owner:
  [`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md)).

Dependencies:
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring
- mvp.10-heuristic-ai.06-run-ai-in-web-worker

Acceptance Criteria:
- When `Engine.config.aiDecisionLog === false`, no
  `AiDecisionLogEntry` is allocated and the AI hot path has no
  added overhead measurable by the bench harness.
- When `true`, entries are written to a ring buffer of last
  N = 64 turns; the oldest entry is evicted on overflow.
- CI test asserts replay hash is **identical** with the flag on
  vs off, across the 7-day adventure smoke test and the 20-round
  battle smoke test.
- CI test asserts save snapshot hash is **identical** with the
  flag on vs off (saves do not capture the channel).
- `view` is recorded as the xxh64 hash of the canonical-JSON
  serialization of the projected view, not the view itself, so
  the ring buffer stays bounded.
- The disk serializer (`aiDecisionLogPath`) is a side-effect
  sink only; it never feeds back into engine state.
- Shared-path extensions to `src/ai/bots/tactical-evaluator.ts`
  and `src/ai/bots/ai-worker.ts` are **additive**: this task
  plumbs `reasoning` and emits `AiDecisionLogEntry` only when
  the runtime flag is on. It **must not** rewrite the existing
  scoring logic or `COMPUTE_MOVE` flow. The **primary owner** of
  the tactical evaluator is
  [`04-tactical-evaluator-combat-move-scoring.md`](./04-tactical-evaluator-combat-move-scoring.md);
  the **primary owner** of the worker entrypoint is
  [`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md).
  Both primary contracts remain unchanged.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
