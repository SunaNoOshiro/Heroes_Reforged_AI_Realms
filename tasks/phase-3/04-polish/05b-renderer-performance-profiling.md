# Renderer Performance Profiling

Module: [Polish (M7)](../04-polish.md)

Description:
Profile WebGL2/WebGPU rendering after the renderer, visual-fidelity, and
WebGPU polish tasks are available. Focus on draw-call count, layer
composition, animation playback, particles, and frame-time stability.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- MVP renderer module
- Phase-2 visual-fidelity renderer primitives
- WebGPU adapter, parity renderer, particles, fallback, and benchmark tasks

Outputs:
- Renderer performance report appended to `docs/planning/perf-baseline.md`
- Fixes for the top renderer bottleneck found by profiling
- Before/after frame-time, draw-call, and memory numbers for adventure
  and battle scenes

Owned Paths (shared):
- `src/renderer/` (no exclusive output — additive profiling-driven tweaks only; renderer primitives are owned by `mvp.06-renderer.*` and `phase-2.06-visual-fidelity.*`)
- `resources/packs/` (asset-tuning only; pack contracts owned by `mvp.02b-asset-pipeline.*`)
- `docs/planning/perf-baseline.md` (append-only profiling log shared with the other 05* profiling tasks)

Dependencies:
- module:mvp.06-renderer
- module:phase-2.06-visual-fidelity
- phase-3.04-polish.01c-webgpu-particles-fallback-and-benchmark

Acceptance Criteria:
- Adventure map holds 60 fps on Intel MacBook Pro 2019 target hardware
  or records the exact remaining bottleneck and follow-up owner
- Battle scene holds 60 fps with 14 stacks animating simultaneously, or
  records the exact remaining bottleneck and follow-up owner
- Fix is additive to renderer backend contracts and must not rewrite
  renderer primitives owned by MVP/phase-2 primary owner tasks
- Missing presentation assets continue to use resolver fallback; no
  gameplay record gains raw asset paths
- Before/after frame-time, draw-call count, and heap numbers are
  recorded in `docs/planning/perf-baseline.md`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
