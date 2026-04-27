# Screen 33 Architecture: Shipyard

System: town
Screen ID: shipyard
Visual Archetype: curated-shipyard
Curation Status: curated-pass-4

## Purpose
Town or adventure shipyard service for purchasing a boat at an adjacent valid water tile.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Shipyard"]
  C0["DockPreview"]
  Root --> C0
  C1["BoatSpawnTile"]
  Root --> C1
  C2["CostLedger"]
  Root --> C2
  C3["BlockedTileWarning"]
  Root --> C3
  C4["BuildBoatButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Shipyard source"] --> L1
  L1["Adjacent water tiles"] --> L2
  L2["Boat occupancy"] --> L3
  L3["Resources"] --> L4
  L4["Shipyard view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Tile/build input"] --> I1
  I1["Spawn/cost guard"] --> I2
  I2["Build boat command"] --> I3
  I3["Boat entity created"] --> I4
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
  Draft->>VFX: Crane swing
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Water ripple
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Shipyard"]
  Current --> T0["24-town-screen or 07-adventure-map"]
  Current --> T1["24-town-screen or 07-adventure-map"]
```

## State Inputs
- shipyardId -> state.ui.shipyard.sourceId
- spawnTiles -> selectors.towns.shipyardBoatSpawnTiles
- selectedTile -> state.ui.shipyard.selectedSpawnTile
- cost -> selectors.economy.shipyardBoatCost
- resources -> state.players.active.resources

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
