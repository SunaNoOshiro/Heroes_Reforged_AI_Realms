# Screen 27 Architecture: Thieves Guild

System: town
Screen ID: thieves-guild
Visual Archetype: curated-thieves-guild
Curation Status: curated-pass-2

## Purpose
Information ranking screen showing opponents, towns, heroes, resources, artifacts, army strength, and intelligence columns allowed by guild access.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Thieves Guild"]
  C0["PlayerBannerRows"]
  Root --> C0
  C1["IntelligenceColumns"]
  Root --> C1
  C2["CoveredCells"]
  Root --> C2
  C3["RankSortHeader"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Player records"] --> L1
  L1["Guild access"] --> L2
  L2["Visibility rules"] --> L3
  L3["Ranking selectors"] --> L4
  L4["Thieves guild view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Column/row input"] --> I1
  I1["Visibility guard"] --> I2
  I2["Local sort/select"] --> I3
  I3["No gameplay reducer"] --> I4
  I4["Refresh table"]
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
  Draft->>VFX: Column reveal
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Close fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Thieves Guild"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- players -> state.players.all
- intelligenceLevel -> state.townServices.thievesGuildLevel
- rankings -> state.intelligence.rankings
- selectedPlayer -> state.ui.thievesGuild.selectedPlayerId

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
