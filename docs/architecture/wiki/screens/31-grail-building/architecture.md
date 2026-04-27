# Screen 31 Architecture: Grail Building

System: town
Screen ID: grail-building
Visual Archetype: curated-grail-building
Curation Status: curated-pass-4

## Purpose
Town grail construction ceremony after a hero brings the grail to a valid town.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Grail Building"]
  C0["RelicPedestal"]
  Root --> C0
  C1["WonderPreview"]
  Root --> C1
  C2["TownBonusList"]
  Root --> C2
  C3["ConfirmBuildButton"]
  Root --> C3
  C4["CeremonyVfx"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town selector"] --> L1
  L1["Visiting hero"] --> L2
  L2["Grail state"] --> L3
  L3["Faction wonder"] --> L4
  L4["Grail ceremony"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Build click"] --> I1
  I1["Ownership/grail guard"] --> I2
  I2["Build command"] --> I3
  I3["Town bonuses"] --> I4
  I4["Town refresh"]
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
  Draft->>VFX: Relic rise
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Hotspot pulse
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Grail Building"]
  Current --> T0["24-town-screen"]
  Current --> T1["24-town-screen"]
```

## State Inputs
- townId -> state.towns.selectedTownId
- deliveringHero -> state.adventure.visitingHeroId
- grailRecord -> state.scenario.grail
- wonderDefinition -> selectors.towns.factionGrailBuilding
- bonusPreview -> selectors.towns.grailBonusPreview

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
