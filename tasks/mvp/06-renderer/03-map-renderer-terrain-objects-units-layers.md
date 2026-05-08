# Map Renderer — Terrain, Objects, Units Layers

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Render the adventure map in three passes: terrain (bottom), objects (mines, towns, artifacts), units/heroes (top). Use instanced rendering — all tiles drawn in one or two draw calls.

Read First:
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
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
- 128×128 map renders at ≥ 60 fps on the **Reference** tier
  (GTX 1060 / Apple M1) per
  [`docs/architecture/performance.md` § 1](../../../docs/architecture/performance.md#1-hardware-tiers);
  ≥ 30 fps on the **Minimum-spec** tier on the same scene.
- Fog of war visually correct (hidden tiles are black)
- Heroes visible on their current tile
- No visual artifacts at map edges
- **Adventure-map animation ceilings** (per
  [`performance.md` § 5](../../../docs/architecture/performance.md#5-entity-ceilings)):
  - On-screen active animations ≤ 128 per frame.
  - Total active animations (on-screen + off-screen) ≤ 256.
  - Off-screen animations skip frame-advance entirely when over
    budget per
    [`diagrams/22-building-loop.md`](../../../docs/architecture/diagrams/22-building-loop.md).
- **Renderer-side object pools** (per
  [`performance.md` § Allocation Policy](../../../docs/architecture/performance.md#allocation-policy)):
  - Per-frame culling pass uses the hex-coordinate vector pool
    from `mvp.00-perf.05-object-pools`.
  - Sprite draw-command construction uses the draw-command pool
    from the same task. No per-frame `{ q, r }` or draw-command
    allocations are observed by bench harness Scenario A.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
