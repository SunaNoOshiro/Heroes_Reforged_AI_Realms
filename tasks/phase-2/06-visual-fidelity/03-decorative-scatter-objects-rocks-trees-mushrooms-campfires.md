# Decorative Scatter Objects — Rocks, Trees, Mushrooms, Campfires

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
Classic overland-strategy maps are dense with purely decorative objects that have no gameplay function — piles of rocks, lone trees, campfire sparks, barrels, signs. These are placed at map generation time using the map RNG. They make the map feel alive and handcrafted.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `MapStorage` (terrain layer)
- Map RNG (`01-engine-core.md` Task 3)
- Decorative object sprite sheet (categorized by terrain type)

Outputs:
- `src/engine/map-decoration.ts`
- `generateDecorations(map: MapStorage, rng: Rng): DecorationLayer`
- `DecorationLayer`: array of `{ q, r, spriteId, depthOffset }` — display-only, not in `MapStorage`
- Placement rules:
  - No decoration on passable road tiles
  - No decoration on tiles with gameplay objects (mines, towns, artifacts)
  - Density: ~15 % of terrain tiles get a decoration (tuned for a lived-in overland feel)
  - Biome-matched sprites: snow terrain gets icicle rocks, not mushrooms

Owned Paths:
- `src/engine/map-decoration.ts`

Dependencies:
- mvp.03-map-system.03-layered-tile-storage
- phase-2.06-visual-fidelity.02-pseudo-isometric-depth-sorting-objects-overlap-correctly

Acceptance Criteria:
- Generated map looks lived-in (neither sparse nor overcrowded) at ~15 % density
- Decorations are deterministic (same map seed → same decoration placement)
- Decorations never block hero movement (display-only layer)
- At least 12 distinct decoration sprite types per terrain biome

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
