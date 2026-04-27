# Screen 13 Architecture: Hill Fort

System: adventure
Screen ID: hill-fort
Visual Archetype: curated-hill-fort
Curation Status: curated-pass-3

## Purpose
Hill Fort upgrade service where eligible hero stacks can be upgraded for calculated resource costs.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Hill Fort"]
  C0["CurrentArmySlots"]
  Root --> C0
  C1["UpgradePathList"]
  Root --> C1
  C2["CostLedger"]
  Root --> C2
  C3["UpgradeButtons"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero army"] --> L1
  L1["Creature upgrade registry"] --> L2
  L2["Resources"] --> L3
  L3["Cost selector"] --> L4
  L4["Hill Fort view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Stack selection"] --> I1
  I1["Upgrade guard"] --> I2
  I2["Upgrade command"] --> I3
  I3["Reducer updates army"] --> I4
  I4["Cost feedback"]
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
  Draft->>VFX: Slot glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Gold tick
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Hill Fort"]
  Current --> T0["07-adventure-map"]
```

## State Inputs
- heroArmy -> state.heroes.byId[selected].army
- upgradeTargets -> selectors.creatures.availableHillFortUpgrades
- selectedStack -> state.ui.hillFort.selectedStackIndex
- costPreview -> selectors.economy.upgradeCostPreview
- resources -> state.players.active.resources

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
