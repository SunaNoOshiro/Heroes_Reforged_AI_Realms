# Screen 67 Architecture: Animation Debug Overlay

System: diagnostics
Screen ID: animation-debug-overlay
Visual Archetype: diagnostics-overlay
Curation Status: curated-pass-1

## Purpose
Developer-only animation-timeline inspector. Pause / step / scrub the
renderer's event-log cursor without affecting engine state. Reuses
the null-renderer event-log consumer to compute the per-stack
inspector data.

## Visual Direction
- Internal developer UI. Matches screen 66 (debug-overlay) styling.

## Visual Composition
```mermaid
flowchart TD
  Root["Animation Debug Overlay"]
  C0["PresentationControlsBar"]
  Root --> C0
  C1["PerStackAnimationInspector"]
  Root --> C1
  C2["EventLogTail"]
  Root --> C2
  C3["PerSequenceCueList"]
  Root --> C3
  C4["DegradationTierIndicator"]
  Root --> C4
```

## Build-Flag Gate
```mermaid
flowchart LR
  B0["Bundle build"] --> B1
  B1{"import.meta.env.DEV?"} -- yes --> B2{"config.dev.enableDebugOverlay?"}
  B1 -- no --> B3["screen tree-shaken"]
  B2 -- yes --> B4["dynamic import: AnimationDebugOverlay"]
  B2 -- no --> B5["overlay does not mount"]
  B4 --> B6["mount under z-layer 9000 portal"]
```

## Presentation Loop Interaction With Event Log
```mermaid
flowchart LR
  Engine["engine reducer"] --> Log["event log"]
  Log --> Cursor["state.dev.eventLogIndex"]
  Cursor --> Consumer["null-renderer event-log consumer"]
  Consumer --> Trace["AnimationTrace<br/>(timelines + cues + warnings)"]
  Trace --> Inspector["PerStackAnimationInspector"]
  Trace --> CueList["PerSequenceCueList"]
  Trace --> Refs["state.dev.missingAnimRefs"]
  Cursor --> Renderer["WebGL2 renderer"]
  Renderer --> Frame["frame draw"]
```

## Scrubbing Flow
```mermaid
sequenceDiagram
  actor Dev
  participant UI as AnimationDebugOverlay
  participant Driver as Renderer Driver
  participant Cursor as state.dev.eventLogIndex
  participant Consumer as Event-Log Consumer

  Dev->>UI: Click Pause
  UI->>Driver: PAUSE_PRESENTATION
  Driver->>Cursor: state.dev.animPaused = true

  Dev->>UI: Drag scrubber to index N
  UI->>Driver: SCRUB_PRESENTATION_TO_INDEX { index: N }
  Driver->>Cursor: state.dev.eventLogIndex = N
  Driver->>Consumer: consumeEventLog(events[0..N], registries)
  Consumer-->>Driver: AnimationTrace
  Driver->>Cursor: state.dev.activeTimelines = trace.timelines
```

## Outgoing Transitions
- None. The overlay does not navigate. Hiding it returns input to the
  underlying layer.

## State Inputs
- paused -> state.dev.animPaused
- eventLogIndex -> state.dev.eventLogIndex
- timelineSpeed -> state.dev.timelineSpeed
- activeTimelines -> selectors.dev.activeTimelines
- recentEvents -> state.debug.recentCommands
- degradationTier -> state.debug.frameTier
- missingRefs -> state.dev.missingAnimRefs

## Implementation Contract
- Screen is dynamically imported only when `import.meta.env.DEV` is
  true and `config.dev.enableDebugOverlay` is true.
- Overlay reads diagnostics state and the renderer cursor; it never
  mutates gameplay state.
- All four scrubbing commands go through the renderer driver, not
  the live engine.
- Z-layer 9000; non-input-blocking.
- Localization keys live under `ui.animation-debug-overlay.*`.
- Reuses the event-log consumer at
  [`src/renderer/null/event-log-consumer.mjs`](../../../../../src/renderer/null/event-log-consumer.mjs)
  to compute inspector data.
