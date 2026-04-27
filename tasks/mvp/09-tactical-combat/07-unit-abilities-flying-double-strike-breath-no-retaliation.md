# Unit Abilities — Flying, Double Strike, Breath, No Retaliation

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the core unit abilities needed to make Emberwild (and any
other starter faction) units play correctly. Abilities are resolved in
the combat command handlers and driven by effect-registry kinds.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleState`, ability IDs from unit data

Outputs:
- `src/engine/abilities.ts`
- Ability resolver called from `BATTLE_ATTACK` and `BATTLE_MOVE` command handlers

Abilities to implement for MVP (Emberwild + any second faction):

| Ability ID | Description |
|---|---|
| `flying` | Unit can move to any empty hex ignoring obstacles |
| `double_shot` | Ranged unit fires twice per turn |
| `no_melee_penalty` | Ranged unit has no melee penalty |
| `no_enemy_retaliation` | Defender cannot retaliate |
| `unlimited_retaliation` | Unit retaliates every attack, not just once |
| `charge_bonus` | +5 % damage per tile moved this turn before attack |
| `breath_attack` | Attacks primary target + adjacent hex in line (stub for future) |
| `morale_aura` | All allied units in battle gain +1 morale |
| `resurrection` | On kill, resurrects some allied units at start of next round (stub) |
| `pack_hunt` | +1 damage per adjacent allied stack of the same unit (Emberwild signature) |

Owned Paths:
- `src/engine/abilities.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.09-tactical-combat.03-damage-formula
- mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit
- mvp.09-tactical-combat.05-retaliation-once-per-round-nullification
- mvp.09-tactical-combat.06-morale-and-luck-rolls

Acceptance Criteria:
- Flying units can jump over obstacle hexes to any empty target
- `double_shot` units shoot twice; second shot resolves before any retaliation
- `charge_bonus` damage is computed from tiles moved this turn
- Morale auras are applied at `initBattle` time, before initiative ordering
- `pack_hunt` adjacency is re-evaluated each time the stack attacks

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
