# Screen 03 Architecture: Campaign Selection

System: menus
Screen ID: campaign-selection
Visual Archetype: curated-campaign-selection
Curation Status: curated-pass-6

## Purpose
Campaign book selection with campaign list, faction emblem, progress medals, difficulty, and briefing route.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Campaign Selection"]
  C0["CampaignBook"]
  Root --> C0
  C1["CampaignShieldList"]
  Root --> C1
  C2["CampaignMapPreview"]
  Root --> C2
  C3["ProgressMedals"]
  Root --> C3
  C4["BeginBackButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Campaign registry"] --> L1
  L1["Profile progress"] --> L2
  L2["Difficulty draft"] --> L3
  L3["Carryover rules"] --> L4
  L4["Campaign book"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Campaign input"] --> I1
  I1["Unlock guard"] --> I2
  I2["Run draft"] --> I3
  I3["Briefing route"] --> I4
  I4["Narrative screen"]
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
  Draft->>VFX: Page turn
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Briefing fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Campaign Selection"]
  Current --> T0["04-campaign-narrative"]
  Current --> T1["02-new-game-setup"]
```

## State Inputs
- campaigns -> selectors.campaigns.availableCampaigns
- selectedCampaign -> state.ui.campaign.selectedCampaignId
- unlockState -> state.profile.campaignUnlocks
- difficulty -> state.ui.campaign.difficulty
- carryoverPreview -> selectors.campaigns.carryoverPreview

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
