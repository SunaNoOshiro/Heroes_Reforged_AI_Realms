# Screen 48 Architecture: Level Up Dialog

System: hero
Screen ID: level-up-dialog
Visual Archetype: curated-level-up
Curation Status: curated-pass-5

## Purpose
Hero level-up choice dialog showing primary stat gain, two secondary skill choices, class weighting, and acceptance result.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Level Up Dialog"]
  C0["HeroPortrait"]
  Root --> C0
  C1["PrimaryStatGain"]
  Root --> C1
  C2["SkillChoiceCards"]
  Root --> C2
  C3["ExperienceBar"]
  Root --> C3
  C4["ConfirmButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero XP result"] --> L1
  L1["Class weights"] --> L2
  L2["Ruleset skill limits"] --> L3
  L3["Deterministic choice set"] --> L4
  L4["Level-up dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Skill selection"] --> I1
  I1["Choice guard"] --> I2
  I2["Apply level command"] --> I3
  I3["Hero stats/skills update"] --> I4
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
  Draft->>VFX: XP fill
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Skill stamp
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Level Up Dialog"]
  Current --> T0["46-hero-screen or previous screen"]
```

## State Inputs
- heroId -> state.ui.levelUp.heroId
- primaryGain -> state.ui.levelUp.primaryStatGain
- skillChoices -> state.ui.levelUp.skillChoices
- selectedChoice -> state.ui.levelUp.selectedChoiceId
- experience -> state.heroes.byId[heroId].experience

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
