# Screen 40 Architecture: Pre-Battle Dialog

System: battle
Screen ID: pre-battle-dialog
Visual Archetype: curated-pre-battle
Curation Status: curated-pass-2

## Purpose
Encounter confirmation dialog comparing attacker and defender heroes/armies, terrain context, tactics availability, and fight/retreat/auto-resolve choices.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Pre-Battle Dialog"]
  C0["AttackerPanel"]
  Root --> C0
  C1["DefenderPanel"]
  Root --> C1
  C2["TerrainPreview"]
  Root --> C2
  C3["ArmyComparison"]
  Root --> C3
  C4["TacticsIndicator"]
  Root --> C4
  C5["FightRetreatButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Pending encounter"] --> L1
  L1["Terrain resolver"] --> L2
  L2["Army comparison"] --> L3
  L3["Tactics guard"] --> L4
  L4["Pre-battle view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Fight/auto/retreat"] --> I1
  I1["Encounter guard"] --> I2
  I2["Battle init command"] --> I3
  I3["Reducer phase update"] --> I4
  I4["Combat/results route"]
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
  Draft->>VFX: Strength fill
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Disabled shake
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Pre-Battle Dialog"]
  Current --> T0["38-combat-screen or 45-tactics-phase"]
  Current --> T1["39-battle-results"]
  Current --> T2["07-adventure-map"]
```

## State Inputs
- attacker -> state.pendingBattle.attacker
- defender -> state.pendingBattle.defender
- terrain -> state.pendingBattle.terrainId
- tacticsAvailable -> state.pendingBattle.tacticsAvailable
- retreatAllowed -> state.pendingBattle.retreatAllowed

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
