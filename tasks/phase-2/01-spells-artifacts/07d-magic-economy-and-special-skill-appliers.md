# Magic, Economy, And Special Skill Appliers

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement the remaining secondary-skill appliers that affect spell
school mastery, mana economy, marketplace rates, experience gain, and
special post-battle or battle-action hooks. This task depends on the
runtime contract and must not invent effect kinds.

Read First:
- [`research/deep-research-report.md`](../../../research/deep-research-report.md) (Section "Secondary Skills")
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Skill runtime contract from
  `phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization`
- Spell school loader, hero leveling, marketplace command, and battle
  resolution hooks
- Skill records from the active content registry

Outputs:
- `src/engine/skills/magic-economy-skill-appliers.ts`
- Appliers for Wisdom school mastery, Mysticism, Sorcery,
  Interference, Necromancy, Conversion, Trading, and Learning
- Explicit deferred-hook records for behavior that needs a later
  dedicated mechanic task

Owned Paths:
- `src/engine/skills/magic-economy-skill-appliers.ts`

Dependencies:
- phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization
- phase-2.01-spells-artifacts.00-hero-leveling
- phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling
- phase-2.01-spells-artifacts.03-adventure-map-spells
- mvp.05-adventure-map.10-trade-resources-command
- mvp.09-tactical-combat.08-battle-end-condition

Acceptance Criteria:
- Wisdom school mastery gates spell learning and spell casting through
  `SPELL_CAST` / learn-spell validation, not through school-specific
  command kinds
- Mysticism and Sorcery alter mana pool, regeneration, or cost through
  deterministic derived-stat hooks
- Trading adjusts marketplace rates without changing resource IDs or
  command payload shapes
- Learning changes experience gain before `LEVEL_UP` is derived, with a
  deterministic test vector for overflow and level cap behavior
- Necromancy and Conversion delegate behavior that needs faction-specific
  or battle-action mechanics to explicit hooks; unrepresentable behavior
  is preceded by an effect-registry/schema task before content depends
  on it

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
