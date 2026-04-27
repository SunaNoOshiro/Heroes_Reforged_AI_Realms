# Screen 51 Architecture: Split Stack Dialog

System: hero
Screen ID: split-stack-dialog
Visual Archetype: curated-split-stack
Curation Status: curated-pass-5

## Purpose
Army stack split dialog used by hero screen, town garrison, hero meeting, and garrison structures.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Split Stack Dialog"]
  C0["SourceStackPreview"]
  Root --> C0
  C1["QuantitySlider"]
  Root --> C1
  C2["AmountStepper"]
  Root --> C2
  C3["DestinationPreview"]
  Root --> C3
  C4["ConfirmCancelButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Caller stack refs"] --> L1
  L1["Army state"] --> L2
  L2["Destination slot"] --> L3
  L3["Split rules"] --> L4
  L4["Split dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Quantity/OK input"] --> I1
  I1["Split guard"] --> I2
  I2["Split command"] --> I3
  I3["Army slots update"] --> I4
  I4["Caller refresh"]
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
  Draft->>VFX: Knob tick
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Snap back
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Split Stack Dialog"]
  Current --> T0["Previous screen"]
  Current --> T1["Previous screen"]
```

## State Inputs
- sourceStack -> state.ui.splitStack.sourceStackRef
- destinationSlot -> state.ui.splitStack.destinationSlotRef
- quantity -> state.ui.splitStack.quantity
- splitGuard -> selectors.armies.splitStackGuard
- caller -> state.ui.splitStack.returnScreen

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
