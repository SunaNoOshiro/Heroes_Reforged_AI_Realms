# Screen 66 Architecture: Debug Overlay

System: diagnostics
Screen ID: debug-overlay
Visual Archetype: diagnostics-overlay
Curation Status: curated-pass-1

## Purpose
Developer-only diagnostics overlay. Read-only by default; replay
scrubber dispatches presentation-only commands.

## Visual Direction
- Internal developer UI. No franchise art, no curated theme.

## Visual Composition
```mermaid
flowchart TD
  Root["Debug Overlay"]
  C0["FpsCounter"]
  Root --> C0
  C1["StateHashReadout"]
  Root --> C1
  C2["CommandLogTail"]
  Root --> C2
  C3["ReplayScrubber"]
  Root --> C3
  C4["PackContentHashReadout"]
  Root --> C4
  C5["RngStreamCounters"]
  Root --> C5
```

## Build-Flag Gate
```mermaid
flowchart LR
  B0["Bundle build"] --> B1
  B1{"import.meta.env.DEV?"} -- yes --> B2["dynamic import: DebugOverlay"]
  B1 -- no --> B3["screen tree-shaken"]
  B2 --> B4["mount under z-layer 9000 portal"]
  B3 --> B5["no overlay in PROD bundle"]
```

## Subscription Cadence
```mermaid
flowchart LR
  Reducer["engine reducer (epilogue)"] --> Hash["state.debug.hash"]
  Reducer --> RngTicks["state.debug.rngTicks"]
  Reducer --> CmdLog["state.debug.recentCommands"]
  RAF["renderer rAF"] --> Fps["state.debug.fps"]
  RAF --> Tier["state.debug.frameTier"]
  Hash --> Subs["overlay selectors"]
  RngTicks --> Subs
  CmdLog --> Subs
  Fps --> Subs
  Tier --> Subs
```

## Replay Scrubber Flow
```mermaid
sequenceDiagram
  actor Dev
  participant UI as DebugOverlay
  participant Driver as Replay Driver
  participant Store as Zustand store

  Dev->>UI: Click Pause
  UI->>Driver: REPLAY_PAUSE (presentation-only)
  Driver->>Store: state.debug.replay.mode = "paused"

  Dev->>UI: Click Step
  UI->>Driver: REPLAY_STEP
  Driver->>Driver: advance one tick from command log
  Driver->>Store: state.debug.replay.tick += 1
```

## Outgoing Transitions
- None. The overlay does not navigate. Hiding it returns input to the
  underlying layer.

## State Inputs
- fps -> state.debug.fps
- frameTimeTier -> state.debug.frameTier
- stateHash -> state.debug.hash
- rngTicks -> state.debug.rngTicks
- commandLogTail -> state.debug.recentCommands
- replay -> state.debug.replay
- contentHashes -> state.content.hashes
- missingComponents -> state.debug.missingComponentCount
- viewport -> state.ui.viewport

## Implementation Contract
- Screen is dynamically imported only when `import.meta.env.DEV` is
  true. Production bundles tree-shake the screen.
- Overlay reads diagnostics state; it never mutates gameplay state.
- Replay-scrubber actions go through the replay driver, not the live
  engine.
- Z-layer 9000; non-input-blocking.
- Localization keys live under `ui.debug-overlay.*`.
