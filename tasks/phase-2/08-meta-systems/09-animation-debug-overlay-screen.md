# Animation Debug Overlay Screen

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement the developer-only animation debug overlay (screen 67) as
a post-MVP UI surface. The overlay surfaces the renderer's per-stack
timelines, event-log tail, per-sequence cue list, degradation tier,
and a presentation-only scrub bar. All controls dispatch
presentation-only commands; the engine reducer is never invoked.
Gated behind `import.meta.env.DEV` and
`config.dev.enableDebugOverlay`; production builds tree-shake it.

Read First:
- `docs/architecture/wiki/screens/67-animation-debug-overlay/spec.md`
- `docs/architecture/wiki/screens/67-animation-debug-overlay/interactions.md`
- `docs/architecture/wiki/screens/67-animation-debug-overlay/data-contracts.md`
- `docs/architecture/wiki/screens/67-animation-debug-overlay/architecture.md`
- `docs/architecture/wiki/screens/67-animation-debug-overlay/mockup.html`
- [`docs/architecture/animation-contract.md`](../../../docs/architecture/animation-contract.md)
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)

Inputs:
- Screen package `docs/architecture/wiki/screens/67-animation-debug-overlay/`
- Null renderer event-log consumer at
  `src/renderer/null/event-log-consumer.mjs`
- UI app shell, Zustand store, command hook, resolver
- `state.dev.*` slice (presentation-only, non-replayed, non-hashed)

Outputs:
- `src/ui/screens/AnimationDebugOverlay.tsx`
- `src/ui/components/animation-debug/*.tsx`
  (PresentationControlsBar, PauseToggle, StepBackButton,
  StepForwardButton, ScrubBar, PlaybackSpeedSelect,
  PerStackAnimationInspector, PerStackTimelineRow, EventLogTail,
  PerSequenceCueList, DegradationTierIndicator)
- Build-flag gate via dynamic import, only mounted when
  `import.meta.env.DEV === true` and
  `config.dev.enableDebugOverlay === true`

Owned Paths:
- `src/ui/screens/AnimationDebugOverlay.tsx`
- `src/ui/components/animation-debug/`

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay
- mvp.07-ui-shell.02-zustand-store
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render
- phase-2.08-meta-systems.08-debug-overlay-screen

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/67-animation-debug-overlay/mockup.html`, `docs/architecture/wiki/screens/67-animation-debug-overlay/spec.md`, `docs/architecture/wiki/screens/67-animation-debug-overlay/interactions.md`, and `docs/architecture/wiki/screens/67-animation-debug-overlay/data-contracts.md`
- Overlay is tree-shaken from production bundles; verified by
  inspecting the build output
- Resolver mounts every component listed in the Component Tree via
  the registry resolver; missing-component fallback is exercised in
  a unit test
- `PAUSE_PRESENTATION`, `STEP_PRESENTATION_FORWARD`,
  `STEP_PRESENTATION_BACK`, and `SCRUB_PRESENTATION_TO_INDEX`
  dispatch against the renderer driver, never the live engine
  reducer
- `state.dev.*` is non-replayed and non-hashed; mutating it does not
  change the canonical state hash
- Z-layer 9000 portal is non-input-blocking
- Each interaction token whose owning engine task is `done` MUST
  dispatch live (no stub fallback). Tokens whose owning task is
  still `planned` may render disabled with a localized reason that
  cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
