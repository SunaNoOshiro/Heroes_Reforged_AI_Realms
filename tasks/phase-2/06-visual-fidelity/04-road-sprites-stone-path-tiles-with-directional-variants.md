# Road Sprites — Stone Path Tiles with Directional Variants

Status: planned

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
Roads in the classic overland reference are rendered as directional sprites — a straight horizontal road looks different from a corner or a T-junction. Roads reduce movement cost (75 vs 100 for grass). The renderer must pick the correct road sprite variant based on which neighbors are also roads.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Road tiles in `MapStorage`
- Road sprite sheet (12 variants: straight-H, straight-V, corners ×4, T-junctions ×4, cross)

Outputs:
- `src/renderer/road-renderer.ts`
- `computeRoadVariants(map: MapStorage): Map<HexCoord, RoadSpriteId>`
- Variant selection: bitmask of 6 neighbors that are also road → look up sprite in table
- Drawn above terrain layer, below objects

Owned Paths:
- `src/renderer/road-renderer.ts`

Dependencies:
- mvp.06-renderer.03-map-renderer-terrain-objects-units-layers
- phase-2.06-visual-fidelity.01-terrain-transition-tiles-blending-between-terrain-types

Acceptance Criteria:
- A straight road running east-west shows horizontal road sprites throughout
- A T-junction shows a T-junction sprite at the branching tile
- Road transitions correctly at map edge (half-road not visible)
- Road presents as a continuous stone-path appearance with no seams at turns/junctions

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
