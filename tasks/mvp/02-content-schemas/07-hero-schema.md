# Hero Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the data shape for a hero, including starting army, starting
skills, specialty, and presentation bindings for portrait, map sprite,
paper doll, and animation sets.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Unit schema (Task 1) for `startingArmy.unitId` references
- Faction schema (Task 2) for `factionId` and roster wiring
- Ruleset schema (Task 6) for primary-stat and specialty-related
  numeric fields

Outputs:
- `src/content-schema/hero.ts` exporting `HeroSchema` and `Hero`
- `content-schema/schemas/hero.schema.json`
- `content-schema/examples/packs/emberwild-faction/heroes/kaelis.hero.json`
- `docs/architecture/schema-matrix.md`

Owned Paths:
- `src/content-schema/hero.ts`
- `content-schema/schemas/hero.schema.json`
- `content-schema/examples/packs/emberwild-faction/heroes/kaelis.hero.json`
- `docs/architecture/schema-matrix.md`

Dependencies:
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- Hero record carries only stable IDs for units, spells, skills, and
  presentation assets
- Starting army references unit IDs rather than embedding unit records
- Specialty is a closed discriminated union keyed by `kind`
  (`unit_bonus`, `creature_specialty`, `spell_bonus`, `skill_bonus`,
  `resource_bonus`) with only kind-appropriate fields allowed
- Unknown `specialty.kind` values and cross-kind fields (e.g.
  `targetSpellId` inside a `unit_bonus`) fail validation
- Canonical hero example validates cleanly against the schema

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
