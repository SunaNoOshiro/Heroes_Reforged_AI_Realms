# Screen 67: Animation Debug Overlay

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Developer-only overlay surfacing the renderer's animation timelines.
Pause / step-back / step-forward / scrub through the event log
without rewinding the engine. Per-stack animation state inspector and
event-log tail. All controls dispatch presentation-only commands —
the engine state is never altered. Gated behind
`config.dev.enableDebugOverlay` and `import.meta.env.DEV` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production builds tree-shake the screen.

### Visual Direction
- Internal developer UI. No franchise art, no curated theme; matches
  screen 66 (debug-overlay) styling for consistency.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 9000 per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Non-input-blocking overlay. Toggleable via hotkey (`Ctrl+Shift+~`).
- `mockup.html` contains visible UI only. Behaviour and timing live
  in `interactions.md`.

### Component Tree
- AnimationDebugOverlay
  - PresentationControlsBar
    - PauseToggle
    - StepBackButton
    - StepForwardButton
    - ScrubBar
    - PlaybackSpeedSelect
  - PerStackAnimationInspector
    - PerStackTimelineRow
  - EventLogTail
  - PerSequenceCueList
  - DegradationTierIndicator

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| paused | state.dev.animPaused | Toggle, default false. |
| eventLogIndex | state.dev.eventLogIndex | Renderer's event-log cursor; advances on play, frozen on pause. |
| timelineSpeed | state.dev.timelineSpeed | Per-debug speed multiplier on top of `config.ui.animationSpeed`. |
| activeTimelines | selectors.dev.activeTimelines | Per-stack timeline list with current frame, sequence, channel. |
| recentEvents | state.debug.recentCommands | Reused from screen 66; tail of event-log entries. |
| degradationTier | state.debug.frameTier | Reused from screen 66; surfaces tier-driven anim degradation. |
| missingRefs | state.dev.missingAnimRefs | Counter of unresolved sound/vfx/status refs surfaced by the null-renderer-style consumer. |

### Mechanics Mapping
- The overlay reads the renderer's event-log cursor and writes to it
  via `PAUSE_PRESENTATION`, `STEP_PRESENTATION_FORWARD`,
  `STEP_PRESENTATION_BACK`, `SCRUB_PRESENTATION_TO_INDEX`. Each
  command "Skips presentation only — no gameplay mutation" per
  [`interactions.md`](./interactions.md).
- Reuses the event-log consumer from
  [`src/renderer/null/event-log-consumer.mjs`](../../../../../src/renderer/null/event-log-consumer.mjs)
  to compute the inspector's per-stack timeline data.
- The overlay is a presentation-only consumer; no save/replay state
  is owned here.

### Animation Contract
- The overlay is the canonical UI surface for the contract pinned in
  [`docs/architecture/animation-contract.md`](../../../animation-contract.md).
- Reduced-motion preserves all readouts; the scrub bar disables its
  drag affordance and falls back to step-buttons-only.

### Acceptance Criteria
- Mockup contains every readout listed in the Component Tree.
- Spec lists every state binding under the `state.dev.*` slice.
- Interactions document the toggle hotkey, the four scrubbing
  commands, and the build-flag gate.
- The overlay does not appear in production builds.
- The overlay does not block input on layers below it.
- All four scrubbing commands are state-preserving by construction
  (they only reseek the renderer's event-log cursor; the engine state
  is never rewound).

### AI Implementation Notes
- Screen slug: `animation-debug-overlay`; system group: `diagnostics`;
  curation marker: `curated-pass-1`.
- Sibling to screen 66 (debug-overlay); reuse styling and hotkey
  policy where possible.
- All controls dispatch through the command hook with explicit
  `dev.presentation`-namespaced commands; do not mutate gameplay
  state from the overlay.
- Build runtime components from this package contract; do not add
  panels not listed in the Component Tree.
