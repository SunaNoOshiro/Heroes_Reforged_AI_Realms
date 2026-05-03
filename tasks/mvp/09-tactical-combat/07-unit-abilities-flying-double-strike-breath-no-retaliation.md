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
| `double_strike` | Melee unit attacks twice per turn; each strike resolves separately; **retaliation triggers on the first strike only**. The second strike resolves after retaliation. Companion of `double_shot` — they may not co-exist on the same unit. |
| `no_melee_penalty` | Ranged unit has no melee penalty |
| `no_enemy_retaliation` | Defender cannot retaliate |
| `unlimited_retaliation` | Unit retaliates every attack, not just once |
| `charge_bonus` | +5 % damage per tile moved this turn before attack |
| `breath_attack` | Attacks primary target + adjacent hex in line. **Friendly-fire ON by default** (`targeting.allowFriendly = true`); an ally in the second hex of the line is damaged. See [`docs/architecture/effect-registry.md` §"Friendly-fire Defaults"](../../../docs/architecture/effect-registry.md#friendly-fire-defaults). |
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
- `double_strike` units attack twice; retaliation triggers between
  the strikes (after strike 1, before strike 2); a defender killed
  by strike 1 (simultaneous death) does not retaliate per
  [`docs/architecture/edge-case-policy.md`](../../../docs/architecture/edge-case-policy.md)
- A unit with both `double_shot` and `double_strike` is rejected at
  pack-load
- `charge_bonus` damage is computed from tiles moved this turn
- Morale auras are applied at `initBattle` time, before initiative ordering
- `pack_hunt` adjacency is re-evaluated each time the stack attacks

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
