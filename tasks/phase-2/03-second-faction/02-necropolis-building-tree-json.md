# Necropolis Building Tree JSON

Module: [Second Faction — Necropolis (M3)](../03-second-faction.md)

Description:
Author the Necropolis town building dependency tree as JSON pack
records validated by `content-schema/schemas/building.schema.json`.
Mirror the structure used by Emberwild (see
`mvp.04-faction-emberwild.02-emberwild-town-building-tree`): a
linear-plus-branching tree rooted at `townhall → cityhall → capitol`,
with creature dwellings, mage guild tiers, and faction-unique
buildings attached as children. All resource costs and prerequisites
are expressed as IDs from
`content-schema/schemas/resource-id.schema.json` and other building
records — no hardcoded asset paths or string literals for resources.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md`](../../mvp/04-faction-emberwild/02-emberwild-town-building-tree.md)
- `content-schema/examples/packs/emberwild-faction/` (canonical reference pack)
- `research/deep-research-report.md` (baseline corridor reference)
- `content-schema/schemas/building.schema.json`
- `content-schema/schemas/resource-id.schema.json`

Inputs:
- Baseline corridor building tree reference for the Necropolis
  archetype (`research/deep-research-report.md`, section
  "Faction Archetypes")
- `content-schema/schemas/building.schema.json`
- `content-schema/examples/packs/emberwild-faction/buildings/`
  (canonical building record shape)

Outputs:
- `resources/packs/necropolis-faction/buildings/`
  one `.building.json` file per building

Owned Paths:
- `resources/packs/necropolis-faction/buildings/`

Notable buildings:
- Undead Transformer: converts killed enemy creatures to Skeletons (supplements Necromancy)
- Cover of Darkness: extends fog of war for Necropolis heroes by 3 tiles
- Skeleton building chain: Skeleton→Skeleton Warrior dwelling

Dependencies:
- mvp.02-content-schemas.05-building-schema

Acceptance Criteria:
- All building objects validate against `BuildingSchema`
- Dependency graph has no cycles
- Cover of Darkness effect is described in `BuildingEffect` format

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
