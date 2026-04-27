# Screen 35 Architecture: Town Flyby

System: town
Screen ID: town-flyby
Visual Archetype: curated-town-flyby
Curation Status: curated-pass-4

## Purpose
Optional cinematic town entry/faction panorama flyby before the interactive town screen appears.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Town Flyby"]
  C0["PanoramaCameraPath"]
  Root --> C0
  C1["FactionCrest"]
  Root --> C1
  C2["AssetWarmupProgress"]
  Root --> C2
  C3["SkipButton"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town selector"] --> L1
  L1["Faction assets"] --> L2
  L2["Hotspot metadata"] --> L3
  L3["Audio cue"] --> L4
  L4["Flyby view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Skip/complete"] --> I1
  I1["Asset readiness guard"] --> I2
  I2["Presentation route"] --> I3
  I3["Town screen open"] --> I4
  I4["Hotspots active"]
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
  Draft->>VFX: Letterbox in
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Town reveal
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Town Flyby"]
  Current --> T0["24-town-screen"]
  Current --> T1["24-town-screen"]
  Current --> T2["07-adventure-map"]
```

## State Inputs
- townId -> state.towns.selectedTownId
- factionId -> state.towns.byId[selected].factionId
- assetWarmup -> state.ui.assetWarmup.townScreen
- cameraPath -> selectors.presentation.townFlybyPath
- skipAvailable -> config.ui.allowSkipCinematics

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
