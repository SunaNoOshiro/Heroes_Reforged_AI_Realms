# Tactical Evaluator — Combat Move Scoring

Status: planned

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
For each possible combat action (move + attack), compute an evaluation score. The AI picks the highest-scoring action. This is the hardest part of the AI — getting it wrong makes the AI obvious and exploitable.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `BattleState` (`09-tactical-combat.md`)
- Current active stack

Outputs:
- `src/ai/bots/tactical-evaluator.ts`
- `evaluateActions(state: BattleState, stackId: string): ScoredAction[]`
- `ScoredAction`: `{ action: Command, score: number, reasoning: string }`

Scoring components (weighted sum):
1. **Expected kills** = `estimatedDamage / targetUnit.hp` × targetStack.size (× weight 40)
2. **Retaliation saved** = damage we'd take if we DON'T kill target first (× weight 25)
3. **Positional value** = centrality of destination hex, distance from range of most dangerous enemy (× weight 20)
4. **Status EV** = expected value of morale/luck from current stack morale (× weight 15)

WAIT scoring: if no attack is better than waiting for a faster allied stack to strike first, score WAIT highly.

Owned Paths:
- `src/ai/bots/tactical-evaluator.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.09-tactical-combat.03-damage-formula
- mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit
- mvp.09-tactical-combat.05-retaliation-once-per-round-nullification
- mvp.09-tactical-combat.06-morale-and-luck-rolls
- mvp.09-tactical-combat.07-unit-abilities-flying-double-strike-breath-no-retaliation

Acceptance Criteria:
- AI always attacks if it can one-shot a target (score dominates)
- AI prefers to kill a low-HP stack over scratching a high-HP stack
- AI archer stays out of melee range when possible
- AI does not move its unit into a hex where it will be triple-attacked next turn
- `evaluateActions` completes in < 5ms per call

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
