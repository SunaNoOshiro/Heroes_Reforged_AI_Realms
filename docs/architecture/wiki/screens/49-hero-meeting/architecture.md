# Screen 49 Architecture: Hero Meeting

System: hero
Screen ID: hero-meeting
Visual Archetype: curated-hero-meeting
Curation Status: curated-pass-5

## Purpose
Two friendly heroes meeting on the adventure map to exchange troops, artifacts, and war machines.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Hero Meeting"]
  C0["LeftHeroPanel"]
  Root --> C0
  C1["RightHeroPanel"]
  Root --> C1
  C2["ArmyTransferRows"]
  Root --> C2
  C3["ArtifactTransferStrips"]
  Root --> C3
  C4["DragLayer"]
  Root --> C4
  C5["CloseButton"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Meeting trigger"] --> L1
  L1["Left hero"] --> L2
  L2["Right hero"] --> L3
  L3["Transfer rules"] --> L4
  L4["Meeting view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Drag/drop input"] --> I1
  I1["Ownership/capacity guard"] --> I2
  I2["Transfer command"] --> I3
  I3["Hero records update"] --> I4
  I4["Slot feedback"]
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
  Draft->>VFX: Drag ghost
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Snap back
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Hero Meeting"]
  Current --> T0["07-adventure-map"]
```

## State Inputs
- leftHero -> state.ui.heroMeeting.leftHeroId
- rightHero -> state.ui.heroMeeting.rightHeroId
- leftArmy -> state.heroes.byId[left].army
- rightArmy -> state.heroes.byId[right].army
- dragDraft -> state.ui.heroMeeting.dragDraft

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
