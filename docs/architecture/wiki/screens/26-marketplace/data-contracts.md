# Screen 26: Marketplace
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
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `player.resources` | `state.players.active.resources` | Current resource balances. |
| `market.rates` | `state.marketplace.currentRates` | Rates derived from market count and ruleset. |
| `selectedOffer` | `state.ui.marketplace.offerResource` | Local offered resource. |
| `selectedReceive` | `state.ui.marketplace.receiveResource` | Local received resource. |
| `tradeAmount` | `state.ui.marketplace.amount` | Local amount before confirm. |

### Commands And Events
- `SELECT_MARKET_OFFER_RESOURCE` from `market.selectOffer`: Updates rate preview and valid receive targets.
- `SELECT_MARKET_RECEIVE_RESOURCE` from `market.selectReceive`: Updates output preview.
- `SET_MARKET_TRADE_AMOUNT` from `market.changeAmount`: Updates draft quantity and result.
- `TRADE_RESOURCES` from `market.trade`: Commits resource exchange.
- `CLOSE_MARKETPLACE` from `market.close`: Returns to town.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.marketplace.title`
- `ui.marketplace.actions.*`
- `ui.marketplace.status.*`
- `ui.marketplace.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.marketplace.background`
- `ui.marketplace.frame`
- `ui.marketplace.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.marketplace.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Trade rates derive from owned marketplaces and ruleset constants; only confirmed trades mutate player resources.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
