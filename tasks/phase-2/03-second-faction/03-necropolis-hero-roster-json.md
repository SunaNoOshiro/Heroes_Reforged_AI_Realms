# Necropolis Hero Roster JSON

Module: [Second Faction — Necropolis (M3)](../03-second-faction.md)

Description:
Author 3 starting heroes for Necropolis as JSON pack records,
validated against `content-schema/schemas/hero.schema.json` and
`content-schema/schemas/hero-class.schema.json`. Each hero declares a
stable `id`, a `class` (referencing an existing hero-class record by
ID), a `specialty`, starting army stacks, primary stats, and 1–2
starting secondary skills. Mirror the shape used by
`mvp.04-faction-emberwild.03-emberwild-hero-roster` — do **not**
redefine hero classes in this file; only emit hero records.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`tasks/mvp/04-faction-emberwild/03-emberwild-hero-roster.md`](../../mvp/04-faction-emberwild/03-emberwild-hero-roster.md)
- `content-schema/examples/packs/emberwild-faction/` (canonical reference pack)
- `research/deep-research-report.md` (baseline corridor reference)
- `content-schema/schemas/hero.schema.json`
- `content-schema/schemas/hero-class.schema.json`

Inputs:
- `content-schema/schemas/hero.schema.json`
- `content-schema/schemas/hero-class.schema.json`
- Necromancy / Sorcery skill IDs from
  `phase-2.01-spells-artifacts.04a-baseline-skill-pack`
- Existing Death Knight / Necromancer hero-class records (referenced by ID;
  do NOT redefine classes here)

Outputs:
- `resources/packs/necropolis-faction/heroes/`
  one `.hero.json` file per hero

Heroes (minimum 3):
- **Isra** (Death Knight): Necromancy spec (raises 30% more skeletons), starts Necromancy Basic
- **Vidomina** (Necromancer): Necromancy spec, starts Necromancy Expert + Wisdom Basic
- **Sandro** (Necromancer): Sorcery spec, starts Necromancy Basic + Sorcery Basic

Owned Paths:
- `resources/packs/necropolis-faction/heroes/`

Dependencies:
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema

Acceptance Criteria:
- All 3 heroes validate against HeroSchema
- At least 1 Death Knight and 1 Necromancer class

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
