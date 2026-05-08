# Spell School Loader + Mastery Scaling

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Load spell definitions from content pack and wire them into the sim. Each spell has Basic/Advanced/Expert versions with different values. A hero's mastery level in a school determines which version fires.

Read First:
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Spell schema (`02-content-schemas.md` Task 3)
- Baseline spell list from `research/deep-research-report.md` (4 schools × 5 levels)
- Hero's secondary skills

Outputs:
- `src/engine/spells/spell-loader.ts`
- `getSpellEffect(spell: Spell, mastery: "basic" | "advanced" | "expert" | "none"): SpellEffect[]`
- Mana cost deducted from hero after casting
- `SPELL_CAST` command added to dispatcher

Owned Paths:
- `src/engine/spells/spell-loader.ts`

Dependencies:
- mvp.02-content-schemas.03-spell-schema

Acceptance Criteria:
- Slow at Expert mastery reduces speed by more than Basic
- `SPELL_CAST` validation fails if hero has 0 mana
- Mana regenerates at +knowledge/day at start of each adventure map day

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
