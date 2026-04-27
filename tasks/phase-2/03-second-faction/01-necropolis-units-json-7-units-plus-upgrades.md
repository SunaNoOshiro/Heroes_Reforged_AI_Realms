# Necropolis Units JSON (7 Units + Upgrades)

Status: planned

Module: [Second Faction — Necropolis (M3)](../03-second-faction.md)

Description:
Write the JSON data for all 7 Necropolis unit tiers and their upgrades.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- `content-schema/examples/packs/emberwild-faction/` (canonical reference pack)
- `research/deep-research-report.md` (baseline corridor reference)
- `content-schema/schemas/unit.schema.json`

Inputs:
- Baseline corridor stat tables (`research/deep-research-report.md`)
- [`unit.schema.json`](../../../content-schema/schemas/unit.schema.json)
- `content-schema/examples/packs/emberwild-faction/units/`
  (canonical unit record shape)
- Shared ability IDs from `content-schema/examples/packs/shared-abilities/`

Outputs:
- `resources/packs/necropolis-faction/units/`
  one `.unit.json` file per unit and upgrade
- `resources/packs/necropolis-faction/faction.json`

Owned Paths:
- `resources/packs/necropolis-faction/units/`
- `resources/packs/necropolis-faction/faction.json`

Units:
| Tier | Base | Upgrade |
|---|---|---|
| 1 | Skeleton | Skeleton Warrior |
| 2 | Walking Dead | Zombie |
| 3 | Wight | Wraith |
| 4 | Vampire | Vampire Lord |
| 5 | Lich | Power Lich |
| 6 | Black Knight | Dread Knight |
| 7 | Bone Dragon | Ghost Dragon |

Key abilities:
- Skeletons: `undead` (immune to morale, immune to mind spells)
- Vampire Lords: `life_drain` (heals attacker proportional to damage dealt)
- Lich / Power Lich: `death_cloud` (death-damage AoE splash to adjacent hexes on attack)
- Bone Dragon: `age` (reduces target's max HP by 50% on hit)
- Ghost Dragon: `age` + `breath_attack`
- Black Knights / Dread Knights: `death_curse` (reduces target's ATK or DEF on hit)

Dependencies:
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- All 14 unit objects validate against `UnitSchema`
- Stats sit within the baseline corridor bands per tier
- All ability IDs reference real entries in the ability registry

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
