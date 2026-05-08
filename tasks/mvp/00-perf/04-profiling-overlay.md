# In-game profiling overlay (Ctrl+Shift+P)

Module: [Performance Harness & Budgets (M1)](../00-perf.md)

Description:
A dev-only profiling overlay toggled by `Ctrl+Shift+P` that surfaces
FPS, per-system CPU samples, allocations/frame, JS heap usage, AI
compute time and `nodesExpanded` for the last move, and pool
occupancy. The overlay is the in-app counterpart to the bench
harness — bench captures trends, the overlay localizes spikes to
in-game actions.

The overlay reads selectors only; it never writes engine state.
It is gated behind a build flag so it does not ship in release
bundles by default but **can** be enabled in production builds
via a URL parameter for QA / alpha testers (e.g.,
`?dev_profiler=1`).

Screen package:
[`docs/architecture/wiki/screens/68-dev-profiler/`](../../../docs/architecture/wiki/screens/68-dev-profiler/).
The five screen package files (mockup, spec, interactions,
data-contracts, architecture) are the canonical UI contract for
this task.

Read First:
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/wiki/screens/68-dev-profiler/spec.md`](../../../docs/architecture/wiki/screens/68-dev-profiler/spec.md)

Inputs:
- Renderer presentation loop frame-time samples
  (`mvp.06-renderer.08-presentation-loop-decoupled-from-sim`).
- AI worker compute time and `nodesExpanded` from
  `mvp.10-heuristic-ai.06-run-ai-in-web-worker`.
- Pool occupancy selectors from
  `mvp.00-perf.05-object-pools`.

Outputs:
- `src/ui/dev/profiler/` — overlay component and selectors.
  - `src/ui/dev/profiler/ProfilerOverlay.tsx`
  - `src/ui/dev/profiler/selectors.ts`
  - `src/ui/dev/profiler/hotkey.ts`
- Hotkey: `Ctrl+Shift+P` toggles visibility (registered via the
  hotkey registry; see
  [`ui-hotkeys.md`](../../../docs/architecture/ui-hotkeys.md)).
- Build-flag gate: `import.meta.env.DEV === true` is the default
  on; `?dev_profiler=1` URL parameter forces the overlay on in
  PROD bundles.

Owned Paths:
- `src/ui/dev/profiler/`

Dependencies:
- mvp.06-renderer.08-presentation-loop-decoupled-from-sim
- mvp.10-heuristic-ai.06-run-ai-in-web-worker
- mvp.00-perf.05-object-pools

Acceptance Criteria:
- Overlay toggles on/off with `Ctrl+Shift+P` without leaking the
  hotkey registration on unmount.
- Overlay surfaces every readout listed in
  [`68-dev-profiler/spec.md`](../../../docs/architecture/wiki/screens/68-dev-profiler/spec.md):
  FPS, per-system CPU samples, allocations/frame, JS heap, AI
  compute time + `nodesExpanded`, pool occupancy, active animation
  count.
- Overlay's own per-frame cost is **< 0.2 ms** at the Reference
  tier (verified via Scenario A bench harness with the overlay
  enabled vs disabled).
- Overlay never dispatches gameplay commands; selectors only.
- PROD bundle without `?dev_profiler=1` does not include the
  overlay (verified by bundle-analyzer or tree-shake snapshot).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
