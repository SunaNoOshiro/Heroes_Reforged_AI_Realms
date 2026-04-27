# Screen 05 Architecture: Intro / Outro Cinematics

System: menus
Screen ID: intro-cinematic
Visual Archetype: curated-cinematic
Curation Status: curated-pass-6

## Purpose
Presentation-only cinematic playback shell for intro, outro, credits, victory, defeat, and campaign story clips.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Intro / Outro Cinematics"]
  C0["FrameViewport"]
  Root --> C0
  C1["SubtitleStrip"]
  Root --> C1
  C2["TimelineBeads"]
  Root --> C2
  C3["SkipButton"]
  Root --> C3
  C4["CompletionRouter"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Cinematic manifest"] --> L1
  L1["Subtitle localization"] --> L2
  L2["Audio manifest"] --> L3
  L3["Return route"] --> L4
  L4["Player"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Skip/complete"] --> I1
  I1["Route guard"] --> I2
  I2["Presentation event"] --> I3
  I3["Destination route"] --> I4
  I4["Caller screen"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: Frame crossfade
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Route fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Intro / Outro Cinematics"]
  Current --> T0["Configured destination"]
  Current --> T1["Configured destination"]
```

## State Inputs
- cinematicId -> state.ui.cinematic.cinematicId
- playbackState -> state.ui.cinematic.playback
- subtitles -> localization.cinematics[cinematicId]
- skipAllowed -> config.ui.allowSkipCinematics
- destination -> state.ui.cinematic.returnRoute

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
