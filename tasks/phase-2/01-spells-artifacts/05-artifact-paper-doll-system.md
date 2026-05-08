# Artifact Paper-Doll System

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Heroes have 14 artifact slots (head, neck, armor, cloak, boots, main hand, off hand, 2× ring, misc ×5). Equipping an artifact applies its effects to the hero's stats. Unequipping removes them.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Artifact schema (`02-content-schemas.md` Task 4)
- Hero state

Outputs:
- `src/engine/artifacts.ts`
- `equipArtifact(hero, artifact): Hero` — validates slot, applies effects
- `unequipArtifact(hero, slotId): Hero` — removes effects
- `getHeroStats(hero): ComputedStats` — base stats + all artifact bonuses

Owned Paths:
- `src/engine/artifacts.ts`

Dependencies:
- mvp.02-content-schemas.04-artifact-schema

Acceptance Criteria:
- Equipping Torch of Cinders (Emberwild reference artifact) applies its declared `modify_primary_stat` effect correctly
- Cannot equip two artifacts to same slot
- `getHeroStats` returns correct totals with 6 artifacts equipped
- Artifact effects apply to combat immediately (no restart needed)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
