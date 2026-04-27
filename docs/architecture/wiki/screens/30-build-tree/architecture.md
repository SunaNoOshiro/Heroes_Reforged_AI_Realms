# Screen 30 Architecture: Town Hall / Build Tree

System: town
Screen ID: build-tree
Visual Archetype: curated-build-tree
Curation Status: curated-pass-2

## Purpose
Town construction graph with built, available, locked, and selected building nodes, prerequisite links, resource cost, and one-build-per-day guard.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Town Hall / Build Tree"]
  C0["BuildingGraph"]
  Root --> C0
  C1["PrerequisiteLinks"]
  Root --> C1
  C2["SelectedBuildingDetails"]
  Root --> C2
  C3["CostPanel"]
  Root --> C3
  C4["BuiltTodayPlaque"]
  Root --> C4
  C5["BuildCloseButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town buildings"] --> L1
  L1["Prerequisite graph"] --> L2
  L2["Player resources"] --> L3
  L3["Built today flag"] --> L4
  L4["Build tree view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Select node"] --> I1
  I1["Prereq/resource guard"] --> I2
  I2["BUILD_BUILDING"] --> I3
  I3["Reducer town update"] --> I4
  I4["Town panorama refresh"]
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
  Draft->>VFX: Node pulse
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Structure glow
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Town Hall / Build Tree"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- town.buildings -> state.towns.byId[selected].buildings
- availableBuildings -> state.towns.byId[selected].availableBuilds
- selectedBuilding -> state.ui.buildTree.selectedBuildingId
- player.resources -> state.players.active.resources
- builtToday -> state.towns.byId[selected].builtToday

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
