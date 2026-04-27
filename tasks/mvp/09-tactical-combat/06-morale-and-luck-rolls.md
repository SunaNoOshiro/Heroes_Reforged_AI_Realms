# Morale and Luck Rolls

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
At the start of a unit's turn, roll for morale. On a positive morale
roll the unit gets an extra move this round (inserted at current
queue position). On a negative morale roll the unit loses its turn.
Luck is rolled per attack and, if it fires, doubles damage.

The probabilities below come from the canonical ruleset
[`baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)
— `moraleExtraTurnProb`, `moralePenaltyMissProb`, and `luckDoubleProb`
all resolve to `1/24` per point, capped at `moraleMax` / `luckMax = 3`.
All three are expressed as integer numerator/denominator pairs so
they can be overridden by a pack without changing code.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleState` (Task 1)
- RNG state (the deterministic stream from `src/rules/rng.ts`)
- Stack morale value (-3 .. +3) and luck value (-3 .. +3) derived
  from unit stats + hero leadership + active effects
- Ruleset constants loaded from the active ruleset pack

Outputs:
- `src/engine/morale-luck.ts`
- `rollMorale(stack, rng, ruleset): "positive" | "neutral" | "negative"`
- `rollLuck(stack, rng, ruleset): boolean`

Probability rules (baseline corridor):

| Morale | Extra move chance | Lose turn chance |
|---|---|---|
| +3 | 3/24 | 0 |
| +2 | 2/24 | 0 |
| +1 | 1/24 | 0 |
|  0 | 0 | 0 |
| -1 | 0 | 1/24 |
| -2 | 0 | 2/24 |
| -3 | 0 | 3/24 |

Owned Paths:
- `src/engine/morale-luck.ts`

Luck mirrors the same curve:

| Luck | Double-damage chance |
|---|---|
| +1 | 1/24 |
| +2 | 2/24 |
| +3 | 3/24 |
|  0 | 0 |
| -1 .. -3 | never — unchanged damage |

Formula (integer, fixed-point basis 24):

```
extraTurnNumerator = clamp(stack.morale, 0, 3)
loseTurnNumerator  = clamp(-stack.morale, 0, 3)
moraleRoll         = rng.nextInt(0, 23)          // 0..23 inclusive
extraTurn          = moraleRoll < extraTurnNumerator
loseTurn           = moraleRoll < loseTurnNumerator
```

The same shape drives luck with the luck value and the luck
denominator from the ruleset.

Dependencies:
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- `rollMorale(stack{morale: 3}, rng)` returns `"positive"` in
  12.5 % of rolls (± 2σ band) over 24 000 rolls — i.e. ≈ 3 000
  positive outcomes
- `rollMorale(stack{morale: 1}, rng)` returns `"positive"` in
  1/24 ≈ 4.17 % of rolls (± 2σ over 24 000 rolls)
- Neutral units (flagged `immuneToMorale`) always roll `neutral`
- Luck applies only to damage effects (not healing, not pure-type
  damage spells)
- All probabilities come from the ruleset — swapping
  `moraleExtraTurnProbDen` from 24 to 12 doubles the chance with
  zero TypeScript change

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
