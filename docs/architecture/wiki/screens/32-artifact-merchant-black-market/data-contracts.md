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
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `marketStock` | `state.towns.byId[selected].artifactMarketStock` | Available artifact IDs and sold state. |
| `selectedArtifact` | `state.ui.artifactMarket.selectedArtifactId` | Local selected artifact. |
| `heroBackpack` | `state.heroes.byId[visiting].backpack` | Inventory target for purchases. |
| `pricePreview` | `selectors.economy.artifactMarketPrice` | Buy/sell value and affordability. |
| `gold` | `state.players.active.resources.gold` | Gold guard for purchase. |

### Commands And Events
- `SELECT_ARTIFACT_MARKET_ITEM` from `artifactMarket.selectShelf`: Updates item details and price.
- `BUY_ARTIFACT` from `artifactMarket.buy`: Spends gold, moves artifact to backpack, marks stock sold.
- `SELL_ARTIFACT` from `artifactMarket.sell`: Removes backpack item and adds gold if selling is allowed.
- `CLOSE_ARTIFACT_MARKET` from `artifactMarket.close`: Returns to town service strip.

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
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Availability comes from market stock, rarity rules, hero inventory capacity, artifact restrictions, and player gold before purchase or sale commands commit.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
