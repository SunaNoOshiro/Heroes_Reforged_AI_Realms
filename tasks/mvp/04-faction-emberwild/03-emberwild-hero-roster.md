# Emberwild Hero Roster JSON

Status: planned

Module: [Faction — Emberwild (M1)](../04-faction-emberwild.md)

Description:
Write the starting hero roster for Emberwild — at least 3 heroes for
MVP. Each hero has a class (Cinder Knight or Emberbinder), starting
integer primary stats, and a starting secondary skill.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Baseline hero-class table in `research/deep-research-report.md`
- `content-schema/schemas/hero.schema.json`
- `content-schema/schemas/hero-class.schema.json`

Outputs:
- `resources/packs/emberwild-faction/heroes/` — one `.hero.json` file
  per hero
- `resources/packs/emberwild-faction/hero-classes/` — one
  `.hero-class.json` file per class

Heroes to include (minimum 3):
- **Kaelis** (Cinder Knight): `unit_bonus` specialty on Ash Hound
- **Marcenne** (Cinder Knight): attack specialty, starts with
  Swordsmanship basic
- **Ilwen** (Emberbinder): Bless-like specialty, starts with Wisdom
  basic + Bless basic

Owned Paths:
- `resources/packs/emberwild-faction/heroes/`
- `.hero.json`
- `resources/packs/emberwild-faction/hero-classes/`

Dependencies:
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema

Acceptance Criteria:
- All 3 hero records validate against `hero.schema.json`
- All hero-class records validate against `hero-class.schema.json`
- Every stat field is an integer
- At least one Cinder Knight and one Emberbinder
- Specialty blocks use the closed `kind` discriminator from the schema

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
