# Tavern And Marketplace Tables

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define content tables for tavern hero offers and marketplace exchange
rates. These tables let towns, skills, and buildings alter recruitment
and trade rules through content rather than hard-coded branches.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `content-schema/schemas/hero.schema.json`
- `content-schema/schemas/resource-id.schema.json`
- `content-schema/schemas/ruleset.schema.json`

Outputs:
- `content-schema/schemas/tavern-offer.schema.json`
- `content-schema/schemas/marketplace-rate-table.schema.json`
- `src/content-schema/tavern-offer.ts`
- `src/content-schema/marketplace-rate-table.ts`

Owned Paths:
- `content-schema/schemas/tavern-offer.schema.json`
- `content-schema/schemas/marketplace-rate-table.schema.json`
- `src/content-schema/tavern-offer.ts`
- `src/content-schema/marketplace-rate-table.ts`

Dependencies:
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.07-hero-schema

Acceptance Criteria:
- Tavern offers include hero ID, cost, availability window, and
  deterministic refresh seed inputs
- Marketplace rates support owned-marketplace modifiers and skill
  modifiers without floats
- Resource IDs reuse `resource-id.schema.json`
- Missing hero or resource references fail during content loading

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
