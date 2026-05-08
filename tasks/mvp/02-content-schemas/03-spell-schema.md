# Spell Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the data shape for a spell. Spells have different effects at Basic/Advanced/Expert mastery, and different scopes (combat vs adventure map).

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Baseline corridor spell list (`research/deep-research-report.md`, section "Spells")
- `content-schema/schemas/targeting.schema.json`
- `content-schema/schemas/target-scope.schema.json`

Outputs:
- `src/content-schema/spell.ts` exporting `SpellSchema` and `Spell`

Owned Paths:
- `src/content-schema/spell.ts`

Canonical files:
- Schema: [spell.schema.json](../../../content-schema/schemas/spell.schema.json)
- Example: [ember-lance.spell.json](../../../content-schema/examples/records/spells/ember-lance.spell.json)

Dependencies:
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- Parses a baseline damage spell and a baseline debuff spell correctly
- Rejects a spell with an unknown school (the enum in `spell.schema.json` is closed)
- `SpellEffect` union is extensible via the closed effect registry — new effect types land as new `effect.schema.json` kinds, not as schema changes here

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
