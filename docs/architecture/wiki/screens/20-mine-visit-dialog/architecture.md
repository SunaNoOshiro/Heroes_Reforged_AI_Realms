# Screen 20 Architecture: Mine Visit Dialog

System: adventure
Screen ID: mine-visit-dialog
Visual Archetype: curated-mine-visit
Curation Status: curated-pass-3

## Purpose
Mine capture or visit dialog showing resource type, current owner, guard state, income, and flagging outcome.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Mine Visit Dialog"]
  C0["MinePortrait"]
  Root --> C0
  C1["OwnerFlag"]
  Root --> C1
  C2["IncomePreview"]
  Root --> C2
  C3["GuardSummary"]
  Root --> C3
  C4["ClaimLeaveButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero visit"] --> L1
  L1["Mine object"] --> L2
  L2["Owner/resource"] --> L3
  L3["Guard state"] --> L4
  L4["Mine dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Claim/fight input"] --> I1
  I1["Guard/ownership check"] --> I2
  I2["Claim or battle route"] --> I3
  I3["Income refresh"] --> I4
  I4["Flag animation"]
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
  Draft->>VFX: Flag unfurl
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Map recolor
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Mine Visit Dialog"]
  Current --> T0["07-adventure-map"]
  Current --> T1["40-pre-battle-dialog"]
  Current --> T2["07-adventure-map"]
  Current --> T3["18-map-object-tooltip"]
```

## State Inputs
- mineId -> state.ui.adventure.pendingMineVisit.mineId
- mineRecord -> state.mapObjects.byId[mineId]
- activePlayer -> state.turn.activePlayerId
- dailyIncome -> selectors.economy.mineIncomePreview
- guardState -> selectors.mapObjects.mineGuardState

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
