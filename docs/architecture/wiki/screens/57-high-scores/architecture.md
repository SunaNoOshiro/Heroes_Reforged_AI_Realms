# Screen 57 Architecture: High Scores

System: system
Screen ID: high-scores
Visual Archetype: curated-high-scores
Curation Status: curated-pass-6

## Purpose
High score ledger showing completed game rankings, player names, score, days, difficulty, scenario, and campaign medals.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["High Scores"]
  C0["RankingTable"]
  Root --> C0
  C1["MedalPlaques"]
  Root --> C1
  C2["FilterTabs"]
  Root --> C2
  C3["SelectedScoreDetails"]
  Root --> C3
  C4["BackButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Profile scores"] --> L1
  L1["Filter draft"] --> L2
  L2["Sort rules"] --> L3
  L3["Selected row"] --> L4
  L4["High score table"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Row/filter input"] --> I1
  I1["Local selection"] --> I2
  I2["Sorted view"] --> I3
  I3["Optional details"] --> I4
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
  Draft->>VFX: Rows cascade
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: New score pulse
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["High Scores"]
  Current --> T0["01-main-menu or previous screen"]
```

## State Inputs
- scoreRecords -> state.profile.highScores
- filter -> state.ui.highScores.filter
- selectedRecord -> state.ui.highScores.selectedRecordId
- sortOrder -> selectors.profile.sortedHighScores
- newRecordId -> state.ui.highScores.newRecordId

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
