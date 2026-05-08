# Sprite Sheet Loader + Frame Animation

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Load sprite sheets with frame metadata (JSON format from TexturePacker or similar). Play frame sequences for unit idle, walk, attack, and death animations.

The `<entityId>.atlas.json` files this loader consumes are
produced by the atlas-generation pipeline pinned in
[`docs/architecture/atlas-pipeline.md`](../../../docs/architecture/atlas-pipeline.md)
and implemented by `mvp.06-renderer.09-atlas-pipeline`. The
metadata schema lives at
[`content-schema/schemas/atlas.schema.json`](../../../content-schema/schemas/atlas.schema.json).

Read First:
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Sprite sheet PNG + JSON metadata (placeholder assets for MVP)

Outputs:
- `src/renderer/sprite-sheet.ts`
- `SpriteSheet`: `{ texture, frames: Map<string, FrameData> }`
- `Animator`: `{ play(clipName, loop): void, update(dt: number): FrameData, isFinished(): boolean }`

Owned Paths:
- `src/renderer/sprite-sheet.ts`

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler
- mvp.02b-asset-pipeline.02-animation-definition-json-format

Acceptance Criteria:
- Idle animation loops continuously
- Attack animation plays once and returns to idle
- `isFinished()` returns true after one-shot animation completes
- Frame rate independent of rendering frame rate (uses delta time)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
