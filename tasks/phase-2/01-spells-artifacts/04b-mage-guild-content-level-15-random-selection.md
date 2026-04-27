# Mage Guild Content — Level 1–5 Random Selection

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Each town's mage guild has a random selection of spells from the available pool. The selection is seeded per-town at map generation and never changes (same seed → same spells). Upgrade to guild level unlocks higher-level spells.

Read First:
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)

Inputs:
- Spell pool loaded from registered library packs
- Town mage guild level
- RNG (`01-engine-core.md` Task 3)

Outputs:
- `src/engine/mage-guild.ts`
- `generateMageGuildSpells(townId, faction, guildLevel, rng): SpellId[][]` (by level)
- Faction-restricted spells: allow/deny lists and school exclusions are
  declared in the faction pack, not hard-coded

Owned Paths:
- `src/engine/mage-guild.ts`

Dependencies:
- phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling
- mvp.04-faction-emberwild.02-emberwild-town-building-tree

Acceptance Criteria:
- Guild level 1 offers 3 level-1 spells; level 2 adds 2 level-2 spells,
  etc.
- Same town + same seed → same spell selection on every replay
- A faction that declares `excludeSchools: ["necromancy"]` in its pack
  never receives necromancy spells from this generator

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
