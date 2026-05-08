# Asset Normalization (dimensions / palette / frame counts / atlas)

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Author the canonical
[`docs/architecture/asset-normalization.md`](../../../docs/architecture/asset-normalization.md)
spec and the matching
[`content-schema/schemas/asset-normalization-spec.schema.json`](../../../content-schema/schemas/asset-normalization-spec.schema.json)
that pin the four normalization contracts (dimensions, palette,
frame counts, atlas binding) applied to AI-generated images before
pack materialize. Today, Task 5 produces a single colored placeholder
SVG with no dimension constraint; once it is upgraded to a real
image-gen call, generated sprites would arrive at whatever resolution
or palette the provider returned, breaking renderer assumptions about
sprite size and faction palette consistency. This task closes that
gap as a deterministic stage transformation that runs **after**
image moderation (Stage 5.5) and **before** pack materialize (Stage 6).

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/animation-contract.md`](../../../docs/architecture/animation-contract.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/atlas-pipeline.md`](../../../docs/architecture/atlas-pipeline.md)

Inputs:
- Moderated AI image bytes from Stage 5.5
  ([`06b-image-moderation.md`](./06b-image-moderation.md)).
- Per-asset-role normalization rule from the new schema.

Outputs:
- `docs/architecture/asset-normalization.md`
- `content-schema/schemas/asset-normalization-spec.schema.json`
- `content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json`
- A "Normalize before bind" bullet in Stage 6 of
  [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md).
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `docs/architecture/asset-normalization.md`
- `content-schema/schemas/asset-normalization-spec.schema.json`
- `content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json`

Dependencies:
- phase-3.02-ai-generation.05-asset-generation-stub-imagegen-api
- phase-3.02-ai-generation.06b-image-moderation

Acceptance Criteria:
- Schema validates the canonical example with zero errors.
- `additionalProperties: false` on every object.
- Four asset roles are pinned: `creature-sprite`, `hero-portrait`,
  `building`, `ability-icon`.
- Each role declares `width`, `height`, `frames.required`,
  `frames.fallback`, and `palette.source`.
- The spec doc lists four numbered rules (dimension, palette,
  frame-count, atlas binding).
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 5 hours
