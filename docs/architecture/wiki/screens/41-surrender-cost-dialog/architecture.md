# Screen 41 Architecture: Surrender Cost Dialog

System: battle
Screen ID: surrender-cost-dialog
Visual Archetype: curated-surrender
Curation Status: curated-pass-2

## Purpose
Combat surrender confirmation with ransom cost, available gold, surviving army value, hero survival outcome, and accept/decline controls.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Surrender Cost Dialog"]
  C0["GoldCostPlaque"]
  Root --> C0
  C1["SurvivorSummary"]
  Root --> C1
  C2["AvailableGold"]
  Root --> C2
  C3["OutcomeText"]
  Root --> C3
  C4["AcceptDeclineButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Active battle"] --> L1
  L1["Surviving army value"] --> L2
  L2["Ruleset cost"] --> L3
  L3["Player gold"] --> L4
  L4["Surrender view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Accept/decline"] --> I1
  I1["Affordability guard"] --> I2
  I2["ACCEPT_BATTLE_SURRENDER"] --> I3
  I3["Reducer result"] --> I4
  I4["Battle results"]
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
  Draft->>VFX: Cost pulse
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Result fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Surrender Cost Dialog"]
  Current --> T0["39-battle-results"]
  Current --> T1["38-combat-screen"]
```

## State Inputs
- survivingArmyValue -> state.battle.surrender.armyValue
- surrenderCost -> state.battle.surrender.cost
- availableGold -> state.players.active.resources.gold
- heroOutcome -> state.battle.surrender.heroOutcome

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
