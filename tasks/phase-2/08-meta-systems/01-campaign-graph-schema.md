# Campaign Graph Schema Runtime Wiring

Status: planned

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Wire campaign schema records into runtime validation and registry lookup.
This task turns campaign content into normalized graph data consumed by
campaign selection, narrative, and runner screens.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- `docs/architecture/wiki/screens/03-campaign-selection/interactions.md`

Inputs:
- `content-schema/schemas/campaign.schema.json`
- Scenario schema and content registry
- Localization and asset registries

Outputs:
- `src/content-runtime/campaign-registry.ts`
- Campaign graph validation fixtures

Owned Paths:
- `src/content-runtime/campaign-registry.ts`

Dependencies:
- mvp.02-content-schemas.17-campaign-schema
- mvp.08-persistence.02-log-only-save-format

Acceptance Criteria:
- Campaign graph loading rejects missing scenario IDs and invalid branch
  targets with JSON-path errors
- Bonus choices, narrative IDs, and carry-over policy normalize to
  stable IDs
- Screen 03 can list campaigns from the registry without reading raw
  content files
- No campaign runtime code depends on a specific first-party campaign

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
