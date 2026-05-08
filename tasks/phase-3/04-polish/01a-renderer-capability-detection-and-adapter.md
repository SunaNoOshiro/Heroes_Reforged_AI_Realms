# Renderer Capability Detection + Adapter

Module: [Polish (M7)](../04-polish.md)

Description:
Introduce a thin renderer-selection layer so WebGPU can be added as an
optional backend without coupling it to the existing WebGL2 path.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Existing WebGL2 renderer (`06-renderer.md`)
- Browser capability detection APIs

Outputs:
- `src/renderer/detect-renderer.ts`
- `detectRenderer(): "webgpu" | "webgl2"`
- shared renderer interface for backend selection

Owned Paths:
- `src/renderer/detect-renderer.ts`

Dependencies:
- module:mvp.06-renderer

Acceptance Criteria:
- Capability detection selects WebGPU only when the browser explicitly
  supports it
- WebGL2 remains the default fallback with no behavior change
- Backend selection is isolated behind one adapter boundary
- No WebGPU-specific code lands inside the WebGL2 renderer path

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
