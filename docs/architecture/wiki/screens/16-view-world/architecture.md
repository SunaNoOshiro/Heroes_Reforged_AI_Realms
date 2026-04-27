# Screen 16 Architecture: View World

System: adventure
Screen ID: view-world
Visual Archetype: curated-view-world
Curation Status: curated-pass-3

## Purpose
Full-world overview for View Air/View Earth style spells and strategic map scanning.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["View World"]
  C0["WorldMapCanvas"]
  Root --> C0
  C1["FogMaskLegend"]
  Root --> C1
  C2["LayerTabs"]
  Root --> C2
  C3["ObjectPins"]
  Root --> C3
  C4["FocusPlaque"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Spell context"] --> L1
  L1["Fog rules"] --> L2
  L2["Object selectors"] --> L3
  L3["Layer filter"] --> L4
  L4["World overview"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Pin/layer input"] --> I1
  I1["Visibility guard"] --> I2
  I2["Local focus"] --> I3
  I3["Optional camera route"] --> I4
  I4["Caller return"]
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
  Draft->>VFX: Fog part
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Camera zoom
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["View World"]
  Current --> T0["07-adventure-map"]
  Current --> T1["07-adventure-map or 47-spell-book"]
```

## State Inputs
- spellContext -> state.ui.viewWorld.spellContext
- visibleWorld -> selectors.spells.viewWorldVisibleObjects
- selectedFocus -> state.ui.viewWorld.selectedObjectId
- activeLayer -> state.adventure.activeLayer
- manaPreview -> selectors.spells.viewWorldManaCost

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
