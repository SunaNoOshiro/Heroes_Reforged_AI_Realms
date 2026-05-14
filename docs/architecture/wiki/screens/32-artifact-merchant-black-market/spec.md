# Screen 32: Artifact Merchant / Black Market

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Artifact shop / black market for browsing, buying, and selling
eligible artifacts at the visiting town.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Merchant-stall panel with artifact shelf grid, selected-artifact
  detail parchment, hero backpack strip, price tag, and buy/sell
  controls.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, and bottom status / resource
  feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

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
| `marketStock` | `state.towns.byId[<selectedTownId>].artifactMarketStock` | Available artifact IDs and sold state. |
| `selectedArtifact` | `state.ui.artifactMarket.selectedArtifactId` | Local-UI selection, not persisted. |
| `heroBackpack` | `state.heroes.byId[<visitingHeroId>].backpack` | Inventory target for purchases. |
| `pricePreview` | `selectors.economy.artifactMarketPrice` | Buy/sell value and affordability. |
| `gold` | `state.players.active.resources.gold` | Gold guard for purchase. |

### Mechanics Mapping
- Availability is resolved from market stock, rarity rules, hero inventory capacity, artifact restrictions, and player gold before `BUY_ARTIFACT` or `SELL_ARTIFACT` commits.
- UI previews stay local-only until a listed command or route guard accepts them.
- Costs, artifacts, heroes, and towns resolve through registries and content schemas — never hardcoded view logic.

### Animation Contract
- Shelf slots shimmer; selected slot lifts. Price tag flips between buy/sell labels. Purchased items slide from shelf into the backpack strip; sold items slide out toward the shelf.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback (mockup honors `prefers-reduced-motion`).

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema / config / localization / asset / sound / VFX / save / replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `artifact-merchant-black-market`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime resolves presentation through asset IDs / manifests; deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and animation contract align with sibling [`interactions.md`](./interactions.md), [`data-contracts.md`](./data-contracts.md), [`architecture.md`](./architecture.md), and `mockup.html`.
- **Schema: ⚠** — Bindings here reference `marketStock` and `selectedArtifact` but no field surfaces a `marketId`, which the closed `BUY_ARTIFACT` / `SELL_ARTIFACT` schemas in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) require. Detailed in sibling [`data-contracts.md` § ⚠ Issues](./data-contracts.md) — aligned.
- **Tasks: ✔** — Screen task [`phase-2.07-ui-screen-backlog.32-artifact-merchant-black-market-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/32-artifact-merchant-black-market-screen.md) reads first this file and depends on [`phase-2.01-spells-artifacts.10-buy-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/10-buy-artifact-command.md).

## ⚠ Issues

- **State bindings depend on unregistered `data-inventory.md` rows.** `state.towns.byId[].artifactMarketStock` and `state.ui.artifactMarket.selectedArtifactId` are not registered in [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md root contract, the owning reducer task [`phase-2.01-spells-artifacts.10-buy-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/10-buy-artifact-command.md) must add the rows before this screen ships. See sibling [`data-contracts.md` § ⚠ Issues](./data-contracts.md) for suggested values — aligned.
