# Emberwild Units JSON (7 Units + Upgrades)

Module: [Faction — Emberwild (M1)](../04-faction-emberwild.md)

Description:
Write the JSON data for all 7 Emberwild unit tiers and their upgrades
using the baseline stat budget. These are the reference units — every
balance decision for future factions is measured against them.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Baseline stat tables in
  [`research/deep-research-report.md`](../../../research/deep-research-report.md)
- Unit schema (`02-content-schemas.md` Task 1)

Outputs:
- `resources/packs/emberwild-faction/units/` — one `.unit.json` file
  per unit and upgrade
- `resources/packs/emberwild-faction/faction.json`

Units (tier → base / upgrade):
| Tier | Base | Upgrade |
|---|---|---|
| 1 | Ash Scout | Cinder Scout |
| 2 | Ash Hound | Pyre Hound |
| 3 | Ember Archer | Ember Marksman |
| 4 | Cinder Knight | Pyre Knight |
| 5 | Emberbinder | Fireshaper |
| 6 | Warden | Warden Captain |
| 7 | Phoenix | Immortal Phoenix |

Starter abilities (stubs OK for MVP — full resolution deferred to
`09-tactical-combat.md`):

- Ember Archer / Marksman: `ranged`; Marksman adds `double_shot`
- Warden / Warden Captain: `unlimited_retaliation`
- Cinder Knight / Pyre Knight: `charge_bonus` (damage bonus per hex
  moved)
- Phoenix / Immortal Phoenix: `morale_aura`; Immortal Phoenix adds
  `rebirth` (resurrection once per battle)
- Emberbinder / Fireshaper: `no_melee_penalty`

Owned Paths:
- `resources/packs/emberwild-faction/units/`
- `.unit.json`
- `resources/packs/emberwild-faction/faction.json`

Dependencies:
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- All 14 unit records validate against `unit.schema.json`
- Stats match the baseline budget table in
  `research/deep-research-report.md`; if the table is missing required
  rows, this task updates it as part of the source of truth
- Every stat field is an integer (no floats)
- `abilityIds` references exist in the ability registry (stubs OK for
  MVP)
- `growth.baseWeekly` values match the baseline table (scouts: 14,
  phoenix: 1)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
