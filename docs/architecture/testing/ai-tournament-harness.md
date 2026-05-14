# AI Tournament Harness

Single reusable bracket runner used by every headless-evaluation task
that compares two AI bots. It emits a fixed metrics struct so
cross-AI regressions — heuristic AI sliding after MCTS lands, or a
difficulty tier dropping below its target win rate — surface on the
same dashboard regardless of which task added the entry.

Owning task:
[`tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md`](../../../tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md).
Before this contract, evaluation was ad-hoc across four tasks
(`phase-2/02-strategic-ai/05`, `phase-2/03-second-faction/06`,
`phase-3/03-mcts-ai/06`, `phase-3/04-polish/04-tournament-mode-ui`),
each with its own loop, metric, and pass/fail threshold. The shared
harness keeps the loop and the metrics in one place; each consumer
task keeps its own pass/fail threshold and dataset choice.

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
  [`ai-contract.md` § 8](../ai-contract.md#8-botprovider). Each side
  may be a difficulty tier, a generation of the same AI, or two
  different AIs.
- `gamesPerMatch` — full games per matchup. Per-game seeds derive
  deterministically: `seed_i = hash(seed, matchIndex, i)`.
- `contentPack`, `scenarioId` — the fixture both sides play. Same
  seed + pack + scenario produces byte-identical runs.
- `budget` — per-turn compute budget passed to both bots so neither
  side gets an accidental compute advantage. Shape follows the
  per-difficulty budgets pinned in
  [`ai-contract.md` § 4](../ai-contract.md#4-per-turn-budget-table).

## Outputs (TournamentResult)

```
{
  schemaVersion: 1;
  matchId: string;             // canonical-JSON hash of the input tuple
  aiA: { id: string; version: string };
  aiB: { id: string; version: string };
  gamesPlayed: number;
  winRateA: integer;           // 0..100, integer percent
  winRateB: integer;           // 0..100, integer percent
  drawRate: integer;           // 0..100, integer percent
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

Schema:
[`content-schema/schemas/tournament-result.schema.json`](../../../content-schema/schemas/tournament-result.schema.json)
(`additionalProperties: false`). Canonical example:
[`content-schema/examples/tournament-result/canonical.tournament-result.json`](../../../content-schema/examples/tournament-result/canonical.tournament-result.json).
Schema-matrix row:
[`schema-matrix.md`](../schema-matrix.md) → `TournamentResult`.

All percent and timing fields are integers (not floats) so the
metrics struct is byte-stable across runs and serializes through the
canonical-JSON path without floating-point drift. Decision-time and
branching averages are integer-truncated; sub-ms or sub-1 branching
is reported as `0`.

## Reproducibility Contract

- Same `(seed, aiA, aiB, contentPack, scenarioId, gamesPerMatch,
  budget)` produces a byte-identical `TournamentResult`. Enforced by
  a unit test in the owning task.
- Per-game seeds derive from the input seed via PCG32 forking, so a
  single failing game's `seed_i` is reproducible from `(seed, i)`
  alone — no need to re-run the bracket.
- Wall-clock reads are forbidden inside the simulation loop. Only
  the metrics emitter consumes wall-clock for `avgDecisionTimeMs`,
  and routes through the documented monotonic clock per
  [`determinism.md` § Wall-clock readers](../determinism.md#wall-clock-readers).

## Consumer Pattern

Each downstream task imports the runner, supplies
`{aiA, aiB, contentPack, scenarioId, threshold}`, and asserts
`winRateA >= threshold`. The runner does **not** evaluate pass/fail;
consumers do. That keeps the harness one shared piece of
infrastructure while letting each task pick a threshold meaningful
for its scope (e.g. Lord vs Grand Master ≥ 60 %, or Wilson-95 lower
bound for balance checks).

## Out Of Scope

- **AI quality / heuristics.** Owned by each AI task.
- **Tournament-mode user-facing UI**
  ([`tasks/phase-3/04-polish/04-tournament-mode-ui.md`](../../../tasks/phase-3/04-polish/04-tournament-mode-ui.md)).
  This harness is the headless engine underneath; the UI consumes
  the same metrics struct.
- **Persistence of results across runs.** CI emits the metrics to
  stdout and a JSON artifact at
  `bench/results/tournaments/<matchId>.json`. A future ranked /
  leaderboard system would persist these; the contract here is only
  the in-memory shape.

---

## 🔍 Sync Check

- **UI: ✔** — Headless harness; no UI surface. The tournament-mode UI
  ([`tasks/phase-3/04-polish/04-tournament-mode-ui.md`](../../../tasks/phase-3/04-polish/04-tournament-mode-ui.md))
  is explicitly out of scope.
- **Schema: ✔** — Output fields match
  [`tournament-result.schema.json`](../../../content-schema/schemas/tournament-result.schema.json)
  exactly (16 required fields, `additionalProperties: false`,
  integer-only metrics, `$defs.percent` 0–100, `$defs.botRef`); the
  schema-matrix row in [`schema-matrix.md`](../schema-matrix.md)
  points to the schema and the canonical example.
- **Tasks: ✔** — Owning task
  [`phase-2.10-ai-tournament-harness.01-ai-tournament-harness`](../../../tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md)
  cites this doc in `Read First` and lists it under `Outputs` / `Owned
  Paths`. Downstream consumer tasks
  (`phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation`,
  `phase-2/03-second-faction/06-emberwild-vs-necropolis-balance-check`,
  `phase-3/03-mcts-ai/06-mcts-performance-and-evaluation`) reference
  the harness and the schema by canonical path.

## ⚠ Issues

- **`PerTurnBudget` is not a named type anywhere else in the repo.**
  The Inputs block uses `budget: PerTurnBudget`, but a repo-wide grep
  finds the identifier only in this file. The per-difficulty soft
  caps live in
  [`ai-contract.md` § 4 Per-Turn Budget Table](../ai-contract.md#4-per-turn-budget-table)
  as `{maxNodes, maxDepth, wallClockHardMs}`, and the worker payload
  field is named `searchBudget` in the same doc and in
  `worker-message.schema.json`. Per Hard Prohibition B the audit did
  not invent a typed definition. Suggested fix in the owning task
  [`phase-2.10-ai-tournament-harness.01-ai-tournament-harness`](../../../tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md):
  either declare `type PerTurnBudget = SearchBudget` (matching the
  worker-payload shape) in the harness source and add a cross-link
  from § 4, or rename this field to `searchBudget` to track the
  existing vocabulary.
- **Budget routing not visible in `BotProvider`.**
  [`ai-contract.md` § 8](../ai-contract.md#8-botprovider) declares
  `requestAIMove(view, difficulty, signal?)` — no `budget` parameter.
  This doc passes `budget` to "both bots", so the routing is implicit
  (the runner either picks the budget by `difficulty` per § 4, or
  injects it on the worker payload as `searchBudget`). Per Hard
  Prohibition D the audit did not edit `ai-contract.md`. Suggested
  values for the owning task: document the routing path in the
  harness source comment ("budget overrides the per-difficulty soft
  cap via worker-payload `searchBudget`") or add an optional
  `budget?: SearchBudget` argument to `BotProvider.requestAIMove` in
  `ai-contract.md` § 8 and have the worker wrapper forward it.
- **Input `seed: bigint` vs output `seed: integer` precision.** The
  Inputs block types `seed` as `bigint` (64-bit, matching PCG32
  internal state); the schema field is JSON `integer`, which only
  round-trips losslessly up to 2^53 − 1. The canonical example uses
  `42`, safely in range, but a caller passing a > 2^53 `bigint` would
  see precision loss in `TournamentResult.seed` and a different
  `matchId` on re-hash. Per Hard Prohibition D the audit did not
  change the schema. Suggested fix in the owning task: either
  constrain the input seed to the safe-integer range (and document
  it here), or change the schema's `seed` field to a string with a
  numeric-only pattern (additive bump of `schemaVersion`).
