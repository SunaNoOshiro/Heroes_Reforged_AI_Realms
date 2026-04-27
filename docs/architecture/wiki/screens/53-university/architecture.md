# Screen 53 Architecture: University

System: hero
Screen ID: university
Visual Archetype: curated-university
Curation Status: curated-pass-5

## Purpose
University skill-learning service where a visiting hero can buy offered secondary skills if legal.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["University"]
  C0["SkillOfferCards"]
  Root --> C0
  C1["HeroSkillRow"]
  Root --> C1
  C2["PricePlaque"]
  Root --> C2
  C3["LearnButton"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["University source"] --> L1
  L1["Skill offers"] --> L2
  L2["Hero skills"] --> L3
  L3["Gold selector"] --> L4
  L4["University view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Skill/learn input"] --> I1
  I1["Skill and cost guard"] --> I2
  I2["Learn command"] --> I3
  I3["Hero skill update"] --> I4
  I4["Service refresh"]
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
  Draft->>VFX: Card glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Skill slide
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["University"]
  Current --> T0["07-adventure-map or 24-town-screen"]
```

## State Inputs
- universityId -> state.ui.university.sourceId
- offeredSkills -> state.mapObjects.byId[universityId].offeredSkills
- heroSkills -> state.heroes.byId[selected].skills
- selectedSkill -> state.ui.university.selectedSkillId
- learnGuard -> selectors.heroes.universityLearnGuard

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
