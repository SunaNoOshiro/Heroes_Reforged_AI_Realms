# Screen 36: Marketplace Artifact Trading

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town-marketplace sub-service for exchanging a hero artifact for
gold, resources, or another artifact via a deterministic quote.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Z-Layer: 1000 per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800×600 layout. Three-panel split inside the central modal:
  hero artifact grid (left), valuation scales with quote readout
  (center), receive slots — Gold / resource / artifact — (right).
  TRADE and CLOSE buttons sit beneath the quote.
- Dense classic fantasy strategy UI: ornate gold frame, red/brown/
  stone panels, compact icon slots, right-click detail affordances,
  bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

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
| `heroArtifacts` | `state.heroes.byId[visiting].artifacts` | Equipped + backpack artifacts. |
| `selectedOffer` | `state.ui.artifactTrading.offerArtifactId` | Local artifact placed on the scale. |
| `selectedRequest` | `state.ui.artifactTrading.requestId` | Local requested gold / resource / artifact outcome. |
| `quote` | `selectors.economy.artifactTradeQuote` | Deterministic trade valuation. |
| `tradeGuard` | `selectors.economy.artifactTradeGuard` | Eligibility, lock, capacity, affordability. |

### Mechanics Mapping
- The trade command checks artifact ownership, locked equipped
  slots, trade eligibility, market availability, valuation formula,
  backpack capacity, and gold/resource outcome before mutating
  state.
- UI previews stay local until the listed command or close-route
  guard accepts them.
- Costs, artifacts, and resource IDs resolve through registries and
  content schemas — never hard-coded in view logic.

### Animation Contract
- Artifact cards slide onto the scales; the valuation needle moves
  while a valid offer + quote pair is selected; an accepted trade
  stamps the receipt; a rejected locked artifact snaps back.
- Animation consumes reducer / route results; it never decides
  gameplay outcomes.
- Reduced-motion mode replaces transitions with static highlights
  and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture diagrams are screen-specific, not copied archetype
  diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `marketplace-artifact-trading`; system group: `town`;
  curation marker: `curated-pass-4`.
- Build runtime components from this package; do not source pixels
  from third-party captures.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and animation contract match the regions and `data-action` hooks in `mockup.html`; sibling [`interactions.md`](./interactions.md) and [`architecture.md`](./architecture.md) reference the same five state bindings.
- **Schema: ❌** — `selectors.economy.artifactTradeQuote`/`artifactTradeGuard` and `state.ui.artifactTrading.*` are screen-package contracts but the only schema-backed command this screen dispatches — `TRADE_ARTIFACT` in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) — defines a **hero-to-hero** payload (`fromHeroId`, `toHeroId`, `artifactId`), not the marketplace artifact-for-gold/resource flow depicted here. Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/36-marketplace-artifact-trading-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/36-marketplace-artifact-trading-screen.md) Reads-First this file; engine command lives in [`tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md`](../../../../../tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md).

## ⚠ Issues

- **`TRADE_ARTIFACT` schema payload does not match the marketplace flow.** [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) defines `TRADE_ARTIFACT` with `{ kind, fromHeroId, toHeroId, artifactId }` — a hero-to-hero handoff, no `marketId` / `quoteId` / resource outcome. The screen package and its owning command task [`phase-2.01-spells-artifacts.17-trade-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md) describe a marketplace exchange that yields gold or another resource via a deterministic quote. Per CLAUDE.md ("Stable IDs are public API; renaming an ID requires a migration") the owning command task must either (a) extend `tradeArtifact` with `marketId` + `quoteId` and a resource-outcome variant, or (b) introduce a new kind (e.g. `EXCHANGE_ARTIFACT`) and alias `TRADE_ARTIFACT` per [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md). Not edited here per Hard Prohibition D.
- **Mockup label `Kaelis` is not in any resource enum.** The mockup right-panel slot reads `Kaelis`; sibling screen [`26-marketplace`](../26-marketplace/spec.md) flagged the same lore label (`Kaeliss`) as a placeholder against [`resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json). The screens share the gap; resolution belongs to `mvp.02-content-schemas.19-tavern-and-marketplace-tables`. Flag-only.
