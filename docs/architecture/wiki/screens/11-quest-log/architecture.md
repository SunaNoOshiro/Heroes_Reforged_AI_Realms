# Screen 11 Architecture: Quest Log

System: adventure
Screen ID: quest-log
Visual Archetype: curated-quest-log
Curation Status: curated-pass-3

## Purpose
Adventure quest ledger listing active, completed, failed, and repeatable map-object quests with requirements, deadlines, and rewards.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Quest Log"]
  C0["QuestTabs"]
  Root --> C0
  C1["QuestList"]
  Root --> C1
  C2["QuestDetails"]
  Root --> C2
  C3["RequirementChecklist"]
  Root --> C3
  C4["RewardSlots"]
  Root --> C4
  C5["SourceFocusButton"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Quest registry"] --> L1
  L1["Player progress"] --> L2
  L2["Hero inventory"] --> L3
  L3["Visible quest rows"] --> L4
  L4["Quest log"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Tab/row input"] --> I1
  I1["Visibility guard"] --> I2
  I2["Local selection"] --> I3
  I3["Optional source focus"] --> I4
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
  Draft->>VFX: Book open
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Map fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Quest Log"]
  Current --> T0["07-adventure-map"]
  Current --> T1["07-adventure-map or previous screen"]
```

## State Inputs
- questFilter -> state.ui.questLog.filter
- questRows -> selectors.quests.visibleQuestRows
- selectedQuest -> state.ui.questLog.selectedQuestId
- requirements -> selectors.quests.selectedQuestRequirements
- rewardPreview -> selectors.quests.selectedQuestRewards

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
