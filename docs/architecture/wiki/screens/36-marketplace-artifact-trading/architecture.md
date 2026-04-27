# Screen 36 Architecture: Marketplace Artifact Trading

System: town
Screen ID: marketplace-artifact-trading
Visual Archetype: curated-artifact-trading
Curation Status: curated-pass-4

## Purpose
Marketplace sub-service for exchanging artifacts between hero, backpack, market offer slots, and trade valuation rows.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Marketplace Artifact Trading"]
  C0["HeroArtifactGrid"]
  Root --> C0
  C1["ValuationScales"]
  Root --> C1
  C2["TradeOfferSlots"]
  Root --> C2
  C3["QuotePanel"]
  Root --> C3
  C4["TradeButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero artifacts"] --> L1
  L1["Market rules"] --> L2
  L2["Valuation formula"] --> L3
  L3["Trade guard"] --> L4
  L4["Artifact trading view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Artifact/quote input"] --> I1
  I1["Eligibility guard"] --> I2
  I2["Trade command"] --> I3
  I3["Inventory/economy update"] --> I4
  I4["Receipt feedback"]
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
  Draft->>VFX: Card slide
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Snap back
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Marketplace Artifact Trading"]
  Current --> T0["26-marketplace"]
```

## State Inputs
- heroArtifacts -> state.heroes.byId[visiting].artifacts
- selectedOffer -> state.ui.artifactTrading.offerArtifactId
- selectedRequest -> state.ui.artifactTrading.requestId
- quote -> selectors.economy.artifactTradeQuote
- tradeGuard -> selectors.economy.artifactTradeGuard

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
