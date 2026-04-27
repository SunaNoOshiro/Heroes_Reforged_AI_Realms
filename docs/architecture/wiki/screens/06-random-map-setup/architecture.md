# Screen 06 Architecture: Random Map Generator Settings

System: menus
Screen ID: random-map-setup
Visual Archetype: curated-rmg-setup
Curation Status: curated-pass-6

## Purpose
Random map generator setup for size, template, players, zones, water, monsters, teams, seed, and victory options.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Random Map Generator Settings"]
  C0["TemplateList"]
  Root --> C0
  C1["SizeDifficultyControls"]
  Root --> C1
  C2["PlayerTeamMatrix"]
  Root --> C2
  C3["SeedField"]
  Root --> C3
  C4["ZonePreview"]
  Root --> C4
  C5["GenerateBackButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["RMG templates"] --> L1
  L1["Pack constraints"] --> L2
  L2["Ruleset"] --> L3
  L3["Draft options"] --> L4
  L4["RMG setup"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Option/generate input"] --> I1
  I1["Template validation"] --> I2
  I2["Seeded generation"] --> I3
  I3["Loading route"] --> I4
  I4["Scenario record"]
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
  Draft->>VFX: Slider notch
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Progress fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Random Map Generator Settings"]
  Current --> T0["59-loading-screen"]
  Current --> T1["02-new-game-setup"]
```

## State Inputs
- templateId -> state.ui.rmg.templateId
- mapSize -> state.ui.rmg.mapSize
- players -> state.ui.rmg.players
- seed -> state.ui.rmg.seed
- zonePreview -> selectors.rmg.templateZonePreview

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
