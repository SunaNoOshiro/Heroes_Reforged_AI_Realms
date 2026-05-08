# WebGPU Map-Renderer Parity

Module: [Polish (M7)](../04-polish.md)

Description:
Implement a WebGPU backend that matches the existing WebGL2 renderer's
map-facing behavior and interface closely enough to be swapped in by the
adapter layer.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Renderer adapter from Task 1a
- Existing WebGL2 tile and camera behavior

Outputs:
- `src/renderer/webgpu/`
- WebGPU renderer implementation matching the shared renderer interface
- instanced draw path for adventure-map tile rendering

Owned Paths:
- `src/renderer/webgpu/`

Dependencies:
- phase-3.04-polish.01a-renderer-capability-detection-and-adapter
- module:mvp.06-renderer

Acceptance Criteria:
- WebGPU renderer can draw the adventure map through the shared
  renderer interface
- Camera movement and tile placement match WebGL2 output
- Visual parity is close enough for screenshot comparison on the same
  scene
- WebGPU code is isolated under `src/renderer/webgpu/`

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
