# Screen 66: Debug Overlay

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Developer-only diagnostics overlay surfacing FPS, frame-time tier,
deterministic state hash, RNG substream tick counters, command-log
tail, replay scrubber, content-pack hashes, and missing-component
counter. Gated behind `import.meta.env.DEV` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production builds tree-shake the screen.

### Visual Direction
- Internal developer UI. No franchise art, no curated theme; uses a
  dark-blue panel system distinct from gameplay chrome.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 9000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Non-input-blocking overlay. Read-only readouts plus replay-scrubber
  controls. Toggleable via hotkey (`Ctrl+~`).
- `mockup.html` contains visible UI only. Behaviour and timing live
  in `interactions.md`.

### Component Tree
- DebugOverlay
  - FpsCounter
  - StateHashReadout
  - CommandLogTail
  - ReplayScrubber
  - PackContentHashReadout
  - RngStreamCounters

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| fps | state.debug.fps | Sliding-window frame rate; UI presentation only. |
| frameTimeTier | state.debug.frameTier | Green/Amber/Orange/Red per [`renderer-technology-choice.md` § Frame-Time Budget](../../../renderer-technology-choice.md#frame-time-budget--degradation). |
| stateHash | state.debug.hash | Latest xxh64 over canonical state. |
| rngTicks | state.debug.rngTicks | Per-substream tick counters. |
| commandLogTail | state.debug.recentCommands | Most recent 20 reducer-applied commands. |
| replay | state.debug.replay | `{ tick, total, speed, mode: "live"|"replay"|"paused" }`. |
| contentHashes | state.content.hashes | Content-runtime pack hashes. |
| missingComponents | state.debug.missingComponentCount | Resolver miss counter (see [`ui-component-resolver.md`](../../../ui-component-resolver.md)). |
| viewport | state.ui.viewport | DPR, stage size, aspect (from [`ui-renderer-seam.md`](../../../ui-renderer-seam.md)). |

### Mechanics Mapping
- The overlay reads diagnostic state only. It never dispatches gameplay
  commands. Replay-scrubber actions dispatch presentation-only
  commands handled by the replay driver, never the live engine.
- The overlay is a presentation-only consumer; no save/replay state
  is owned here.

### Animation Contract
- No animations beyond the replay scrubber fill; reduced-motion
  preserves all readouts as static text.

### Acceptance Criteria
- Mockup contains every readout listed in the Component Tree.
- Spec lists every state binding under the `state.debug.*` and
  `state.content.hashes` slices.
- Interactions document the toggle hotkey, replay-scrubber actions,
  and the `import.meta.env.DEV` build-flag gate.
- The overlay does not appear in production builds.
- The overlay does not block input on layers below it.

### AI Implementation Notes
- Screen slug: `debug-overlay`; system group: `diagnostics`; curation
  marker: `curated-pass-1`.
- This is a post-MVP screen; the owning task is in
  [`tasks/phase-2/08-meta-systems/`](../../../../../tasks/phase-2/08-meta-systems/).
- All controls dispatch through the command hook with explicit
  `replay`-namespaced commands; do not mutate gameplay state from the
  overlay.
- Build runtime components from this package contract; do not add
  panels not listed in the Component Tree.
