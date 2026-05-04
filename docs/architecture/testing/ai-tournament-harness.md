# AI Tournament Harness

Single reusable bracket runner used by every headless-evaluation task
that compares two AI bots. The runner emits a fixed metrics struct so
cross-AI regressions are visible at a glance: heuristic AI degrading
after MCTS lands, or a difficulty tier sliding below its target win
rate, surface in the same dashboard regardless of which task added
the entry.

Before this contract, evaluation appeared ad-hoc in four separate
tasks (`phase-2/02-strategic-ai/05`, `phase-2/03-second-faction/06`,
`phase-3/03-mcts-ai/06`, plus `phase-3/04-polish/04-tournament-mode-ui`).
Each invented its own loop, its own metric, and its own pass/fail
threshold. The shared harness pinned by
[`tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md`](../../../tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md)
keeps the loop and the metrics in one place; each consumer task keeps
its own pass/fail threshold and dataset choice.

## Inputs

```
{
  aiA: BotProvider;
  aiB: BotProvider;
  gamesPerMatch: number;
  seed: bigint;
  contentPack: PackId;
  scenarioId: string;
  budget: PerTurnBudget;
}
```

- `aiA`, `aiB` — `BotProvider` per
  [`ai-contract.md` § 8](../ai-contract.md). Each side can be a
  difficulty tier, a generation of the same AI, or two completely
  different AIs.
- `gamesPerMatch` — number of full games per matchup. The runner
  derives game seeds from `seed` deterministically: `seed_i = hash(
  seed, matchIndex, i)`.
- `contentPack` and `scenarioId` — the fixture both sides play. Two
  runs with the same seed + pack + scenario are byte-identical.
- `budget` — per-turn compute budget passed to both bots, so neither
  side gets accidental compute advantage.

## Outputs (TournamentResult)

```
{
  schemaVersion: 1;
  matchId: string;
  aiA: { id: string; version: string };
  aiB: { id: string; version: string };
  gamesPlayed: number;
  winRateA: integer;          // 0..100, integer percent
  winRateB: integer;          // 0..100, integer percent
  drawRate: integer;          // 0..100, integer percent
  avgDecisionTimeMsA: integer;
  avgDecisionTimeMsB: integer;
  avgBranchingA: integer;
  avgBranchingB: integer;
  avgGameLengthTurns: integer;
  seed: integer;
  contentPack: string;
  scenarioId: string;
}
```

The schema is pinned at
[`content-schema/schemas/tournament-result.schema.json`](../../../content-schema/schemas/tournament-result.schema.json),
canonical example at
[`content-schema/examples/tournament-result/canonical.tournament-result.json`](../../../content-schema/examples/tournament-result/canonical.tournament-result.json).

All percent and timing fields are integers (not floats) so the
metrics struct itself is byte-stable across runs and serializes
through the canonical-JSON path without floating-point drift.
Decision-time and branching averages are integer-truncated; sub-ms
or sub-1 branching is reported as `0`.

## Reproducibility Contract

- Same `(seed, aiA, aiB, contentPack, scenarioId, gamesPerMatch,
  budget)` produces byte-identical `TournamentResult`. This is
  enforced by a unit test in the harness's owning task.
- Per-game seeds derive from the input seed via PCG32 forking, so a
  single failing game's `seed_i` is reproducible without re-running
  the bracket.
- The runner forbids wall-clock reads inside the simulation loop;
  only the metrics emitter consumes wall-clock for `avgDecisionTimeMs`
  and routes through the documented monotonic clock per
  [`determinism.md` § Wall-clock readers](../determinism.md#wall-clock-readers).

## Consumer Pattern

Each downstream task imports the runner, supplies its own
`{aiA, aiB, contentPack, scenarioId, threshold}`, and asserts
`winRateA >= threshold`. The runner does **not** evaluate
pass/fail; consumers do. This keeps the harness a single shared
piece of infrastructure while letting each task pick a meaningful
threshold for its scope (e.g. Lord vs Grand Master ≥ 60 %, or
Wilson-95 lower bound for balance checks).

## Out Of Scope

- The AI quality / heuristics themselves. Owned by each AI task.
- The tournament-mode user-facing UI
  ([`tasks/phase-3/04-polish/`](../../../tasks/phase-3/04-polish/)).
  The shared harness is the headless engine underneath; the UI is a
  separate concern that consumes the same metrics struct.
- Persistence of tournament results across runs. CI emits the
  metrics to stdout + a JSON artifact under
  `bench/results/tournaments/<matchId>.json`. A future ranked /
  leaderboard system would persist these; the contract here is only
  the in-memory shape.
