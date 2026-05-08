# Spell Selection in Tactical AI

Module: [Strategic AI Depth (M3)](../02-strategic-ai.md)

Description:
Add spell-casting to the tactical AI. The tactical evaluator should consider casting a spell as a possible action and score it against physical attacks.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)

Inputs:
- Tactical evaluator (`10-heuristic-ai.md` Task 4)
- Spell system (`01-spells-artifacts.md` Tasks 1–2)

Outputs:
- `src/ai/bots/tactical-evaluator.ts` (extend)
- Spell actions added to candidate action list
- Scoring: `spellDamageEV / manaCost` weighted against physical attack EV
- AI correctly prioritizes Slow on fastest enemy, Blind on strongest attacker

Owned Paths (shared):
- `src/ai/bots/tactical-evaluator.ts` (no exclusive output — this task additively extends the tactical-evaluator owned by `mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring`)

Dependencies:
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring

Acceptance Criteria:
- AI casts Fireball when it can hit ≥ 3 enemy stacks
- AI does not cast spells when 0 mana (validation catch)
- Spell selection is deterministic for same RNG state
- Extends the existing tactical evaluator without breaking physical
  attack, wait, defend, and positioning assertions from MVP
- Shared path work is additive only: add spell-action scoring without
  rewriting the primary tactical-evaluator contract owned by
  `mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
