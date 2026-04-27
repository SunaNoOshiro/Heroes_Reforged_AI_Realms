# Screen 12 Architecture: Creature Bank Loot

System: adventure
Screen ID: creature-bank-loot
Visual Archetype: curated-bank-loot
Curation Status: curated-pass-3

## Purpose
Post-combat creature bank reward dialog showing cleared bank state, losses, reward bundles, and collection result.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Creature Bank Loot"]
  C0["DefeatedGuardPanel"]
  Root --> C0
  C1["RewardBundleGrid"]
  Root --> C1
  C2["CasualtySummary"]
  Root --> C2
  C3["CollectButton"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Combat victory"] --> L1
  L1["Bank object"] --> L2
  L2["Reward table"] --> L3
  L3["Casualty result"] --> L4
  L4["Loot dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Collect click"] --> I1
  I1["Unclaimed guard"] --> I2
  I2["Reward command"] --> I3
  I3["Reducer applies bundle"] --> I4
  I4["Dim bank on map"]
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
  Draft->>VFX: Vault open
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Object dim
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Creature Bank Loot"]
  Current --> T0["07-adventure-map"]
  Current --> T1["50-creature-info or 18-map-object-tooltip"]
  Current --> T2["07-adventure-map"]
```

## State Inputs
- bankId -> state.ui.adventure.pendingBankReward.bankId
- combatResult -> state.combat.lastResult
- rewardBundle -> selectors.creatureBanks.rewardBundle
- visitedFlag -> state.mapObjects.byId[bankId].visitedBy
- heroArmy -> state.heroes.byId[selected].army

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
