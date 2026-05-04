# Gradient-Free Stat Optimizer

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
If the win rate is outside the 45–55% target band, automatically adjust unit stats to bring it in. Use coordinate descent (hill climbing): adjust one stat at a time, re-run 100 battles, keep the adjustment if it improves win rate.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Balance test result (Task 3)
- Unit stats (adjustable fields: HP, ATK, DEF, dmgMin, dmgMax)

Outputs:
- `src/ai/generation/optimizer.ts`
- `optimizeStats(faction, balanceResult, targetWinRate: [0.45, 0.55]): Faction`
- Optimization loop: up to 10 iterations of coordinate descent
- Constraints: no stat goes below 1 or above hard caps. Hard-cap
  values are read from
  [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
  (HP ≤ 500, ATK ≤ 50) — the optimizer does not duplicate or
  re-decide the numbers; the constraints schema is the single
  source of truth (see
  [`00b-balance-constraints-schema.md`](./00b-balance-constraints-schema.md)).
- Change log: record each adjustment made

Owned Paths:
- `src/ai/generation/optimizer.ts`

Dependencies:
- phase-3.02-ai-generation.00b-balance-constraints-schema
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check
- phase-3.02-ai-generation.03-auto-balancer-headless-battle-baseline

Acceptance Criteria:
- Faction starting at 70% win rate converges to 45–55% within 10 optimization iterations
- Converges to 45–55% win rate within 10 iterations for most cases
- Does not over-optimize: stops when within target band (doesn't oscillate)
- Generates a diff of stat changes (for human review before publishing)

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
