# Screen 38 Architecture: Combat Screen

System: battle
Screen ID: combat-screen
Visual Archetype: curated-combat
Curation Status: anchor-v1

## Purpose
Tactical combat board with hex grid, stack placement, active unit, hero portraits, action bar, target highlights, damage feedback, and combat log.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Combat Screen"]
  C0["Battlefield"]
  Root --> C0
  C1["HexOverlay"]
  Root --> C1
  C2["ArmyStacks"]
  Root --> C2
  C3["ActiveStackHalo"]
  Root --> C3
  C4["TargetPreview"]
  Root --> C4
  C5["HeroPortraits"]
  Root --> C5
  C6["ActionBar"]
  Root --> C6
  C7["CombatLog"]
  Root --> C7
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Battle seed/state"] --> L1
  L1["Ruleset formulas"] --> L2
  L2["Stack registry"] --> L3
  L3["Terrain assets"] --> L4
  L4["Combat view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Target input"] --> I1
  I1["Legality guard"] --> I2
  I2["Combat command"] --> I3
  I3["Reducer result"] --> I4
  I4["Animation event"]
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
  Draft->>VFX: Active halo
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Damage float
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Combat Screen"]
  Current --> T0["Current screen or battle results"]
  Current --> T1["44-combat-spell-targeting"]
```

## State Inputs
- battle.phase -> state.battle.phase
- activeStack -> state.battle.activeStackId
- legalHexes -> state.battle.legalTargets
- combatLog -> state.battle.log
- pendingAnimation -> state.ui.battle.pendingAnimation

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
