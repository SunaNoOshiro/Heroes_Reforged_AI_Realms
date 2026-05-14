# Screen 26: Marketplace

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Resource exchange board with offer/receive grids, rate plaque, quantity slider, ledger preview, and trade confirmation.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Two opposing resource grids (offer left, receive right), arrowed
  exchange lane, rate plaque mid-screen, and a ledger strip above
  the footer buttons.
- Dense classic fantasy strategy UI: fixed 800x600 layout, ornate
  gold frame, red/brown/stone panels, compact 58x42 icon slots,
  right-click detail affordances, status text along the bottom.
- `mockup.html` defines visible regions only. Logic, transitions,
  and implementation notes live in this Markdown package.

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
| `player.resources` | `state.players.active.resources` | Current resource balances. |
| `market.rates` | `state.marketplace.currentRates` | Rates derived from owned marketplace count and ruleset. |
| `selectedOffer` | `state.ui.marketplace.offerResource` | Local draft of offered resource. |
| `selectedReceive` | `state.ui.marketplace.receiveResource` | Local draft of received resource. |
| `tradeAmount` | `state.ui.marketplace.amount` | Local draft amount before confirm. |

### Mechanics Mapping
- Rates derive from owned marketplaces plus ruleset constants; only
  the confirmed `TRADE_RESOURCES` command mutates player resources.
- Selection, target, and amount stay in local UI draft until the
  command (or close-route guard) accepts them.
- Resource IDs, building counts, and rate tables resolve through
  registries/content schemas; never hardcoded in view logic.

### Animation Contract
- Selected slots brighten; the exchange arrow pulses while a valid
  pair is selected; on reducer acceptance the offered amount counts
  down and the received amount counts up.
- Animation consumes reducer/route results; it never decides
  gameplay outcomes.
- Reduced-motion mode replaces transitions with static highlights
  and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/
  VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `marketplace`; system group: `town`; curation
  marker: `curated-pass-2`.
- Build runtime components from this package, not from third-party
  captures or external product pixels.
- Runtime code resolves presentation through asset IDs/manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and state bindings match the regions and `data-*` hooks in `mockup.html`; sibling `interactions.md` and `architecture.md` reference the same five state bindings.
- **Schema: ⚠** — Resource IDs cite [`resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) (singular `gem`), but the mockup's `Kaeliss` slot is not in that enum and [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `TRADE_RESOURCES` uses plural `gems`. Detail in Issues.
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md) Reads First this file; engine command lives in [`tasks/mvp/05-adventure-map/10-trade-resources-command.md`](../../../../../tasks/mvp/05-adventure-map/10-trade-resources-command.md); content tables in [`tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md`](../../../../../tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md).

## ⚠ Issues

- **Resource-id schema drift between `resource-id.schema.json` and `command.schema.json`.** Singular `gem` vs plural `gems` for the same slot, plus `gems` only appears in TRADE_RESOURCES. Per [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md), the canonical resource enum is `resource-id.schema.json`; `mvp.02-content-schemas.19-tavern-and-marketplace-tables` and the owning command task must align both. Skill did not edit either schema (Hard Prohibition D).
- **Mockup label `Kaeliss` not in any resource enum.** The mockup shows seven resource slots (Wood, Ore, Merc, Sulfur, Crystal, Kaeliss, Gold) but no canonical resource matches `Kaeliss`. Treat as a placeholder lore label for `gem`/`gems` or surface a separate registration request. Reference only — not edited (Hard Prohibition D).
- **`TRADE_RESOURCES.marketplaceId` not bound.** [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) defines an optional `marketplaceId` for trade commands; the screen package has no binding or selection. Per the owning command task `mvp.05-adventure-map.10-trade-resources-command`, the implementer should bind it to the visiting town's marketplace ID (or `null` when ambiguous). Suggested binding: `state.ui.marketplace.marketplaceId`.
- **Contract-sweep gaps (Hotkey column, drag affordances).** [`docs/architecture/wiki/_templates/contract-sweep.md`](../../_templates/contract-sweep.md) lists `26-marketplace` under drag-using screens and prescribes a Hotkey column; neither has been swept here. Hard Prohibition B forbids inventing them — flag only.
