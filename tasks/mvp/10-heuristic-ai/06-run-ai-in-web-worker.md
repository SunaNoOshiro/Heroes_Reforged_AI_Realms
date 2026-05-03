# Run AI in Web Worker

Status: planned

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
The AI can take up to 200ms to compute a move on complex states. Running it on the main thread would freeze the UI. Move all AI computation into a Web Worker with a simple message-passing interface.

The worker runs under a **deterministic search budget**, not a
wall-clock timeout. AI workers stop when
`nodesExpanded >= maxNodes(difficulty, mapDims)` or
`searchDepth >= maxDepth(difficulty)`, whichever fires first.
The per-difficulty constants are pinned in
[`05-difficulty-levels-pawn-and-knight.md`](./05-difficulty-levels-pawn-and-knight.md).
A wall-clock timer is retained **only as a watchdog**: it logs a
warning if a single move exceeds 2 s on the current machine but
**never truncates** the search. Wall-clock-driven truncation is
forbidden by [`determinism.md` § AI Compute Budget](../../../docs/architecture/determinism.md#ai-compute-budget).

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)

Inputs:
- All AI modules (Tasks 1–5)
- `searchBudget = { maxNodes, maxDepth }` derived from
  difficulty + map dimensions (Task 5).

Outputs:
- `src/ai/bots/ai-worker.ts` (Web Worker entry point)
- Message in: `{ type: "COMPUTE_MOVE", state: AdventureState, difficulty: DifficultyLevel, searchBudget: { maxNodes: number, maxDepth: number } }`
- Message out: `{ type: "MOVE_RESULT", command: Command, nodesExpanded: number, searchDepthReached: number }`
- `src/ai/bots/ai-client.ts` — thin wrapper used by the UI:
  - `requestAIMove(state, difficulty): Promise<Command>`

Owned Paths:
- `src/ai/bots/ai-worker.ts`
- `src/ai/bots/ai-client.ts`

Dependencies:
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring
- mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight

Acceptance Criteria:
- UI remains responsive (input events fire) while AI is computing
- AI worker terminates cleanly when the game ends or user navigates away
- Worker stops on `searchBudget` (`maxNodes` or `maxDepth`),
  **not** on a wall-clock timer; identical seed + state + budget
  on two runs produces an identical `Command` (verified by a
  determinism unit test at two simulated `setTimeout` rates).
- Wall-clock watchdog: if a single AI move exceeds 2 s, the
  worker logs a warning **and continues** to completion. A
  watchdog warning is treated as a difficulty-tuning bug, not a
  runtime fallback.
- Worker receives a serialized state copy (not a reference — workers cannot share memory)

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
