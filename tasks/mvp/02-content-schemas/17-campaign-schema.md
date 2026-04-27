# Campaign Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define campaign metadata and scenario-chain records. Campaigns link
scenario IDs, branching rules, carry-over policy, bonus choices, and
narrative slots without embedding UI paths or imperative scripts.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- `content-schema/schemas/scenario.schema.json`
- `content-schema/schemas/condition.schema.json`
- `content-schema/schemas/localization.schema.json`

Outputs:
- `content-schema/schemas/campaign.schema.json`
- `src/content-schema/campaign.ts`
- Canonical campaign examples under `content-schema/examples/records/campaigns/`

Owned Paths:
- `content-schema/schemas/campaign.schema.json`
- `src/content-schema/campaign.ts`
- `content-schema/examples/records/campaigns/`

Dependencies:
- mvp.02-content-schemas.14-localization-schema
- mvp.08-persistence.02-log-only-save-format

Acceptance Criteria:
- Campaign records reference scenarios by stable IDs and content hashes
- Branching rules are declarative conditions, not embedded code
- Carry-over policy explicitly lists which hero, artifact, and resource
  fields may move between scenarios
- Narrative slots resolve through localization and asset IDs

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
