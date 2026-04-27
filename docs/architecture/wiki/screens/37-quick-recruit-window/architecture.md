# Screen 37 Architecture: Quick Recruit Window

System: town
Screen ID: quick-recruit-window
Visual Archetype: curated-quick-recruit
Curation Status: curated-pass-4

## Purpose
Condensed town-wide recruitment window for buying available creatures across all built dwellings in one pass.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Quick Recruit Window"]
  C0["DwellingRecruitRows"]
  Root --> C0
  C1["SelectionCheckboxes"]
  Root --> C1
  C2["TotalCostFooter"]
  Root --> C2
  C3["DestinationArmyPreview"]
  Root --> C3
  C4["RecruitAllButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town dwellings"] --> L1
  L1["Creature stock"] --> L2
  L2["Destination army"] --> L3
  L3["Resources"] --> L4
  L4["Quick recruit view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Checkbox input"] --> I1
  I1["Row/cost guards"] --> I2
  I2["Recruit command"] --> I3
  I3["Stock/resources/army update"] --> I4
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
  Draft->>VFX: Row glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Disabled dim
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Quick Recruit Window"]
  Current --> T0["24-town-screen"]
  Current --> T1["24-town-screen"]
```

## State Inputs
- dwellingRows -> selectors.towns.quickRecruitRows
- selectedRows -> state.ui.quickRecruit.selectedDwellingIds
- destinationArmy -> selectors.towns.quickRecruitDestinationArmy
- totalCost -> selectors.economy.quickRecruitTotalCost
- rowGuards -> selectors.towns.quickRecruitRowGuards

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
