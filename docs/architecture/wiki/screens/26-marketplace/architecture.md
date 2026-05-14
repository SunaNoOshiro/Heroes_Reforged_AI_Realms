# Screen 26 Architecture: Marketplace

System: town
Screen ID: marketplace
Visual Archetype: curated-town-marketplace
Curation Status: curated-pass-2

## Purpose
Resource exchange screen: offer + receive grids, rate plaque,
quantity slider, ledger preview, and `TRADE_RESOURCES`
confirmation.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["MarketplaceDialog"]
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
  L1["Owned marketplace count"] --> L2
  L2["Ruleset + rate table"] --> L3
  L3["Trade draft"] --> L4
  L4["Marketplace view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Select offer + receive"] --> I1
  I1["Set amount, preview rate"] --> I2
  I2["TRADE_RESOURCES"] --> I3
  I3["Reducer balances"] --> I4
  I4["Ledger refresh"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/adjust amount
  Draft->>VFX: Slot glow + arrow pulse
  UI->>Guard: market.trade
  Guard->>Reducer: TRADE_RESOURCES
  Reducer-->>UI: authoritative balances
  UI->>VFX: Count-down/up + ledger flash
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Marketplace"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- `player.resources` ← `state.players.active.resources`
- `market.rates` ← `state.marketplace.currentRates`
- `selectedOffer` ← `state.ui.marketplace.offerResource`
- `selectedReceive` ← `state.ui.marketplace.receiveResource`
- `tradeAmount` ← `state.ui.marketplace.amount`

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled
  states, and error behavior.
- Data contracts define schemas, config, localization, asset,
  audio, VFX, save, and replay references.
- Diagrams in this file summarize the same contract; they must
  not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Visual Composition matches `spec.md` § Component Tree; Main Interaction Flow matches the five action IDs in `interactions.md` § Actions; Outgoing Transitions target `24-town-screen` per the `market.close` row.
- **Schema: ✔** — `TRADE_RESOURCES` resolves to the `tradeResources` definition in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); state paths align with `data-contracts.md` § Runtime State Selectors.
- **Tasks: ✔** — Diagrams cover the surfaces owned by [`tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md) and the reducer task [`tasks/mvp/05-adventure-map/10-trade-resources-command.md`](../../../../../tasks/mvp/05-adventure-map/10-trade-resources-command.md).

## ⚠ Issues

- **State Inputs do not show `marketplaceId`.** Mirrors the gap flagged in `data-contracts.md` § ⚠ Issues — the `TRADE_RESOURCES` command accepts an optional `marketplaceId` field that has no diagrammed source here. Owner: `mvp.05-adventure-map.10-trade-resources-command` Acceptance Criteria.
- **Sibling-aligned** with `spec.md` § Component Tree and `interactions.md` § Actions (same component set and command list).
