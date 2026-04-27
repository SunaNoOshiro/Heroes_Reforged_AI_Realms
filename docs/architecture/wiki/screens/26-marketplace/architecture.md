# Screen 26 Architecture: Marketplace

System: town
Screen ID: marketplace
Visual Archetype: curated-town-marketplace
Curation Status: curated-pass-2

## Purpose
Resource exchange screen with offer resource, receive resource, rate calculation, quantity slider, resource ledger, and trade confirmation.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Marketplace"]
  C0["OfferResourceGrid"]
  Root --> C0
  C1["ReceiveResourceGrid"]
  Root --> C1
  C2["ExchangeRatePlaque"]
  Root --> C2
  C3["QuantitySlider"]
  Root --> C3
  C4["ResultPreview"]
  Root --> C4
  C5["ResourceLedger"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Player resources"] --> L1
  L1["Marketplace count"] --> L2
  L2["Ruleset rates"] --> L3
  L3["Trade draft"] --> L4
  L4["Marketplace view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Select resources"] --> I1
  I1["Rate preview"] --> I2
  I2["TRADE_RESOURCES"] --> I3
  I3["Reducer balances"] --> I4
  I4["Ledger update"]
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
  Draft->>VFX: Resource glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Ledger flash
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Marketplace"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- player.resources -> state.players.active.resources
- market.rates -> state.marketplace.currentRates
- selectedOffer -> state.ui.marketplace.offerResource
- selectedReceive -> state.ui.marketplace.receiveResource
- tradeAmount -> state.ui.marketplace.amount

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
