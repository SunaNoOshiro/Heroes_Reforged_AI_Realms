# Run AI in Web Worker

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
The AI can take up to 200ms to compute a move on complex states. Running it on the main thread would freeze the UI. Move all AI computation into a Web Worker with a simple message-passing interface.

The full AI runtime contract (input view, output, worker
protocol, per-turn budget table, cancellation, parallelism,
decision log, BotProvider, cheats) lives in
[`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md).
This task implements the worker boundary against that contract;
it does not re-state contract clauses.

The worker runs under a **deterministic search budget**, not a
wall-clock timeout. AI workers stop when
`nodesExpanded >= maxNodes(difficulty, mapDims)` or
`searchDepth >= maxDepth(difficulty)`, whichever fires first.
The per-difficulty constants are pinned in
[`05-difficulty-levels-pawn-and-knight.md`](./05-difficulty-levels-pawn-and-knight.md).

A wall-clock per-turn cap layered on top is the cancellation
trigger pinned by the per-difficulty budget table in
[`ai-contract.md` § 4](../../../docs/architecture/ai-contract.md#4-per-turn-budget-table).
On hard-timeout fire, the worker returns the best-found `Command`
or the per-difficulty no-action fallback (`END_HERO_TURN` /
`END_DAY`); the resulting `Command` is logged once and replays
bit-identically from the log without re-running the search.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md)
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`docs/architecture/worker-csp.md`](../../../docs/architecture/worker-csp.md)

Inputs:
- All AI modules (Tasks 1–5)
- `aiPlayerView(state, playerId, cheats)` projection from
  [`07-ai-player-view-projection.md`](./07-ai-player-view-projection.md)
- `searchBudget = { maxNodes, maxDepth }` derived from
  difficulty + map dimensions (Task 5).

Outputs:
- `src/ai/bots/ai-worker.ts` (Web Worker entry point)
- Message in `COMPUTE_MOVE`:
  `{ type: "COMPUTE_MOVE", requestId, view: AdventureView, difficulty: DifficultyLevel, searchBudget: { maxNodes: number, maxDepth: number }, cheats?: AiCheats, rngSeed: string }`
- Message out `MOVE_RESULT`:
  `{ type: "MOVE_RESULT", requestId, command: Command, nodesExpanded: number, searchDepthReached: number }`
- Error path `AI_ERROR`:
  `{ type: "AI_ERROR", requestId, reason: string }`. The closed
  envelope `kind` enum has **8 values**:
  `COMPUTE_MOVE`, `MOVE_RESULT`, `ABORT`, `PING`, `PONG`,
  `AI_ERROR`, `AI_TRACE_REQUEST`, `AI_TRACE_RESULT`. The two
  `AI_TRACE_*` tokens are dev-only (see
  [`docs/architecture/ai-contract.md` § 3](../../../docs/architecture/ai-contract.md#3-worker-protocol)).
- `src/ai/bots/ai-client.ts` — thin wrapper used by the UI:
  - `requestAIMove(view: AdventureView, difficulty: DifficultyLevel, signal?: AbortSignal): Promise<Command>`
  - The client calls `aiPlayerView` before sending `COMPUTE_MOVE`;
    raw `AdventureState` never crosses the worker boundary.

Owned Paths:
- `src/ai/bots/ai-worker.ts`
- `src/ai/bots/ai-client.ts`

Owned Paths (shared):
- `src/ai/bots/ai-worker.ts` (additive extension point for the
  `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` message kinds owned by
  [`08-ai-inspector-dev-screen.md`](./08-ai-inspector-dev-screen.md);
  trace handlers extend the worker without rewriting `COMPUTE_MOVE`)
- `src/ai/bots/ai-client.ts` (additive extension point for the
  `BotProvider` interface owned by
  [`10-bot-provider-interface.md`](./10-bot-provider-interface.md);
  `heuristicBot` wraps the existing client without rewriting it)

Dependencies:
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring
- mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight
- mvp.10-heuristic-ai.07-ai-player-view-projection

Acceptance Criteria:
- UI remains responsive (input events fire) while AI is computing.
- Worker receives a serialized projected view (`AdventureView`),
  not raw `AdventureState`. A test asserts no field absent from
  the projection is read inside the worker (instrumented via a
  `Proxy` in test mode). See
  [`07-ai-player-view-projection.md`](./07-ai-player-view-projection.md)
  acceptance criteria.
- Worker stops on `searchBudget` (`maxNodes` or `maxDepth`) within
  the per-turn budget; identical seed + view + budget on two runs
  produces an identical `Command` when search completes within
  budget (verified by a determinism unit test at two simulated
  `setTimeout` rates).
- Per-turn budget enforcement matches the table in
  [`ai-contract.md` § 4 Per-Turn Budget Table](../../../docs/architecture/ai-contract.md#4-per-turn-budget-table):
  - Pawn 200 ms / hard 500 ms
  - Knight 500 ms / hard 1 s
  - Grand Master 1 s / hard 2 s
  - Lord 2 s / hard 4 s
  - Immortal 3 s / hard 6 s
- `requestAIMove` accepts an optional `AbortSignal`. On abort the
  worker:
  1. Finishes the current `evaluateActions` call (≤ 5 ms).
  2. Returns the best-found `Command` if any has scored, else the
     per-difficulty no-action fallback (`END_HERO_TURN` / `END_DAY`).
  3. Resolves the returned `Promise` (never rejects). The
     dispatcher always sees a valid `Command`.
- `Worker.terminate()` is reserved for "game ends" / "user
  navigates away" only. It is not the cancellation path.
- Required cancellation tests:
  - "abort during `buildThreatMap` returns `END_HERO_TURN`
    deterministically".
  - "abort after one `evaluateActions` call returns the scored
    best-action deterministically".
  - "Lord with view containing 0 ready heroes returns `END_DAY`
    within 6 s hard timeout".
- `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` message handlers are
  additive surfaces (owned by task 08) that do not affect
  `COMPUTE_MOVE` semantics. The trace return for input
  `(view, rngSeed)` is itself deterministic; calling it mid-game
  is allowed but **not** part of the canonical command log.
- Error path: on uncaught worker exception, the worker emits
  `AI_ERROR` and the client resolves with the per-difficulty
  no-action fallback so the dispatcher always advances.
- **Worker security profile.** The Worker adopts the per-Worker
  CSP, structured-clone-only message bus, crash-recovery, and
  responsiveness-timeout contract pinned in
  [`docs/architecture/worker-csp.md`](../../../docs/architecture/worker-csp.md).
  No `eval`, no `Function`, no remote `importScripts()`. A
  Worker crash restarts under the last-known-good policy in that
  doc; a crash-loop (3× same `kind` per session) surfaces
  `Result.err("worker.crash-loop", …)` and the client returns
  the per-difficulty no-action fallback.
- Shared-path extensions to `src/ai/bots/ai-worker.ts` and
  `src/ai/bots/ai-client.ts` are **additive**: this task **must
  not** be rewritten when downstream tasks add the
  `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` handlers (primary
  contract for those handlers is **owned by**
  [`08-ai-inspector-dev-screen.md`](./08-ai-inspector-dev-screen.md))
  or the `BotProvider` interface (primary contract **owned by**
  [`10-bot-provider-interface.md`](./10-bot-provider-interface.md)).
  Trace handlers and the BotProvider wrapper extend the worker
  surface without rewriting the `COMPUTE_MOVE` semantics owned
  here.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
