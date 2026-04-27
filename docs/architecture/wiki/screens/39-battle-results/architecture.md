# Screen 39 Architecture: Battle Results

System: battle
Screen ID: battle-results
Visual Archetype: curated-battle-results
Curation Status: curated-pass-2

## Purpose
Post-combat result panel with victory/defeat banner, experience gain, casualties, spoils, captured artifacts, and continue routing.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Battle Results"]
  C0["OutcomeBanner"]
  Root --> C0
  C1["ExperienceBar"]
  Root --> C1
  C2["AttackerCasualties"]
  Root --> C2
  C3["DefenderCasualties"]
  Root --> C3
  C4["SpoilsRow"]
  Root --> C4
  C5["ContinueButton"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Resolved battle result"] --> L1
  L1["Hero XP rules"] --> L2
  L2["Spoils records"] --> L3
  L3["Return route"] --> L4
  L4["Battle results view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Continue"] --> I1
  I1["One-shot result guard"] --> I2
  I2["ACKNOWLEDGE_BATTLE_RESULT"] --> I3
  I3["Reducer route update"] --> I4
  I4["Adventure/cinematic"]
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
  Draft->>VFX: Banner drop
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Continue glow
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Battle Results"]
  Current --> T0["07-adventure-map or 42-victory-defeat-cinematic"]
```

## State Inputs
- battle.outcome -> state.battle.result.outcome
- experience -> state.battle.result.experienceGained
- casualties -> state.battle.result.casualties
- spoils -> state.battle.result.spoils
- nextRoute -> state.battle.result.returnRoute

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
