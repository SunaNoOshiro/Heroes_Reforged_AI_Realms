# AI Tournament Harness — Shared Bracket Runner

Module: [AI Tournament Harness (M3+)](../10-ai-tournament-harness.md)

Description:
Author `src/ai/__tests__/tournament.ts` — a single reusable bracket
runner consumed by every headless-evaluation task. Inputs:
`{aiA, aiB, gamesPerMatch, seed, contentPack, scenarioId, budget}`.
Outputs: a fixed metrics struct
`{winRateA, winRateB, drawRate, avgDecisionTimeMsA, avgDecisionTimeMsB,
avgBranchingA, avgBranchingB, avgGameLengthTurns, …}` pinned by
[`content-schema/schemas/tournament-result.schema.json`](../../../content-schema/schemas/tournament-result.schema.json).
The four downstream consumer tasks switch from authoring their own
runners to consuming this one; they keep their own pass/fail
thresholds, but stop owning the loop and the metrics shape.

Read First:
- [`docs/architecture/testing/ai-tournament-harness.md`](../../../docs/architecture/testing/ai-tournament-harness.md)
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 8 BotProvider
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`content-schema/schemas/tournament-result.schema.json`](../../../content-schema/schemas/tournament-result.schema.json)

Inputs:
- `BotProvider` interface (`docs/architecture/ai-contract.md` § 8)
- Command dispatcher (`mvp.01-engine-core.06-command-dispatcher`)
- State serializer + xxh64 hash
  (`mvp.01-engine-core.07-state-serializer-plus-xxh64-hash`)
- Replay API (`mvp.01-engine-core.08-replay-api`)

Outputs:
- `docs/architecture/testing/ai-tournament-harness.md` — defines the
  input / output shape, the metric definitions, and the
  reproducibility contract (PCG32 seed → identical bracket outcome).
- `src/ai/__tests__/tournament.ts` — bracket runner with PCG32-seeded
  per-game seed derivation.
- `content-schema/schemas/tournament-result.schema.json` — metrics
  struct schema, `additionalProperties: false`.
- `content-schema/examples/tournament-result/canonical.tournament-result.json`
  — canonical example.
- One-line cross-reference under `src/ai/` in
  `docs/architecture/master-plan.md`.

Owned Paths:
- `docs/architecture/testing/ai-tournament-harness.md`
- `src/ai/__tests__/tournament.ts`
- `content-schema/schemas/tournament-result.schema.json`
- `content-schema/examples/tournament-result/`

Owned Paths (shared):
- `docs/architecture/master-plan.md` (primary owner:
  `mvp.00-core-architecture`; this task contributes the additive
  cross-reference line under `src/ai/` only).
- `scripts/check-repo-contracts.mjs` (primary owner: contracts task;
  this task contributes the `.tournament-result.json` suffix
  mapping only).

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.08-replay-api

Acceptance Criteria:
- Two consecutive runs of `tournament({aiA, aiB, seed, …})` with
  identical inputs produce byte-identical `TournamentResult` records.
- Per-game seeds derive from the input seed via PCG32 forking; a
  failing game `i` is reproducible from `(seed, i)` alone.
- The metrics schema validates the canonical example and rejects
  unknown properties.
- All percent and timing fields in `TournamentResult` are integers
  (no floats); the canonical-JSON serializer accepts the record
  without fallback.
- The downstream consumer tasks
  (`phase-2/02-strategic-ai/05`, `phase-2/03-second-faction/06`,
  `phase-3/03-mcts-ai/06`) cite this runner and the schema by
  canonical path.
- Shared paths (`docs/architecture/master-plan.md`,
  `scripts/check-repo-contracts.mjs`) are extended with additive
  scope only. This task must not rewrite existing master-plan
  sections or schema-suffix mappings; the primary owner of each
  shared path remains as named in Owned Paths (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
