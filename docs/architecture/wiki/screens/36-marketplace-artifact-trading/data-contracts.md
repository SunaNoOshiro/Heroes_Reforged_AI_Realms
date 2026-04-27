# Screen 36: Marketplace Artifact Trading
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
| `heroArtifacts` | `state.heroes.byId[visiting].artifacts` | Equipped and backpack artifacts. |
| `selectedOffer` | `state.ui.artifactTrading.offerArtifactId` | Local artifact being offered. |
| `selectedRequest` | `state.ui.artifactTrading.requestId` | Local requested gold/resource/artifact outcome. |
| `quote` | `selectors.economy.artifactTradeQuote` | Deterministic trade valuation. |
| `tradeGuard` | `selectors.economy.artifactTradeGuard` | Eligibility, lock, capacity, and affordability. |

### Commands And Events
- `SELECT_ARTIFACT_TRADE_OFFER` from `artifactTrade.selectOffer`: Places artifact on offer scale locally.
- `SELECT_ARTIFACT_TRADE_QUOTE` from `artifactTrade.selectQuote`: Updates requested outcome.
- `TRADE_ARTIFACT` from `artifactTrade.commit`: Moves/removes artifact and applies quote result.
- `CLOSE_ARTIFACT_TRADING` from `artifactTrade.close`: Returns to main marketplace.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.marketplace-artifact-trading.title`
- `ui.marketplace-artifact-trading.actions.*`
- `ui.marketplace-artifact-trading.status.*`
- `ui.marketplace-artifact-trading.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.marketplace-artifact-trading.background`
- `ui.marketplace-artifact-trading.frame`
- `ui.marketplace-artifact-trading.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.marketplace-artifact-trading.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Trade commands check artifact ownership, locked equipped slots, trade eligibility, market availability, valuation formulas, backpack capacity, and gold/resource outcomes.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
