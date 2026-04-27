# Screen 15 Architecture: Underground Layer Toggle

System: adventure
Screen ID: underground-toggle
Visual Archetype: curated-layer-toggle
Curation Status: curated-pass-3

## Purpose
Adventure map layer switcher for surface and underground views, including gate focus and known subterranean entrance state.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Underground Layer Toggle"]
  C0["SurfacePreview"]
  Root --> C0
  C1["UndergroundPreview"]
  Root --> C1
  C2["GateMarkerList"]
  Root --> C2
  C3["LayerLever"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Scenario layers"] --> L1
  L1["Active layer"] --> L2
  L2["Known gates"] --> L3
  L3["Camera selector"] --> L4
  L4["Layer toggle view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Layer/gate input"] --> I1
  I1["Layer availability guard"] --> I2
  I2["Set layer or focus"] --> I3
  I3["Camera update"] --> I4
  I4["Map render"]
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
  Draft->>VFX: Vertical wipe
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Map settle
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Underground Layer Toggle"]
  Current --> T0["07-adventure-map"]
  Current --> T1["07-adventure-map"]
  Current --> T2["07-adventure-map"]
  Current --> T3["07-adventure-map"]
```

## State Inputs
- activeLayer -> state.adventure.activeLayer
- hasUnderground -> state.scenario.layers.underground.enabled
- knownGates -> selectors.adventure.knownSubterraneanGates
- selectedGate -> state.ui.layerToggle.selectedGateId
- cameraFocus -> state.adventure.camera

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
