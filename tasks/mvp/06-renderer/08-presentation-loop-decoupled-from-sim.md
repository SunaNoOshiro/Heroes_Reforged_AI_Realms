# Presentation Loop Decoupled from Sim

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
The presentation loop runs at 60 fps via `requestAnimationFrame`. It must NEVER mutate sim state. It reads from a snapshot (immutable copy of the latest sim state) that the UI layer pushes into the renderer via a shared ref. The sim can update asynchronously; the renderer just draws whatever snapshot it currently holds.

Read First:
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- `GameStateSnapshot` (immutable shallow clone for rendering)
- All prior renderer tasks

Outputs:
- `src/renderer/render-loop.ts`
- `startRenderLoop(gl, getSnapshot: () => GameStateSnapshot): () => void` (returns stop function)
- Snapshot pointer updated by React via `useEffect` ref, never from inside the loop
- Animation timeline ticked with delta time each frame

Why this is risky: It's easy to accidentally call sim functions from inside rAF. Any such call breaks determinism and causes bugs that only appear at specific frame rates.

Owned Paths:
- `src/renderer/render-loop.ts`

Dependencies:
- mvp.06-renderer.03-map-renderer-terrain-objects-units-layers
- mvp.06-renderer.05-1115-tactical-battlefield-renderer
- mvp.06-renderer.07-event-log-animation-timeline

Acceptance Criteria:
- Profiling shows zero calls into `src/engine` modules from inside the rAF callback
- Renderer keeps running at 60 fps even if sim is paused (no AI move in progress)
- Stopping the loop (page hide, component unmount) does not leak the animation frame handle
- Snapshot reads are never blocking (no `await` inside rAF)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
