# Screen 32 Architecture: Artifact Merchant / Black Market

System: town
Screen ID: artifact-merchant-black-market
Visual Archetype: curated-artifact-market
Curation Status: curated-pass-4

## Purpose
Artifact shop or black market service for browsing, buying, and selling eligible artifacts.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Artifact Merchant / Black Market"]
  C0["ArtifactShelfGrid"]
  Root --> C0
  C1["SelectedArtifactDetails"]
  Root --> C1
  C2["HeroBackpackStrip"]
  Root --> C2
  C3["PriceTag"]
  Root --> C3
  C4["BuySellButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Market stock"] --> L1
  L1["Hero backpack"] --> L2
  L2["Artifact registry"] --> L3
  L3["Gold selector"] --> L4
  L4["Artifact market"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Shelf/backpack input"] --> I1
  I1["Legality and price guard"] --> I2
  I2["Buy/sell command"] --> I3
  I3["Inventory/gold update"] --> I4
  I4["Shelf refresh"]
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
  Draft->>VFX: Shelf shimmer
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Backpack slide
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Artifact Merchant / Black Market"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- marketStock -> state.towns.byId[selected].artifactMarketStock
- selectedArtifact -> state.ui.artifactMarket.selectedArtifactId
- heroBackpack -> state.heroes.byId[visiting].backpack
- pricePreview -> selectors.economy.artifactMarketPrice
- gold -> state.players.active.resources.gold

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
