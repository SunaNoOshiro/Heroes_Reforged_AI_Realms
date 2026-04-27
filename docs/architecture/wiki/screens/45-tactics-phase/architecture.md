# Screen 45 Architecture: Combat Tactics Phase

System: battle
Screen ID: tactics-phase
Visual Archetype: curated-tactics-phase
Curation Status: curated-pass-2

## Purpose
Pre-combat tactics deployment phase with legal placement zones, draggable friendly stacks, locked enemy side, remaining placement moves, and start battle action.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Combat Tactics Phase"]
  C0["DeploymentZone"]
  Root --> C0
  C1["FriendlyStacks"]
  Root --> C1
  C2["EnemyPreview"]
  Root --> C2
  C3["MoveBudgetPlaque"]
  Root --> C3
  C4["StartBattleButton"]
  Root --> C4
  C5["IllegalPlacementFeedback"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Pending battle"] --> L1
  L1["Tactics skill"] --> L2
  L2["Legal zones"] --> L3
  L3["Army stacks"] --> L4
  L4["Tactics view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Drag/drop"] --> I1
  I1["Zone guard"] --> I2
  I2["PLACE_TACTICS_STACK"] --> I3
  I3["Reducer placement"] --> I4
  I4["Start combat"]
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
  Draft->>VFX: Zone glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Overlay wipe
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Combat Tactics Phase"]
  Current --> T0["38-combat-screen"]
```

## State Inputs
- tacticsAvailable -> state.battle.tactics.enabled
- deploymentZone -> state.battle.tactics.legalHexes
- friendlyStacks -> state.battle.armies.attacker.stacks
- enemyPreview -> state.battle.armies.defender.stacks
- remainingMoves -> state.battle.tactics.remainingMoves

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
