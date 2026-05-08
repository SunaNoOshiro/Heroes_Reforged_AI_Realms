# Combat Spells

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement the 5 most impactful combat spells. Each spell must produce deterministic, replayable results.

Spells to implement:

| Spell | School | Effect |
|---|---|---|
| Fireball | Fire | AoE damage to all units in radius (Basic: r=1, Expert: r=2) |
| Lightning Bolt | Air | Single-target damage, ignores defense |
| Blind | Air | Target unit cannot act for N rounds (Basic: 1, Expert: 3) |
| Slow | Earth | Target speed reduced by 40–60% based on mastery |
| Haste | Air | Target speed increased by 3–5 based on mastery |

Read First:
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Task 1, `BattleState` (`09-tactical-combat.md`)

Outputs:
- `src/engine/spells/combat-spells.ts`
- Each spell is a pure function: `(state, hero, target, mastery) => BattleState`
- Spells emit `SPELL_EFFECT` events consumed by animation timeline

Owned Paths:
- `src/engine/spells/combat-spells.ts`

Dependencies:
- phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order

Acceptance Criteria:
- Fireball damage matches the baseline corridor for ATK-DEF parity (`research/deep-research-report.md`, section "Combat Balance")
- Blind target skips its turn for correct number of rounds
- Haste correctly speeds up slow stacks (Pikemen with Haste jump up the initiative queue)
- All spell effects are deterministic (no `Math.random()`)

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
