# Pseudo-Isometric Depth Sorting — Objects Overlap Correctly

Status: planned

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The classic overland-strategy adventure map uses a painter's algorithm: objects further "up" the screen (lower row index) are drawn first; objects lower on screen overlap them. Trees, buildings, and heroes all participate. The effect creates the illusion of depth without true 3D.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- All map objects (towns, mines, trees, heroes, etc.) with their hex positions

Outputs:
- `src/renderer/depth-sort.ts`
- `sortByDepth(objects: RenderObject[]): RenderObject[]`
- Sort key: `row * 1000 + col` (lower row = rendered first = appears "behind")
- Objects with a `heightOffset` (tall trees, towers) add that to their sort key so they never clip in front of objects on higher rows

Owned Paths:
- `src/renderer/depth-sort.ts`

Dependencies:
- mvp.06-renderer.03-map-renderer-terrain-objects-units-layers

Acceptance Criteria:
- A hero walking behind a tree is correctly occluded by the tree's lower portion
- A town building at row 5 does NOT overlap a hero at row 6 (hero is "closer")
- Depth sort is stable (ties broken by column, then object ID)
- No visual "pop" when objects move (sort is re-evaluated every frame)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
