# Auto-Resolve Combat

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Before tactical combat lands (M2), adventure-map battles are resolved
instantly with a power comparison. Both auto-resolve and tactical
combat *must* use the same baseline-ruleset constants; otherwise a
stack can win one path and lose the other, and replacing auto-resolve
with tactical combat (Task 9 of the tactical module) changes player
outcomes mid-campaign.

This task shares its per-engagement formula with
[`09-tactical-combat/03-damage-formula.md`](../09-tactical-combat/03-damage-formula.md).
Auto-resolve reuses the same AST evaluator (`src/rules/formula-eval.ts`)
with stack-aggregated inputs — no bespoke ratios, no hard-coded
scale factors.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `AdventureState` (Task 1)
- Attacker and defender army stacks (`ArmyStack[]` from the
  content-runtime)
- The active ruleset pack, providing:
  - `atkBonusPerPointNum / atkBonusPerPointDen` (default 1/20)
  - `defReductionPerPointNum / defReductionPerPointDen` (default 1/20)
  - `atkBonusCap` (default 60 → +300 %)
  - `defReductionCap` (default 60 → ~70 % mitigation)
  - `autoResolveAttackerAdvantageNum / Den` (default 105/100)
- RNG for casualty distribution

Outputs:
- `src/engine/auto-resolve.ts`
- `src/engine/commands/auto-resolve.ts` dispatching `AUTO_RESOLVE_BATTLE`
- `autoResolveBattle(attacker: ArmyStack[], defender: ArmyStack[], ruleset: Ruleset, rng: Rng): AutoResolveResult`
- Command payload:
  `{ battleId: string, attackerHeroId: string, defenderHeroId?: string, defenderStackId?: string }`
- `AUTO_RESOLVE_BATTLE` returns
  `{ winner, attackerLosses, defenderLosses, eventLog: Event[] }`
- `AutoResolveResult`: `{ winner: "attacker" | "defender", attackerLosses: ArmyStack[], defenderLosses: ArmyStack[], eventLog: Event[] }`

Power formula (reuses the tactical damage AST with aggregated inputs,
fixed-point basis 1000):

```
# for a single stack, with stackSize S
avgDamagePerUnit = (damageMin + damageMax) / 2           // integer midpoint
attackBonus      = clamp(attack - referenceDefense, 0, atkBonusCap) × atkBonusPerPoint
defenseBonus     = clamp(defense - referenceAttack, 0, defReductionCap) × defReductionPerPoint
offense          = S × avgDamagePerUnit × (1000 + attackBonus) // 1000
survivability    = S × hp × (1000 + defenseBonus) // 1000
stackPower       = offense + survivability

armyPower = Σ stackPower over all stacks in the army
```

- `referenceAttack` / `referenceDefense` are the *opposing army's*
  weighted average primary stat, computed first in a setup pass.
- The `clamp(..., 0, cap) × perPoint` form is *the same* expression
  that the damage AST uses; the task's acceptance matches the
  tactical task's cap/ratio acceptance numerically.

Owned Paths:
- `src/engine/auto-resolve.ts`
- `src/engine/commands/auto-resolve.ts`

Winner rule:

```
attackerWins = armyPower(attacker) × autoResolveAttackerAdvantageDen
             > armyPower(defender) × autoResolveAttackerAdvantageNum
```

Casualty rule (deterministic, RNG only for tie-breaking):

```
powerGap        = |winnerPower - loserPower|
totalPowerSum   = winnerPower + loserPower
loserLosses     = 100 %                                  # loser is wiped
winnerLossRatio = max(0, 20 - (powerGap × 20 // totalPowerSum))   # 0..20 %
```

Losses are distributed across the winner's stacks proportional to
stack power, with RNG seeded by the battle hash so results are
reproducible.

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.04-faction-emberwild.04-baseline-ruleset
- mvp.02-content-schemas.12-formula-dsl

Acceptance Criteria:
- Dispatching `AUTO_RESOLVE_BATTLE` on a non-existent battle returns
  `ValidationError`
- Dispatching `AUTO_RESOLVE_BATTLE` consumes the pending battle from
  `AdventureState`
- Smoke test (Task 8) drives all M1 combat through
  `AUTO_RESOLVE_BATTLE` and replays byte-identically
- A full stack of T7 units always beats a full stack of T1 units of
  equal count — verified at the 3 canonical test sizes (10 / 50 / 200)
- Running the same auto-resolve with the same RNG seed yields
  identical casualty vectors (byte-for-byte)
- Two scenarios that trip tactical combat at ATK−DEF = 10 produce
  matching win/loss outcomes in auto-resolve — no stack wins tactical
  while losing auto-resolve or vice versa, at the same stack sizes
- Swapping `atkBonusPerPointDen` from 20 to 10 makes attack bonuses
  twice as strong in *both* auto-resolve and tactical damage — one
  ruleset edit, not two code paths
- All math is integer; no `Math.*` float ops

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
