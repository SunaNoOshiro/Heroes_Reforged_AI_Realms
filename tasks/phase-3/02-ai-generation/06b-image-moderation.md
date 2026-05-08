# Image Moderation (NSFW + IP-likeness + style conformance)

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
The current `ModerationProvider` contract moderates **text only**
(faction names, lore, ability descriptions). Task 5 (asset-generation
stub) is a colored-SVG placeholder that does not call image
moderation; the moment Task 5 is upgraded to a real image-gen call,
sprites would flow into materialized packs with no NSFW,
copyright/likeness, or style-conformance gating. This task closes
that gap by extending the moderation contract from text-only to
structured image-moderation calls invoked between Stage 5 (asset
generation) and Stage 6 (pack materialize).

The schema
[`content-schema/schemas/image-moderation-report.schema.json`](../../../content-schema/schemas/image-moderation-report.schema.json)
captures three independent verdicts (NSFW, copyright/likeness, style
conformance) so each can fail independently and route to a distinct
UI recovery action. A non-pass on any verdict blocks pack materialize.

Vendor selection (which hosted moderation API to use) is operational
and not pinned by this task — the contract is provider-neutral, just
like `GenerationProvider` and the existing text `ModerationProvider`.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- Asset bytes produced by Task 5 (per-asset).
- The provider-neutral `ModerationProvider` interface from
  [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md).

Outputs:
- `content-schema/schemas/image-moderation-report.schema.json`
- `content-schema/examples/image-moderation-report/pass.image-moderation-report.json`
- `content-schema/examples/image-moderation-report/fail-nsfw.image-moderation-report.json`
- A new "Stage 5.5 — Image moderation" row in
  [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
  stage table and the failure-modes table.
- An extended `ModerationProvider` interface signature in
  [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
  that includes
  `moderateImage(asset): Promise<ImageModerationReport>`.
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `content-schema/schemas/image-moderation-report.schema.json`
- `content-schema/examples/image-moderation-report/pass.image-moderation-report.json`
- `content-schema/examples/image-moderation-report/fail-nsfw.image-moderation-report.json`

Dependencies:
- phase-3.02-ai-generation.06-content-moderation-plus-hard-caps

Acceptance Criteria:
- Schema validates each canonical example with zero errors.
- `additionalProperties: false` on every object.
- Three independent verdicts are present: `nsfw`, `ipLikeness`,
  `styleConformance`.
- Each verdict carries `pass`, `score`, `reasonCode`, `message`.
- Stage 5.5 appears in the pipeline doc's stage table.
- The pipeline failure-modes table lists each verdict failure with
  its UI recovery action.
- `ai-integration.md` `ModerationProvider` interface lists
  `moderateImage` alongside the existing text method.
- Stage 5 (`05-asset-generation-stub-imagegen-api.md`) cites this
  task and notes that the moderation hook MUST be called even
  though placeholder SVGs always pass.
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 4 hours
