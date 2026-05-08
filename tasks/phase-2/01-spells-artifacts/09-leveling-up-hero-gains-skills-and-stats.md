# Leveling Up — Hero Gains Skills and Stats

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Heroes gain experience from combat victories. On level-up, primary stats increase and the player is offered a skill choice.

Read First:
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Hero state, XP formula from ruleset

Outputs:
- `src/engine/leveling.ts`
- `addExperience(hero, xp): { hero: Hero, leveledUp: boolean, skillChoices?: SkillId[] }`
- Level-up: +1 ATK or DEF or POW or KNW (class-weighted random, then offer 2 skill choices)
- `HERO_LEVEL_UP` event → UI shows level-up dialog

Owned Paths:
- `src/engine/leveling.ts`

Dependencies:
- phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization
- phase-2.01-spells-artifacts.04a-baseline-skill-pack
- phase-2.01-spells-artifacts.01a-hero-skill-assignment
- mvp.04-faction-emberwild.03-emberwild-hero-roster

Acceptance Criteria:
- XP requirement per level matches the baseline ruleset formula
  (`level × (level - 1) × ruleset.constants.heroExperiencePerLevel`;
  the engine reads this, not hard-codes it)
- Level-up dialog presents exactly 2 valid skill choices (no skills
  the hero already has at Expert)
- Choosing a new skill adds it at Basic; choosing an existing skill
  upgrades its mastery level
- Primary stat growth is weighted by the hero class's
  `primaryStatGrowth` weights (not hard-coded per class name)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
