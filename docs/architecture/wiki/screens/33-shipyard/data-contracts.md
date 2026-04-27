# Screen 33: Shipyard
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
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `shipyardId` | `state.ui.shipyard.sourceId` | Town building or adventure shipyard object. |
| `spawnTiles` | `selectors.towns.shipyardBoatSpawnTiles` | Legal adjacent water tiles. |
| `selectedTile` | `state.ui.shipyard.selectedSpawnTile` | Local chosen spawn tile. |
| `cost` | `selectors.economy.shipyardBoatCost` | Wood/ore/gold requirement and affordability. |
| `resources` | `state.players.active.resources` | Resource guard for build command. |

### Commands And Events
- `SELECT_BOAT_SPAWN_TILE` from `shipyard.selectTile`: Updates spawn preview.
- `BUILD_BOAT` from `shipyard.build`: Spends resources and creates boat entity at selected tile.
- `CLOSE_SHIPYARD` from `shipyard.close`: Returns to caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.shipyard.title`
- `ui.shipyard.actions.*`
- `ui.shipyard.status.*`
- `ui.shipyard.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.shipyard.background`
- `ui.shipyard.frame`
- `ui.shipyard.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.shipyard.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Boat construction validates shipyard building/object, available water spawn tile, existing boat occupancy, resources, and one-boat-per-tile rules.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
