# Camera — Pan, Zoom, Clamp to Map Bounds

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Implement a 2D camera with mouse drag to pan and scroll wheel to zoom. Camera view is clamped so it cannot scroll past map edges. Camera state lives entirely in the renderer (never in sim state).

Read First:
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Canvas element
- Map dimensions

Outputs:
- `src/renderer/camera.ts`
- `Camera` class: `{ position, zoom, project(worldX, worldY): screenXY, unproject(screenX, screenY): worldXY }`
- Input handlers: `onMouseDrag`, `onWheel`, `onTouchPinch`
- Bounds clamping: camera center always within map bounds

Owned Paths:
- `src/renderer/camera.ts`

Dependencies:
- mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform
- mvp.06-renderer.03-map-renderer-terrain-objects-units-layers

Acceptance Criteria:
- Dragging pans the view smoothly at ≥ 60 fps
- Zoom range: 0.5× to 3× (tiles from tiny to very large)
- Camera cannot scroll to reveal empty space outside map
- `unproject` correctly converts screen clicks to hex coordinates for tile selection

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
