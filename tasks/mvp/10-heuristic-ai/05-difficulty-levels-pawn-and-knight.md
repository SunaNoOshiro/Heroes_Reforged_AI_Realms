# Difficulty Levels — Pawn and Knight

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Implement two difficulty settings by modifying AI behavior:

- **Pawn** (easy): 30% of turns, the AI picks a random legal action instead of the scored best action. Tactical AI skips retaliation saving from the score.
- **Knight** (medium): Full heuristic, no randomness. All scoring components active.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 4 Per-Turn Budget Table, § 8 BotProvider
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Action scorer (Task 3), tactical evaluator (Task 4)

Outputs:
- `src/ai/bots/difficulty.ts`
- `DifficultyLevel`: `"pawn" | "knight"`
- `applyDifficulty(action: Command, alternatives: Command[], difficulty: DifficultyLevel, rng: Rng): Command`
- Per-difficulty deterministic search budget constants consumed
  by `mvp.10-heuristic-ai.06-run-ai-in-web-worker`. The
  constants are owned by
  [`ai-contract.md` § 4 Per-Turn Budget Table](../../../docs/architecture/ai-contract.md#4-per-turn-budget-table)
  — that table is the **only authoritative source**:
  - `pawn`:  `maxNodes = 4 000`,  `maxDepth = 3`
  - `knight`: `maxNodes = 16 000`, `maxDepth = 5`
- `searchBudgetFor(difficulty: DifficultyLevel, mapDims: { width: number, height: number }): { maxNodes: number, maxDepth: number }`
  scales `maxNodes` linearly with `width * height / (128*128)` so
  budgets stay proportional on smaller maps. The function is pure
  and deterministic.
- Per-turn wall-clock budgets per
  [`ai-contract.md` § 4 Per-Turn Budget Table](../../../docs/architecture/ai-contract.md#4-per-turn-budget-table):
  - Pawn:   per-turn budget 200 ms, hard timeout 500 ms,
    no-action fallback `END_HERO_TURN`
  - Knight: per-turn budget 500 ms, hard timeout 1 s,
    no-action fallback `END_HERO_TURN`
  Worker enforcement is owned by
  [`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md).

Owned Paths:
- `src/ai/bots/difficulty.ts`

Dependencies:
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring

Acceptance Criteria:
- Pawn AI makes a random action ~30% of the time (verified over 1000 turns)
- Knight AI never makes random actions (0 random deviations over 1000 turns)
- Difficulty is set at game start and not changeable mid-game (locked in `AdventureState`)
- `searchBudgetFor("knight", { 200, 200 })` keeps every move in
  bench-harness Scenario C under the **2 s wall-clock watchdog
  threshold** on the Minimum-spec emulation profile (validated by
  `mvp.00-perf.01-bench-harness`).
- Budget constants are deterministic — same difficulty + map
  dims yields identical `(maxNodes, maxDepth)` on every call.
- **Quality Gate (Knight difficulty):** Run 10 independent games (different seeds) where Knight AI plays against the `randomBot` baseline opponent (provider id `"random"`, owned by [`10-bot-provider-interface.md`](./10-bot-provider-interface.md)). Knight must win ≥ 8 out of 10 games (80 % win rate minimum). Verified continuously by the bench harness owned by [`11-ai-bench-harness.md`](./11-ai-bench-harness.md).
  - Random opponent: `randomBot(seed)` picks a legal action uniformly at random from the projected view
  - Game length: max 50 turns per player (100 turns total), or until victory condition
  - Metric: Knight AI takes gold mines, builds towns, and captures enemy structures faster than random moves

Verify:
- npm run validate
- npm test
- npm run ai:bench (quality gate: Knight vs Random, 10 games, 80 % win rate)

Estimated Time:
- 2 hours

---

## Quality Gate Details

The benchmark is deterministic and runs as part of acceptance testing:

```bash
npm run ai:bench -- --a heuristic --b random --difficulty knight --games 10
```

Expected output:
```
Knight AI vs Random AI (10 games)
Game 1: KNIGHT_WIN (45 turns) 🎯
Game 2: KNIGHT_WIN (38 turns) 🎯
...
Game 10: RANDOM_WIN (52 turns) ❌

Result: 8/10 (80 %) ✅ PASS
```

If the win rate falls below 80 %, the task fails. The implementation must improve the heuristics (task 10-03 and 10-04) to meet this threshold.
