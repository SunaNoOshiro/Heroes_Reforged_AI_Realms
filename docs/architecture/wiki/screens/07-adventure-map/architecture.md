# Screen 07 Architecture: Adventure Map

System: adventure
Screen ID: adventure-map
Visual Archetype: curated-adventure-map
Curation Status: anchor-v1

## Purpose
Primary strategic map with terrain viewport, fog of war, object interaction, hero path preview, minimap, army/hero sidebars, resources, and date.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Adventure Map"]
  C0["MapViewport"]
  Root --> C0
  C1["FogMask"]
  Root --> C1
  C2["PathPreview"]
  Root --> C2
  C3["ObjectLayer"]
  Root --> C3
  C4["RightCommandPanel"]
  Root --> C4
  C5["MiniMap"]
  Root --> C5
  C6["HeroArmyPanel"]
  Root --> C6
  C7["ResourceDateBar"]
  Root --> C7
  C8["StatusLine"]
  Root --> C8
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Scenario map"] --> L1
  L1["Fog visibility"] --> L2
  L2["Hero/town selectors"] --> L3
  L3["Asset resolver"] --> L4
  L4["Adventure view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Tile click"] --> I1
  I1["Pathfinder preview"] --> I2
  I2["Move command"] --> I3
  I3["Reducer"] --> I4
  I4["Fog/object result"]
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
  Draft->>VFX: Path pulse
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Status line
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Adventure Map"]
  Current --> T0["Current screen or object dialog"]
  Current --> T1["24-town-screen"]
  Current --> T2["17-adventure-spell-targeting"]
  Current --> T3["Current screen or AI turn indicator"]
```

## State Inputs
- map.tiles -> state.adventure.visibleTiles
- selectedHero -> state.adventure.selectedHeroId
- pathPreview -> state.ui.adventure.pathPreview
- resources -> state.players.active.resources
- date -> state.calendar.currentDate

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
