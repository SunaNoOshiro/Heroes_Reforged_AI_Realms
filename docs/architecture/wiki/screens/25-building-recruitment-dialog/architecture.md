# Screen 25 Architecture: Building / Recruitment Dialog

System: town
Screen ID: building-recruitment-dialog
Visual Archetype: curated-town-recruitment
Curation Status: curated-pass-2

## Purpose
Town dwelling recruitment dialog with creature portrait, dwelling selection, available growth, quantity controls, total cost, and destination stack preview.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Building / Recruitment Dialog"]
  C0["DwellingList"]
  Root --> C0
  C1["CreaturePortrait"]
  Root --> C1
  C2["CreatureStats"]
  Root --> C2
  C3["QuantityStepper"]
  Root --> C3
  C4["CostPanel"]
  Root --> C4
  C5["DestinationArmyPreview"]
  Root --> C5
  C6["ConfirmCancelButtons"]
  Root --> C6
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town selector"] --> L1
  L1["Dwelling stock"] --> L2
  L2["Unit registry"] --> L3
  L3["Resource selector"] --> L4
  L4["Recruitment view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Quantity input"] --> I1
  I1["Cost/capacity guard"] --> I2
  I2["RECRUIT_UNITS"] --> I3
  I3["Reducer stock/army update"] --> I4
  I4["Refresh dialog"]
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
  Draft->>VFX: Dwelling highlight
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Resource flash
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Building / Recruitment Dialog"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- town.id -> state.towns.selectedTownId
- dwelling.stock -> state.towns.byId[selected].dwellingStock
- selectedDwelling -> state.ui.town.selectedDwellingId
- recruitQuantity -> state.ui.town.recruitQuantity
- destinationArmy -> state.townRecruit.destinationArmy

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
