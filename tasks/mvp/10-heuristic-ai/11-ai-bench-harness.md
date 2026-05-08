# AI Bench Harness — Continuous Quality Gate

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Continuous bench harness that runs the difficulty quality gates
in CI against the current heuristic and reports win-rates per
commit. Plugged into the `BotProvider` interface so any pair of
bots (heuristic vs random, Lord vs Grand Master, future MCTS vs
heuristic) can be benched without rewriting harness code.

Verifies:

- M2 Knight gate: Knight vs random, ≥ 80 % over 10 games.
- M3 Grand Master gate: Grand Master vs Knight, ≥ 70 % over 100
  games.
- M7 Lord gate: Lord vs Grand Master, ≥ 60 % over 50 games.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 8 BotProvider
- [`tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md`](./05-difficulty-levels-pawn-and-knight.md) § Quality Gate Details

Inputs:
- `BotProvider` interface from
  [`10-bot-provider-interface.md`](./10-bot-provider-interface.md)
- Headless engine harness from `mvp.01-engine-core`
- Scenario fixture(s) — small deterministic adventure-map
  scenarios for fast bench runs

Outputs:
- `src/engine/ai/bench/runMatch.ts`:
  - `runMatch({ a: BotProvider, b: BotProvider, games: number, scenario: ScenarioId, seedBase: string }): MatchReport`
  - `MatchReport`: `{ wins: { a: number, b: number, draw: number }, avgGameLength: number, gamesById: GameRecord[] }`
  - `GameRecord`: `{ seed: string, winner: "a" | "b" | "draw", length: number, commands: Command[] }`
- `src/engine/ai/bench/cli.ts`:
  - `npm run ai:bench -- --a <id> --b <id> --games <n> --scenario <id>`
- CI hook: a non-blocking metric in M2 (records win-rate per
  commit). Promote to blocking when the Knight gate is reached
  and again at each subsequent gate.

Owned Paths:
- `src/engine/ai/bench/runMatch.ts`
- `src/engine/ai/bench/cli.ts`
- `src/engine/ai/bench/__tests__/`

Dependencies:
- mvp.10-heuristic-ai.10-bot-provider-interface
- mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight

Acceptance Criteria:
- `runMatch` is deterministic for identical inputs: same bots,
  scenario, seedBase, and game count produce an identical
  `MatchReport`.
- The bench harness uses `BotProvider` exclusively; no direct
  worker-client imports outside the `heuristicBot` wrapper.
- `npm run ai:bench -- --a heuristic --b random --games 10` runs
  to completion in < 60 s on the Reference tier.
- CI records win-rate per commit. Below the M2 Knight gate, the
  metric is non-blocking; once met, the harness is upgraded to
  blocking.
- The harness reports per-game `Command[]` for failure triage
  without re-running the AI.
- Win-rate report is reproducible from the on-disk
  `MatchReport` JSON; replays of `commands` against a fresh
  engine instance yield identical state hashes.

Verify:
- npm run validate
- npm test
- npm run ai:bench -- --a heuristic --b random --games 10

Estimated Time:
- 5 hours
