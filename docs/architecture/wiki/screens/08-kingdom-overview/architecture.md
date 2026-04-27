# Screen 08 Architecture: Kingdom Overview

System: adventure
Screen ID: kingdom-overview
Visual Archetype: curated-adventure-ledger
Curation Status: curated-pass-3

## Purpose
Adventure-layer kingdom ledger showing owned towns, heroes, daily income, movement status, and strategic warnings without changing gameplay state.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Kingdom Overview"]
  C0["TownLedger"]
  Root --> C0
  C1["HeroLedger"]
  Root --> C1
  C2["DailyIncomeStrip"]
  Root --> C2
  C3["StrategicWarnings"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Player selector"] --> L1
  L1["Town IDs"] --> L2
  L2["Hero IDs"] --> L3
  L3["Income selectors"] --> L4
  L4["Kingdom ledger model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Row input"] --> I1
  I1["Ownership guard"] --> I2
  I2["Focus context"] --> I3
  I3["Route request"] --> I4
  I4["Town/hero/map screen"]
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
  Draft->>VFX: Ledger slide
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Map fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Kingdom Overview"]
  Current --> T0["24-town-screen"]
  Current --> T1["46-hero-screen"]
  Current --> T2["07-adventure-map"]
  Current --> T3["07-adventure-map"]
```

## State Inputs
- townRows -> state.players.active.townIds
- heroRows -> state.players.active.heroIds
- incomeTotals -> selectors.economy.dailyIncomeByResource
- selectedRow -> state.ui.kingdomOverview.selectedRowId
- warnings -> selectors.adventure.kingdomWarnings

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
