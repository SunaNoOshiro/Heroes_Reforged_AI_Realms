# Screen 32: Artifact Merchant / Black Market

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Artifact shop or black market service for browsing, buying, and selling eligible artifacts.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Merchant stall panel with artifact shelf grid, selected artifact detail parchment, hero backpack strip, price tag, and buy/sell controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ArtifactMarket
  - ArtifactShelfGrid
  - SelectedArtifactDetails
  - HeroBackpackStrip
  - PriceTag
  - BuySellButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| marketStock | state.towns.byId[selected].artifactMarketStock | Available artifact IDs and sold state. |
| selectedArtifact | state.ui.artifactMarket.selectedArtifactId | Local selected artifact. |
| heroBackpack | state.heroes.byId[visiting].backpack | Inventory target for purchases. |
| pricePreview | selectors.economy.artifactMarketPrice | Buy/sell value and affordability. |
| gold | state.players.active.resources.gold | Gold guard for purchase. |

### Mechanics Mapping
- Availability comes from market stock, rarity rules, hero inventory capacity, artifact restrictions, and player gold before purchase or sale commands commit.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Artifacts shimmer on the shelf, selected item lifts, price tag flips between buy/sell, and purchased items slide into the backpack.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `artifact-merchant-black-market`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
