# Screen 26: Marketplace

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Resource exchange screen with offer resource, receive resource, rate calculation, quantity slider, resource ledger, and trade confirmation.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- A trade board with two opposing resource grids, arrowed exchange lane, rate plaque, and player resource ledger along the footer.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MarketplaceDialog
  - OfferResourceGrid
  - ReceiveResourceGrid
  - ExchangeRatePlaque
  - QuantitySlider
  - ResultPreview
  - ResourceLedger

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| player.resources | state.players.active.resources | Current resource balances. |
| market.rates | state.marketplace.currentRates | Rates derived from market count and ruleset. |
| selectedOffer | state.ui.marketplace.offerResource | Local offered resource. |
| selectedReceive | state.ui.marketplace.receiveResource | Local received resource. |
| tradeAmount | state.ui.marketplace.amount | Local amount before confirm. |

### Mechanics Mapping
- Trade rates derive from owned marketplaces and ruleset constants; only confirmed trades mutate player resources.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `marketplace`; system group: `town`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
