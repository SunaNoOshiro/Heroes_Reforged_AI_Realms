# Screen 61 Architecture: AI Turn Indicator

System: system
Screen ID: ai-turn-indicator
Visual Archetype: curated-ai-turn-indicator
Curation Status: curated-pass-6

## Purpose
AI turn overlay showing active AI color, visible thinking/progress state, optional fast-forward, and turn-result messages.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["AI Turn Indicator"]
  C0["DimmedAdventureMap"]
  Root --> C0
  C1["PlayerCrest"]
  Root --> C1
  C2["ProgressBeads"]
  Root --> C2
  C3["ActivityText"]
  Root --> C3
  C4["SpeedControls"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Turn manager"] --> L1
  L1["AI command generator"] --> L2
  L2["Command replay"] --> L3
  L3["Visible actions"] --> L4
  L4["AI overlay"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Speed/complete event"] --> I1
  I1["Presentation guard"] --> I2
  I2["Replay commands"] --> I3
  I3["Turn transition"] --> I4
  I4["Human map return"]
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
  Draft->>VFX: Crest rotate
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Fade back
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["AI Turn Indicator"]
  Current --> T0["07-adventure-map"]
```

## State Inputs
- aiPlayer -> state.turn.activePlayerId
- aiPhase -> state.ai.currentPhase
- commandBatch -> state.ai.visibleCommandBatch
- speed -> config.ui.aiTurnSpeed
- interruptGuard -> selectors.ai.canFastForwardOrPause

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
