# Screen 50 Architecture: Creature Info

System: hero
Screen ID: creature-info
Visual Archetype: curated-creature-info
Curation Status: curated-pass-5

## Purpose
Detailed creature information panel for army stacks, dwellings, combat stacks, rewards, and tooltip drill-down.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Creature Info"]
  C0["CreaturePortrait"]
  Root --> C0
  C1["StatGrid"]
  Root --> C1
  C2["AbilityList"]
  Root --> C2
  C3["ModifierBreakdown"]
  Root --> C3
  C4["UpgradePathPreview"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Creature ID"] --> L1
  L1["Stack context"] --> L2
  L2["Creature registry"] --> L3
  L3["Modifier selectors"] --> L4
  L4["Info panel"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Hover/upgrade input"] --> I1
  I1["Caller capability guard"] --> I2
  I2["Local detail or route"] --> I3
  I3["No gameplay mutation"] --> I4
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
  Draft->>VFX: Portrait idle
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Panel fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Creature Info"]
  Current --> T0["13-hill-fort or 25-building-recruitment-dialog"]
  Current --> T1["Previous screen"]
```

## State Inputs
- creatureId -> state.ui.creatureInfo.creatureId
- stackContext -> state.ui.creatureInfo.stackContext
- baseStats -> registries.creatures.byId[creatureId].stats
- modifiers -> selectors.creatures.stackStatModifiers
- abilities -> registries.creatures.byId[creatureId].abilities

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
