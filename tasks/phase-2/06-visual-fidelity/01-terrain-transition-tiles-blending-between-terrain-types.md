# Terrain Transition Tiles — Blending Between Terrain Types

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The classic overland-strategy adventure map never has hard edges between terrain types. Where Grass meets Dirt, there is a set of 8 transition tiles (corners + edges) that smoothly blend the two surfaces. This is what makes the map feel rich rather than blocky.

Approach — "Wang tile" / autotiling:
For every pair of adjacent terrain types, pre-define 8 transition sprites (top, bottom, left, right, TL corner, TR corner, BL corner, BR corner). At map-load time, scan every tile and assign the correct transition variant based on its 6 hex neighbors.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `MapStorage` terrain layer (`03-map-system.md` Task 3)
- Terrain transition sprite sheet (one sheet per terrain pair: grass/dirt, grass/snow, dirt/sand, etc.)

Outputs:
- `src/renderer/terrain-transitions.ts`
- `computeTransitionVariants(map: MapStorage): Uint8Array` — per-tile transition mask
- Transition mask stored as a separate render layer (not in MapStorage — display-only)
- `renderTerrainTransitions(gl, map, transitionMask, atlas): void`

Terrain pairs requiring transitions (priority order for MVP):
1. Grass ↔ Dirt
2. Grass ↔ Snow
3. Dirt ↔ Sand
4. Sand ↔ Dirt
5. Grass ↔ Water (shoreline)
6. Snow ↔ Rock
7. Dirt ↔ Lava

Owned Paths:
- `src/renderer/terrain-transitions.ts`

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler
- mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform
- mvp.06-renderer.03-map-renderer-terrain-objects-units-layers

Acceptance Criteria:
- Grass-to-Dirt boundary shows a gradual blended edge (no pixel-sharp cutoff)
- Terrain transitions show a gradual blended edge at every shared biome border (visual QA pass against internal scene fixtures when available)
- Transition calculation runs once on map load (not per frame)
- Works at map edges (partial neighbor sets handled)

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
