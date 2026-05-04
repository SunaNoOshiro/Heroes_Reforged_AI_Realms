# Generated Faction notes.playerInspectable + modelVersion

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Extend [`generated-faction.schema.json`](../../../content-schema/schemas/generated-faction.schema.json)
with optional `notes.playerInspectable: boolean` and
`notes.modelVersion: string`. These are surfaced via screen 74
(`ai-provenance-detail`) per
[`ugc-safety.md` § Localization Keys](../../../docs/architecture/ugc-safety.md#7-localization-keys).

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/wiki/screens/74-ai-provenance-detail/data-contracts.md`](../../../docs/architecture/wiki/screens/74-ai-provenance-detail/data-contracts.md)

Inputs:
- AI-generation Stage 6 emits the model version from the provider.

Outputs:
- Updated `content-schema/schemas/generated-faction.schema.json`.

Owned Paths:
- `content-schema/schemas/generated-faction.schema.json`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `notes.playerInspectable` defaults to `true` when present.
- `notes.modelVersion` is an optional string.
- Screen 74 falls back to a collapsed body when
  `playerInspectable === false`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
