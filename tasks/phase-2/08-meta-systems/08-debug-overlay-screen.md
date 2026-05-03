# Debug Overlay Screen

Status: planned

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement the developer-only debug overlay screen package as a
post-MVP UI surface. The overlay surfaces FPS, frame-time tier,
state hash, RNG substream tick counters, command-log tail, replay
scrubber, content-pack hashes, and resolver-miss counter. The screen
is gated behind `import.meta.env.DEV`; production builds tree-shake
it.

Read First:
- `docs/architecture/wiki/screens/66-debug-overlay/spec.md`
- `docs/architecture/wiki/screens/66-debug-overlay/interactions.md`
- `docs/architecture/wiki/screens/66-debug-overlay/data-contracts.md`
- `docs/architecture/wiki/screens/66-debug-overlay/architecture.md`
- `docs/architecture/wiki/screens/66-debug-overlay/mockup.html`
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- [`docs/architecture/ui-frame-lag-contract.md`](../../../docs/architecture/ui-frame-lag-contract.md)

Inputs:
- Screen package `docs/architecture/wiki/screens/66-debug-overlay/`
- UI app shell, Zustand store, command hook, resolver
- Replay driver from `mvp.01-engine-core` replay API
- `state.debug.*` slice (presentation-only, non-replayed, non-hashed)

Outputs:
- `src/ui/screens/DebugOverlay.tsx`
- `src/ui/components/debug/*.tsx` (FpsCounter, StateHashReadout,
  CommandLogTail, ReplayScrubber, PackContentHashReadout,
  RngStreamCounters)
- Build-flag gate via dynamic import, only mounted when
  `import.meta.env.DEV === true`

Owned Paths:
- `src/ui/screens/DebugOverlay.tsx`
- `src/ui/components/debug/`

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay
- mvp.07-ui-shell.02-zustand-store
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/66-debug-overlay/mockup.html`, `docs/architecture/wiki/screens/66-debug-overlay/spec.md`, `docs/architecture/wiki/screens/66-debug-overlay/interactions.md`, and `docs/architecture/wiki/screens/66-debug-overlay/data-contracts.md`
- Overlay is tree-shaken from production bundles; verified by
  inspecting the build output
- Resolver mounts every component listed in the Component Tree via
  the registry resolver; missing-component fallback is exercised in a
  unit test
- Replay scrubber dispatches `REPLAY_PAUSE`, `REPLAY_STEP`,
  `REPLAY_RESET` against the replay driver, never the live engine
  reducer
- `state.debug.*` is non-replayed and non-hashed; mutating it does
  not change the canonical state hash
- Z-layer 9000 portal is non-input-blocking
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
