# River / Water Animated Tiles

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
Rivers and coastlines in the classic overland reference are animated — water shimmers and flows. Implement a simple UV scroll or frame animation for water tiles.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Water tile positions in `MapStorage`
- Animated water sprite sheet (4–8 frames)

Outputs:
- `src/renderer/water-animation.ts`
- Water tiles cycle through frames at ~4 fps (slow shimmer)
- River tiles have directional flow animation (UV scroll in flow direction)
- Shore tiles use shoreline transition sprites (wave effect at land edge)

Owned Paths:
- `src/renderer/water-animation.ts`

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler
- mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform
- mvp.06-renderer.03-map-renderer-terrain-objects-units-layers
- phase-2.06-visual-fidelity.01-terrain-transition-tiles-blending-between-terrain-types

Acceptance Criteria:
- Water visibly animates (not a static texture)
- Animation speeds land inside the target corridor: shimmer ≈ 4 fps, rapids ≈ 8 fps
- Shore tiles show wave overlap onto adjacent land tiles
- Animation is frame-rate independent (delta time based)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
