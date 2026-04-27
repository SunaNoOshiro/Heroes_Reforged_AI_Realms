# Artifact Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the data shape for artifacts. Artifacts occupy named slots on a hero's paper doll and can form combination sets.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Baseline artifact list (`research/deep-research-report.md`, section "Artifacts")

Outputs:
- `src/content-schema/artifact.ts` exporting `ArtifactSchema` and `Artifact`

Owned Paths:
- `src/content-schema/artifact.ts`

Canonical files:
- Schema: [artifact.schema.json](../../../content-schema/schemas/artifact.schema.json)
- Example: [torch-of-cinders.artifact.json](../../../content-schema/examples/records/artifacts/torch-of-cinders.artifact.json)

Dependencies:
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- Parses the canonical Emberwild artifact example (`torch-of-cinders.artifact.json`) without errors
- Rejects an artifact claiming an invalid slot
- Combination artifacts list their set members and bonus effects

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
