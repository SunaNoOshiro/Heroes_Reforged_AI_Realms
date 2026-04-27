# Screen 24 Architecture: Town Screen

System: town
Screen ID: town-screen
Visual Archetype: curated-town
Curation Status: anchor-v1

## Purpose
Town management panorama with clickable building hotspots, town/visiting hero armies, construction state, recruit/service entry points, resources, and exit back to adventure.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Town Screen"]
  C0["TownPanorama"]
  Root --> C0
  C1["BuildingHotspots"]
  Root --> C1
  C2["TownHeader"]
  Root --> C2
  C3["TownGarrisonRow"]
  Root --> C3
  C4["VisitingHeroRow"]
  Root --> C4
  C5["ServiceButtons"]
  Root --> C5
  C6["BuildStatePlaque"]
  Root --> C6
  C7["ResourceDateBar"]
  Root --> C7
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town selector"] --> L1
  L1["Building registry"] --> L2
  L2["Hero/town garrisons"] --> L3
  L3["Service availability"] --> L4
  L4["Town view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Building/service click"] --> I1
  I1["Availability guard"] --> I2
  I2["Route or command"] --> I3
  I3["Reducer"] --> I4
  I4["Refresh town"]
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
  Draft->>VFX: Hotspot glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Army snap
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Town Screen"]
  Current --> T0["30-build-tree"]
  Current --> T1["25-building-recruitment-dialog"]
  Current --> T2["29-mage-guild"]
  Current --> T3["07-adventure-map"]
```

## State Inputs
- town.id -> state.towns.selectedTownId
- town.buildings -> state.towns.byId[selected].buildings
- dailyBuild -> state.towns.byId[selected].builtToday
- garrison -> state.towns.byId[selected].garrison
- visitingHero -> state.adventure.visitingHeroId

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
