# Asset Generation Stub (Imagegen API)

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
For each generated unit, optionally request a sprite/portrait image from an image generation API. For MVP, this is a stub that generates placeholder colored squares. The interface is defined so a real imagegen API can be wired in later.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Unit name, faction theme, abilities
- (Optional) Image generation API config

Outputs:
- `src/ai/generation/asset-gen.ts`
- `generateUnitAssets(unit: Unit, theme: string): Promise<UnitAssets>`
- `UnitAssets`: `{ spriteUrl, portraitUrl }` — could be data URLs or remote URLs
- Stub: generates a colored SVG placeholder using unit name as text
- Real implementation: calls DALL-E or Stable Diffusion with themed prompt

Owned Paths:
- `src/ai/generation/asset-gen.ts`

Dependencies:
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check
- phase-3.02-ai-generation.06b-image-moderation

Acceptance Criteria:
- Stub generates a distinct colored placeholder per unit (color derived from unit name hash)
- Placeholder renders correctly in the unit card preview
- Real API can be wired in by replacing one function without changing callers
- The stub MUST NOT skip the
  `ModerationProvider.moderateImage` hook even though placeholder
  SVGs always pass; the hook is the integration seam for the real
  imagegen path. See
  [`06b-image-moderation.md`](./06b-image-moderation.md).
- Future-work: when a real imagegen API is wired in, asset
  normalization per
  [`05b-asset-normalization.md`](./05b-asset-normalization.md) runs
  between moderation (Stage 5.5) and pack materialize (Stage 6).

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
