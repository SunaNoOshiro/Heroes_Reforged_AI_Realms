# Screen 21 Architecture: External Dwelling

System: adventure
Screen ID: external-dwelling
Visual Archetype: curated-external-dwelling
Curation Status: curated-pass-3

## Purpose
Adventure creature dwelling recruitment window for map dwellings outside towns.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["External Dwelling"]
  C0["DwellingPortrait"]
  Root --> C0
  C1["CreatureOffer"]
  Root --> C1
  C2["QuantityStepper"]
  Root --> C2
  C3["CostPreview"]
  Root --> C3
  C4["DestinationArmyRow"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Dwelling object"] --> L1
  L1["Weekly stock"] --> L2
  L2["Hero army"] --> L3
  L3["Resources"] --> L4
  L4["Recruit dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Quantity/recruit input"] --> I1
  I1["Stock/cost/capacity guard"] --> I2
  I2["Recruit command"] --> I3
  I3["Army and stock update"] --> I4
  I4["Dwelling feedback"]
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
  Draft->>VFX: Portrait breath
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Grey out
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["External Dwelling"]
  Current --> T0["07-adventure-map"]
```

## State Inputs
- dwellingId -> state.ui.adventure.pendingDwellingId
- dwellingStock -> state.mapObjects.byId[dwellingId].stock
- selectedQuantity -> state.ui.externalDwelling.quantity
- destinationArmy -> state.heroes.byId[selected].army
- costPreview -> selectors.economy.externalDwellingCost

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
