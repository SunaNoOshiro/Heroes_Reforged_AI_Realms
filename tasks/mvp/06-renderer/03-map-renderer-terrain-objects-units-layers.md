# Map Renderer — Terrain, Objects, Units Layers

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Render the adventure map in three passes: terrain (bottom), objects (mines, towns, artifacts), units/heroes (top). Use instanced rendering — all tiles drawn in one or two draw calls.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- `MapStorage` snapshot (`03-map-system.md` Task 3)
- Tile atlas (Task 2)
- Fog of war state (per-player)

Outputs:
- `src/renderer/map-renderer.ts`
- `renderMap(gl, snapshot: MapSnapshot, camera: Camera, playerId: number): void`
- Fog rendering: `hidden` → fully dark, `explored` → 50% darkened, `visible` → full color

Owned Paths:
- `src/renderer/map-renderer.ts`

Rendering approach:
- Terrain layer: instanced quad per tile, UV from atlas
- Object layer: sprite per object type
- Fog layer: additive dark overlay per fog tile

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler
- mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform

Acceptance Criteria:
- 128×128 map renders at ≥ 60 fps on a mid-range laptop (GTX 1060 / M1 equivalent)
- Fog of war visually correct (hidden tiles are black)
- Heroes visible on their current tile
- No visual artifacts at map edges

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
