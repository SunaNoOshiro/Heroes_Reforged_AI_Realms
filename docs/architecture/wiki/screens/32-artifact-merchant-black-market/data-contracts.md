# Screen 32: Artifact Merchant / Black Market
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `artifact.schema.json` | Artifact records and rarity, slot, and restriction rules. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by costs and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched by this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Screen-specific registries | Heroes, towns, artifacts, and player resources resolved from runtime selectors. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `marketStock` | `state.towns.byId[<selectedTownId>].artifactMarketStock` | Available artifact IDs and sold state. |
| `selectedArtifact` | `state.ui.artifactMarket.selectedArtifactId` | Local-UI selection, not persisted. |
| `heroBackpack` | `state.heroes.byId[<visitingHeroId>].backpack` | Inventory target for purchases. |
| `pricePreview` | `selectors.economy.artifactMarketPrice` | Buy/sell value and affordability. |
| `gold` | `state.players.active.resources.gold` | Gold guard for purchase. |

### Commands And Events
Tokens here follow [`screen-command-coverage.json`](../../../screen-command-coverage.json) classifications. Schema-backed commands dispatch through the shared command hook; `SELECT_` and `CLOSE_` tokens are UI-local routing per the prefix list in that coverage map.

- `SELECT_ARTIFACT_MARKET_ITEM` — **local-ui** (`SELECT_` prefix). Writes `state.ui.artifactMarket.selectedArtifactId`; refreshes detail panel and price tag.
- `BUY_ARTIFACT` — **command** ([`command.schema.json` § `buyArtifact`](../../../../../content-schema/schemas/command.schema.json)). Payload `{ kind: "BUY_ARTIFACT", heroId, marketId, artifactId, metadata }`. Spends gold, moves artifact into hero backpack, marks stock sold.
- `SELL_ARTIFACT` — **command** ([`command.schema.json` § `sellArtifact`](../../../../../content-schema/schemas/command.schema.json)). Payload `{ kind: "SELL_ARTIFACT", heroId, marketId, artifactId, metadata }`. Removes the backpack artifact and credits the quoted gold when the variant allows selling.
- `CLOSE_ARTIFACT_MARKET` — **local-ui** (`CLOSE_` prefix). Returns to [`24-town-screen`](../24-town-screen/).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.artifact-merchant-black-market.title`
- `ui.artifact-merchant-black-market.actions.*`
- `ui.artifact-merchant-black-market.status.*`
- `ui.artifact-merchant-black-market.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.artifact-merchant-black-market.background`
- `ui.artifact-merchant-black-market.frame`
- `ui.artifact-merchant-black-market.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.artifact-merchant-black-market.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records named by the owning system.
- Never persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Availability is gated by market stock, rarity rules, hero inventory capacity, artifact restrictions, and player gold before `BUY_ARTIFACT` or `SELL_ARTIFACT` commits.
- Missing presentation may fall back through the asset resolver per [`asset-loading.md`](../../../asset-loading.md).
- Missing gameplay records, invalid commands, or unresolved content IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and command tokens here match sibling [`spec.md`](./spec.md), [`interactions.md`](./interactions.md), and `mockup.html` (`data-action="artifactMarket.buy" | "sell" | "close"`).
- **Schema: ⚠** — Both `BUY_ARTIFACT` and `SELL_ARTIFACT` exist in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and require `marketId` in their payloads, but no selector in this package surfaces a market ID. Detailed in `## ⚠ Issues`. `SELECT_ARTIFACT_MARKET_ITEM` and `CLOSE_ARTIFACT_MARKET` are correctly classified as local-ui under the `SELECT_` / `CLOSE_` prefix lists in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Reducer task [`phase-2.01-spells-artifacts.10-buy-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/10-buy-artifact-command.md) owns `BUY_ARTIFACT` / `SELL_ARTIFACT`; screen task [`phase-2.07-ui-screen-backlog.32-artifact-merchant-black-market-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/32-artifact-merchant-black-market-screen.md) owns wiring.

## ⚠ Issues

- **`marketId` selector missing.** The closed payloads `buyArtifact` and `sellArtifact` in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) both require `marketId: stringId`, but no `marketStock` / `selectedArtifact` binding in this file or sibling [`architecture.md`](./architecture.md) names a market entity. Owner: [`phase-2.01-spells-artifacts.10-buy-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/10-buy-artifact-command.md) must surface either `state.towns.byId[<townId>].artifactMarketId` or an equivalent deterministic derivation, then update this table and the interactions row. Flagged rather than rewritten per Hard Prohibition B (do not invent the binding).
- **Missing `data-inventory.md` rows.** `state.towns.byId[].artifactMarketStock` and `state.ui.artifactMarket.selectedArtifactId` are not registered in [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md root contract, the owning reducer task must add the rows. Suggested values: stock → domain=`towns`, persistence=`indexeddb`, retention=`session`; selectedArtifactId → domain=`ui`, persistence=`none`. Per Hard Prohibition D, this audit does not edit `data-inventory.md`.
