# WebGL2 Context Setup + Resize Handler

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Initialize a WebGL2 rendering context on a `<canvas>` element managed by React. Handle window resize, device pixel ratio (retina displays), and context loss/restore.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/ui-frame-lag-contract.md`](../../../docs/architecture/ui-frame-lag-contract.md)

Inputs:
- Canvas element ref from React

Outputs:
- `src/renderer/gl-context.ts`
- `initGL(canvas: HTMLCanvasElement): WebGL2RenderingContext`
- Resize observer that updates viewport and camera projection on canvas resize
- Context loss handler that flags renderer as "suspended" and attempts restore

Owned Paths:
- `src/renderer/gl-context.ts`

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- Canvas renders at full device pixel ratio on retina displays
- Resizing the window does not stretch/squash tiles
- Context loss fires a recoverable error (does not crash the app)

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
