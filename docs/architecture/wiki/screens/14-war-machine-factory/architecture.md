# Screen 14 Architecture: War Machine Factory

System: adventure
Screen ID: war-machine-factory
Visual Archetype: curated-war-machine-factory
Curation Status: curated-pass-3

## Purpose
Adventure shop for buying ballista, ammo cart, first aid tent, or catapult-related war machine services where rules allow.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["War Machine Factory"]
  C0["MachineBayGrid"]
  Root --> C0
  C1["HeroMachineRack"]
  Root --> C1
  C2["PriceLedger"]
  Root --> C2
  C3["BuyButton"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Factory object"] --> L1
  L1["Hero machine slots"] --> L2
  L2["Shop stock"] --> L3
  L3["Gold selector"] --> L4
  L4["Factory shop view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Machine input"] --> I1
  I1["Affordability guard"] --> I2
  I2["Purchase command"] --> I3
  I3["Reducer updates hero"] --> I4
  I4["Sold stamp"]
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
  Draft->>VFX: Bay glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Machine slide
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["War Machine Factory"]
  Current --> T0["07-adventure-map"]
```

## State Inputs
- shopStock -> state.mapObjects.byId[factoryId].warMachineStock
- heroMachines -> state.heroes.byId[selected].warMachines
- selectedMachine -> state.ui.warMachineFactory.selectedMachineId
- price -> selectors.economy.selectedWarMachinePrice
- resources -> state.players.active.resources.gold

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
