# Screen 42 Architecture: Victory / Defeat Cinematic

System: battle
Screen ID: victory-defeat-cinematic
Visual Archetype: curated-outcome-cinematic
Curation Status: curated-pass-2

## Purpose
Letterboxed campaign/scenario outcome screen with victory or defeat art, score summary, narration text, skip/continue controls, and next-route decision.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Victory / Defeat Cinematic"]
  C0["LetterboxArt"]
  Root --> C0
  C1["NarrationPanel"]
  Root --> C1
  C2["ScoreMedallions"]
  Root --> C2
  C3["CampaignCarryoverSummary"]
  Root --> C3
  C4["ContinueSkipButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Scenario outcome"] --> L1
  L1["Score breakdown"] --> L2
  L2["Carryover draft"] --> L3
  L3["Presentation assets"] --> L4
  L4["Outcome cinematic"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Continue/skip"] --> I1
  I1["Outcome route guard"] --> I2
  I2["Route event"] --> I3
  I3["Presentation transition"] --> I4
  I4["Destination"]
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
  Draft->>VFX: Art pan
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Cross-fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Victory / Defeat Cinematic"]
  Current --> T0["57-high-scores or 01-main-menu"]
  Current --> T1["38-combat-screen"]
```

## State Inputs
- outcome -> state.scenario.outcome
- score -> state.scenario.finalScore
- carryover -> state.campaign.carryoverDraft
- nextRoute -> state.scenario.outcomeRoute

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
