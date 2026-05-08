# BotProvider Interface

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Define the `BotProvider` interface that tests, the bench harness,
and future MCTS regression all use to swap the AI opponent. Ship
three first-party implementations: `heuristicBot`, `randomBot`,
and `scriptedBot`. Tests pick a provider by `id`; production
wires `heuristicBot` only.

Without this interface, every test reinvents the bot swap and
M3 / M7 regression cannot reference M2 by name.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 8 BotProvider
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `requestAIMove` worker client from
  [`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md)
- Closed `Command` enum from
  [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- Pure deterministic RNG (PCG32) from
  [`docs/architecture/rng-streams.md`](../../../docs/architecture/rng-streams.md)

Outputs:
- `src/engine/ai/BotProvider.ts`:
  ```ts
  type BotProvider = {
    id: string;
    requestAIMove(
      view: AdventureView,
      difficulty: DifficultyLevel,
      signal?: AbortSignal
    ): Promise<Command>;
  };
  ```
- `src/engine/ai/heuristicBot.ts` — wraps the M2 worker client.
  - `id: "heuristic"`
- `src/engine/ai/randomBot.ts` — picks a uniformly-random legal
  action from the projected view using a seeded PCG32 stream.
  - `id: "random"`
  - Constructor: `randomBot(seed: string): BotProvider`
- `src/engine/ai/scriptedBot.ts` — replays a fixed `Command[]`.
  - `id: "scripted"`
  - Constructor: `scriptedBot(commands: Command[]): BotProvider`
  - On exhaustion, returns the per-difficulty no-action fallback
    (`END_HERO_TURN` / `END_DAY`).

Owned Paths:
- `src/engine/ai/BotProvider.ts`
- `src/engine/ai/heuristicBot.ts`
- `src/engine/ai/randomBot.ts`
- `src/engine/ai/scriptedBot.ts`

Dependencies:
- mvp.10-heuristic-ai.06-run-ai-in-web-worker
- mvp.10-heuristic-ai.07-ai-player-view-projection
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `heuristicBot.requestAIMove` returns the same `Command` as
  calling the worker client directly for identical inputs.
- `randomBot(seed).requestAIMove` returns the same `Command` for
  identical `(view, difficulty, seed)`. Two calls with the same
  seed and view produce identical streams.
- `randomBot` enumerates legal actions from the projected view
  only — no full-state cheating.
- `scriptedBot` returns commands from its array in order; on
  exhaustion it returns the per-difficulty no-action fallback.
- All three implementations honor `AbortSignal` per
  [`ai-contract.md` § 5 Cancellation](../../../docs/architecture/ai-contract.md#5-cancellation).
- Provider IDs (`"heuristic"`, `"random"`, `"scripted"`) are
  stable string literals; tests reference them by ID.
- A unit test enumerates registered provider IDs and asserts no
  duplicates.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
