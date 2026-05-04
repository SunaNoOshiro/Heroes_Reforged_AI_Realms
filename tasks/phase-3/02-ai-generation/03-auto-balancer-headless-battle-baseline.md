# Auto-Balancer — Headless Battle Baseline

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Run a large batch of headless battles between the generated faction
and the reference faction (Emberwild) to estimate the new faction's
win rate. A faction is considered "in band" when the Wilson 95 % CI
for its win rate lies fully inside [40 %, 60 %] after 1 000 battles.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Validated faction (Task 2)
- Emberwild reference pack, deterministic sim
- Baseline ruleset pack

Outputs:
- `src/ai/generation/balancer.ts`
- `runBalanceTest(newFaction, referenceFaction, seed, n): BalanceResult`
- `BalanceResult`:
  - `wins`, `losses`, `draws`
  - `winRate` (integer permille)
  - `wilsonLow`, `wilsonHigh` (95 % CI, integer permille)
  - `avgGameLength`
  - `battleReports[]`
- The serialized output shape matches
  [`content-schema/schemas/balance-report.schema.json`](../../../content-schema/schemas/balance-report.schema.json)
  (closed verdict + findings + numeric metrics; sister schemas
  [`validation-report.schema.json`](../../../content-schema/schemas/validation-report.schema.json)
  and [`coherence-report.schema.json`](../../../content-schema/schemas/coherence-report.schema.json)
  share the same `findings[]` base in
  [`report-base.schema.json`](../../../content-schema/schemas/report-base.schema.json)).
- 1 000 battles by default, each seeded from `seed + battleIndex`
- Both sides use the default heuristic AI at "Knight" difficulty
- Track: win rate, Wilson CI, average HP remaining, fastest victory,
  which unit most often survives last

Owned Paths:
- `src/ai/generation/balancer.ts`

Dependencies:
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring
- module:mvp.09-tactical-combat

Acceptance Criteria:
- 1 000 battles complete in < 5 minutes on a modern laptop (headless,
  no rendering)
- Win rate calculation is verified: Emberwild-vs-Emberwild self-play
  produces a Wilson CI that brackets 50 % (within ±3 %)
- Battle reports include enough data to diagnose an imbalanced unit
  (which unit most often causes wins/losses)
- "In band" classification uses the Wilson CI, not the point estimate

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
