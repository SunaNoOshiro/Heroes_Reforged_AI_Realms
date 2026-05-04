# Manifest aiProvenance + capabilities default-deny

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Extend [`manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
with an additive `aiProvenance` block (re-asserted from
`GeneratedFaction.notes` at materialize time) and tighten
`capabilities` to default `["scripts.none"]` (default-deny). Per
[`ugc-safety.md` § Capability Enforcement](../../../docs/architecture/ugc-safety.md#6-capability-enforcement)
and [`ai-generation-pipeline.md` § Stage 6](../../../docs/architecture/ai-generation-pipeline.md).

Read First:
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/wiki/screens/74-ai-provenance-detail/data-contracts.md`](../../../docs/architecture/wiki/screens/74-ai-provenance-detail/data-contracts.md)

Inputs:
- `GeneratedFaction.notes` shape (provider, model, prompt, tokens).
- Closed-enum capability list.

Outputs:
- Updated `content-schema/schemas/manifest.schema.json`.

Owned Paths:
- `content-schema/schemas/manifest.schema.json`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `aiProvenance.present` is the only required sub-field; all
  others are optional.
- `aiProvenance.promptExcerpt` is bounded to 280 chars.
- `capabilities` declares `default: ["scripts.none"]`; a manifest
  that omits the field validates as default-deny.
- `aiProvenance` is referenced from screen 74's data contract.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
