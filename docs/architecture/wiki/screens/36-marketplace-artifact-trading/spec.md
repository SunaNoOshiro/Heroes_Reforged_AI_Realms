# Screen 36: Marketplace Artifact Trading

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Marketplace sub-service for exchanging artifacts between hero, backpack, market offer slots, and trade valuation rows.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Split counter layout: hero backpack grid left, market valuation scales center, target/sell slots right, with gold/resource quote at the bottom.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MarketplaceArtifactTrading
  - HeroArtifactGrid
  - ValuationScales
  - TradeOfferSlots
  - QuotePanel
  - TradeButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| heroArtifacts | state.heroes.byId[visiting].artifacts | Equipped and backpack artifacts. |
| selectedOffer | state.ui.artifactTrading.offerArtifactId | Local artifact being offered. |
| selectedRequest | state.ui.artifactTrading.requestId | Local requested gold/resource/artifact outcome. |
| quote | selectors.economy.artifactTradeQuote | Deterministic trade valuation. |
| tradeGuard | selectors.economy.artifactTradeGuard | Eligibility, lock, capacity, and affordability. |

### Mechanics Mapping
- Trade commands check artifact ownership, locked equipped slots, trade eligibility, market availability, valuation formulas, backpack capacity, and gold/resource outcomes.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Artifact cards slide onto scales, valuation needle moves, accepted trade stamps the receipt, and rejected locked artifacts snap back.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `marketplace-artifact-trading`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
