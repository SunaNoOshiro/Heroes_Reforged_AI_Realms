# Screen 02 Architecture: New Game Setup

System: menus
Screen ID: new-game-setup
Visual Archetype: curated-new-game-setup
Curation Status: curated-pass-6

## Purpose
Scenario setup shell for single scenario, campaign, random map, multiplayer, difficulty, player color, and starting options.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["New Game Setup"]
  C0["ModeTabs"]
  Root --> C0
  C1["ScenarioList"]
  Root --> C1
  C2["ScenarioPreview"]
  Root --> C2
  C3["PlayerSlotTable"]
  Root --> C3
  C4["DifficultySelector"]
  Root --> C4
  C5["StartBackButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Installed packs"] --> L1
  L1["Scenario index"] --> L2
  L2["Ruleset options"] --> L3
  L3["Setup draft"] --> L4
  L4["Setup screen"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Mode/scenario/start input"] --> I1
  I1["Setup validation"] --> I2
  I2["Create game request"] --> I3
  I3["Loading route"] --> I4
  I4["Initial state"]
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
  Draft->>VFX: Tab depress
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Loading fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["New Game Setup"]
  Current --> T0["59-loading-screen"]
  Current --> T1["01-main-menu"]
```

## State Inputs
- setupMode -> state.ui.newGame.mode
- scenarioList -> selectors.scenarios.availableScenarios
- selectedScenario -> state.ui.newGame.selectedScenarioId
- playerSlots -> state.ui.newGame.playerSlots
- difficulty -> state.ui.newGame.difficulty

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
