# Screen 22 Architecture: Garrison Structure

System: adventure
Screen ID: garrison-structure
Visual Archetype: curated-garrison-structure
Curation Status: curated-pass-3

## Purpose
Adventure garrison transfer screen for moving stacks between visiting hero and standalone garrison structure.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Garrison Structure"]
  C0["HeroArmyRow"]
  Root --> C0
  C1["GarrisonArmyRow"]
  Root --> C1
  C2["StackDragLayer"]
  Root --> C2
  C3["TransferControls"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero army"] --> L1
  L1["Garrison army"] --> L2
  L2["Ownership rules"] --> L3
  L3["Transfer rules"] --> L4
  L4["Garrison UI"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Drag/drop input"] --> I1
  I1["Transfer legality guard"] --> I2
  I2["Transfer command"] --> I3
  I3["Reducer updates armies"] --> I4
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
  Current["Garrison Structure"]
  Current --> T0["51-split-stack-dialog"]
  Current --> T1["07-adventure-map"]
```

## State Inputs
- heroArmy -> state.heroes.byId[selected].army
- garrisonArmy -> state.mapObjects.byId[garrisonId].army
- selectedStack -> state.ui.garrisonTransfer.selectedStackRef
- transferRules -> selectors.armies.garrisonTransferRules
- splitDraft -> state.ui.garrisonTransfer.splitQuantity

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
