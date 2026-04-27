# WebGPU Particles, Fallback, And Benchmark

Status: planned

Module: [Polish (M7)](../04-polish.md)

Description:
Finish the optional WebGPU path with particle-system work,
backend-fallback verification, and a performance comparison against the
existing WebGL2 renderer.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- WebGPU renderer from Task 1b
- Existing spell-VFX event flow from the renderer/timeline modules

Outputs:
- WebGPU particle path for lightweight spell effects
- screenshot-comparison fixture for WebGPU vs WebGL2
- benchmark notes for 1440p rendering on a representative scene

Owned Paths:
- (none — this task does not claim filesystem ownership)

Dependencies:
- phase-3.04-polish.01b-webgpu-map-renderer-parity
- mvp.06-renderer.07-event-log-animation-timeline

Acceptance Criteria:
- WebGL2 fallback activates automatically when WebGPU is unavailable or
  initialization fails
- WebGPU particle effects render through the same event-driven
  presentation flow as WebGL2
- Benchmark output shows whether WebGPU provides a meaningful win on the
  tested scene
- Backend switching does not change gameplay or simulation timing

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
