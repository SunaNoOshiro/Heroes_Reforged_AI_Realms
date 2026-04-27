# 11×15 Tactical Battlefield Renderer

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
The tactical battle field is an 11×15 hex grid with distinct terrain (grass, dirt, obstacles). Render it with the same tile system but different atlas tiles and no camera pan (field always fits on screen).

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- `BattleState` snapshot (from `09-tactical-combat.md`)
- Tile atlas (battle terrain tiles)

Outputs:
- `src/renderer/battle-renderer.ts`
- `renderBattle(gl, battleSnapshot: BattleSnapshot, camera: Camera): void`
- Unit stacks rendered with count badge overlay
- Active unit highlighted (glow effect or outline)
- Reachable hexes highlighted when unit selected

Owned Paths:
- `src/renderer/battle-renderer.ts`

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler
- mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform
- mvp.06-renderer.04-camera-pan-zoom-clamp-to-map-bounds

Acceptance Criteria:
- 11×15 grid renders correctly with all unit stacks visible
- Selected unit's reachable hexes highlighted in distinct color
- Active unit has visual indicator (glow or outline)
- Renders at ≥ 60 fps with 14 active unit stacks

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
