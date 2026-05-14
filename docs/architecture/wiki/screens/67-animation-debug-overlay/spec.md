# Screen 67: Animation Debug Overlay

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Developer-only overlay surfacing the renderer's animation timelines.
Pause / step / scrub the renderer's event-log cursor without
rewinding the engine. Per-stack inspector, event-log tail,
per-sequence cue list, and degradation-tier readout. All controls
dispatch presentation-only commands against the renderer driver; the
engine reducer is never invoked. Gated behind
`import.meta.env.DEV === true` and
`config.dev.enableDebugOverlay === true` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production builds tree-shake the screen.

### Visual Direction
Internal developer UI. No franchise art, no curated theme; matches
sibling [`66-debug-overlay`](../66-debug-overlay/spec.md) styling
(panel border `#34a0ff`, monospace) for consistency.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 9000 per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Non-input-blocking overlay; toggleable via hotkey `Ctrl+Shift+~`
  per [`interactions.md`](./interactions.md).
- `mockup.html` contains visible UI only; behaviour and timing live
  in `interactions.md`.

### Component Tree
- AnimationDebugOverlay
  - PresentationControlsBar
    - PauseToggle
    - StepBackButton
    - StepForwardButton
    - ScrubBar
    - PlaybackSpeedSelect
    - HideButton
  - PerStackAnimationInspector
    - PerStackTimelineRow (renders unit, vfx, and camera rows)
  - EventLogTail
  - PerSequenceCueList
  - DegradationTierIndicator

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `animOverlayVisible` | `state.dev.animOverlayVisible` | Hotkey toggles visibility; default `false`. |
| `paused` | `state.dev.animPaused` | Toggle, default `false`. |
| `eventLogIndex` | `state.dev.eventLogIndex` | Renderer's event-log cursor; advances on play, frozen on pause. |
| `eventLogTotal` | `selectors.dev.eventLogLength` | Total events available; backs the `14823 / 32178` readout. |
| `timelineSpeed` | `state.dev.timelineSpeed` | Per-debug speed multiplier on top of `config.ui.animationSpeed` per [`animation-contract.md` § Two-Clock Model](../../../animation-contract.md#two-clock-model). |
| `activeTimelines` | `selectors.dev.activeTimelines` | Per-stack timeline list with current frame, sequence, channel; derived from the null-renderer event-log consumer. |
| `recentEvents` | `state.debug.recentCommands` | Reused from screen 66; tail of event-log entries. |
| `degradationTier` | `state.debug.frameTier` | Reused from screen 66; surfaces tier-driven anim degradation. |
| `missingRefs` | `state.dev.missingAnimRefs` | Counter of unresolved sound/vfx/status refs surfaced by the event-log consumer. |

### Mechanics Mapping
- The overlay reads the renderer's event-log cursor and reseeks it
  via `PAUSE_PRESENTATION`, `STEP_PRESENTATION_FORWARD`,
  `STEP_PRESENTATION_BACK`, `SCRUB_PRESENTATION_TO_INDEX`. Each
  command "Skips presentation only — no gameplay mutation" per
  [`interactions.md`](./interactions.md).
- Reuses the event-log consumer at
  [`src/renderer/null/event-log-consumer.mjs`](../../../../../src/renderer/null/event-log-consumer.mjs)
  to compute the inspector's per-stack timeline data.
- The overlay is a presentation-only consumer; no save/replay state
  is owned here. `state.dev.*` is non-replayed and non-hashed.

### Animation Contract
- Canonical UI surface for [`animation-contract.md`](../../../animation-contract.md).
- Reduced-motion preserves all readouts; the scrub bar disables its
  drag affordance and falls back to the step buttons.

### Acceptance Criteria
- Mockup contains every readout listed in the Component Tree.
- Spec lists every state binding under the `state.dev.*` and reused
  `state.debug.*` slices.
- Interactions document the toggle hotkey, the four scrubbing
  commands, and the build-flag gate.
- The overlay does not appear in production builds (verified by
  build-output inspection per the owning task).
- The overlay does not block input on layers below it.
- All four scrubbing commands are state-preserving by construction —
  they only reseek the renderer's event-log cursor; the engine state
  is never rewound.

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

## 🔍 Sync Check
- **UI: ✔** — Component Tree matches every `data-component` in
  `mockup.html` (PresentationControlsBar with six children including
  `HideButton`, PerStackAnimationInspector, EventLogTail,
  PerSequenceCueList, DegradationTierIndicator).
- **Schema: ✔** — bindings reuse `state.debug.*` slice already
  pinned by sibling [`66-debug-overlay/spec.md`](../66-debug-overlay/spec.md);
  `selectors.dev.activeTimelines` derived from
  [`src/renderer/null/event-log-consumer.mjs`](../../../../../src/renderer/null/event-log-consumer.mjs).
- **Tasks: ✔** — owning task
  [`tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md`](../../../../../tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md)
  enumerates the same component list under Outputs and the four
  scrubbing commands under Acceptance Criteria.
- **Siblings: ✔** — `interactions.md`, `data-contracts.md`,
  `architecture.md` aligned in this revision (see § ⚠ Issues for the
  pre-revision drift).

## ⚠ Issues
- **`HideButton` was missing from the Component Tree** despite the
  mockup rendering a `HIDE` button bound to
  `animDebugOverlay.toggleVisibility`. Added in this revision under
  PresentationControlsBar.
- **`state.dev.animOverlayVisible` and `selectors.dev.eventLogLength`
  are added here for cross-file alignment.** The interactions doc
  already exposed `animOverlayVisible` and the mockup already
  rendered the `eventLogIndex / total` ratio; both bindings are
  surfaced here for the first time. The owning task should pin them
  in [`state-shape.md`](../../../state-shape.md) before runtime
  mounting.
- **No `state.dev.*` row exists in
  [`data-inventory.md`](../../../data-inventory.md).** Correct per
  [`data-inventory.md` § 1 Inventory Table](../../../data-inventory.md#1-inventory-table)
  policy — the slice is non-persisted, non-hashed, in-memory only —
  but flagging here so future "persist debug session" features
  cannot regress it without an inventory row.
