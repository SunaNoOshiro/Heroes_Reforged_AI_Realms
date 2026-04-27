# Screen 04 Architecture: Campaign Inter-Mission Narrative

System: menus
Screen ID: campaign-narrative
Visual Archetype: curated-campaign-narrative
Curation Status: curated-pass-6

## Purpose
Campaign briefing or inter-mission narrative screen with story text, portrait, mission objectives, carryover, and Start Mission control.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Campaign Inter-Mission Narrative"]
  C0["StoryScroll"]
  Root --> C0
  C1["SpeakerPortrait"]
  Root --> C1
  C2["ObjectivePlaques"]
  Root --> C2
  C3["BonusChoiceSlots"]
  Root --> C3
  C4["StartMissionButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Campaign run"] --> L1
  L1["Mission node"] --> L2
  L2["Localization"] --> L3
  L3["Objectives"] --> L4
  L4["Narrative screen"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Bonus/start input"] --> I1
  I1["Mission guard"] --> I2
  I2["Start mission event"] --> I3
  I3["Loading route"] --> I4
  I4["Mission state"]
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
  Draft->>VFX: Text type
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Loading fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Campaign Inter-Mission Narrative"]
  Current --> T0["59-loading-screen"]
  Current --> T1["03-campaign-selection"]
```

## State Inputs
- campaignNode -> state.campaign.currentNodeId
- storyText -> localization.campaign[node].briefing
- objectives -> registries.scenarios.byId[mission].objectives
- bonusChoices -> state.ui.campaignNarrative.selectedBonus
- carryover -> selectors.campaigns.currentCarryover

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
