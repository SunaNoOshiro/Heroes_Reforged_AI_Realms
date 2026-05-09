# Presentation Loop Decoupled from Sim

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
- Stopping the loop (page hide, component unmount) does not leak
  the animation frame handle. **This is automated by Scenario D
  (memory churn) in
  `mvp.00-perf.03-memory-regression-gate`** — the manual
  acceptance becomes a CI assertion against a +5 % heap-delta
  ceiling.
- Snapshot reads are never blocking (no `await` inside rAF)
- Per-frame render budget conforms to the per-system CPU table
  in
  [`docs/architecture/performance.md` § 2](../../../docs/architecture/performance.md#2-per-frame-cpu-budget):
  `renderer.cull + draw` ≤ 4 ms,
  `renderer.animationTick` ≤ 1 ms at the Reference tier.

### Rehydration Mode (save / load)

When a save loads, the engine replays the command log silently to
the saved offset. During replay-time event emission the animation
scheduler is skipped:

- Re-emitted events from replay execute synchronously and do not
  enqueue animation timeline entries.
- The animation timeline starts empty after `load()` completes
  (no in-flight animations).
- The first *post*-load command schedules animations normally.

Cross-cutting framing in
[`docs/architecture/edge-cases-policy.md` § 8](../../../docs/architecture/edge-cases-policy.md#8-save-gating-q212).

### Visibility Hooks

The render loop participates in the canonical visibility policy
([`docs/architecture/visibility-policy.md`](../../../docs/architecture/visibility-policy.md)):

- **Audio mute hook.** On `visibilitychange:hidden`, mute audio;
  on `:visible`, restore audio gain.
- **Autosave flush hook.** On `:hidden`, fire a best-effort
  tab-resume autosave (synchronous IDB write where possible,
  wrapped in a 50 ms timeout). The persistence task owns the
  actual write; this loop owns the dispatch hook.
- **rAF cleanup.** The existing rAF cleanup remains; restart only
  on `:visible`.
- **Resume reconciliation.** On `:visible`, request the peer
  state-hash comparison from the multiplayer transport; if
  hashes match, resume normally; otherwise treat as desync and
  trigger the reconnection flow.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
