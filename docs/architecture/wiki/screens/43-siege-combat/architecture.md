# Screen 43 Architecture: Siege Combat Variant

System: battle
Screen ID: siege-combat
Visual Archetype: curated-siege-combat
Curation Status: curated-pass-2

## Purpose
Siege battlefield variant with walls, gate, towers, moat, catapult target preview, breaching state, and defender/attacker stack placement.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Siege Combat Variant"]
  C0["Battlefield"]
  Root --> C0
  C1["CastleWalls"]
  Root --> C1
  C2["GateAndMoat"]
  Root --> C2
  C3["TowerNodes"]
  Root --> C3
  C4["CatapultTargetPreview"]
  Root --> C4
  C5["ArmyStacks"]
  Root --> C5
  C6["ActionBar"]
  Root --> C6
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Battle state"] --> L1
  L1["Siege structures"] --> L2
  L2["Wall HP"] --> L3
  L3["Terrain/moat"] --> L4
  L4["Siege view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Wall/hex target"] --> I1
  I1["Siege guard"] --> I2
  I2["FIRE_CATAPULT or attack"] --> I3
  I3["Reducer siege result"] --> I4
  I4["Impact animation"]
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
  Draft->>VFX: Target glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Wall crumble
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Siege Combat Variant"]
  Current --> T0["Current screen or battle results"]
```

## State Inputs
- wallState -> state.battle.siege.wallSegments
- gateState -> state.battle.siege.gate
- towerState -> state.battle.siege.towers
- catapultTarget -> state.ui.battle.catapultTarget
- activeStack -> state.battle.activeStackId

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
