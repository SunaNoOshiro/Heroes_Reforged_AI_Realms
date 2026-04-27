# Run AI in Web Worker

Status: planned

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
The AI can take up to 200ms to compute a move on complex states. Running it on the main thread would freeze the UI. Move all AI computation into a Web Worker with a simple message-passing interface.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- All AI modules (Tasks 1–5)

Outputs:
- `src/ai/bots/ai-worker.ts` (Web Worker entry point)
- Message in: `{ type: "COMPUTE_MOVE", state: AdventureState, difficulty: DifficultyLevel }`
- Message out: `{ type: "MOVE_RESULT", command: Command }`
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
- Timeout: if AI takes > 2 seconds, it returns the best action found so far (not a hang)
- Worker receives a serialized state copy (not a reference — workers cannot share memory)

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
