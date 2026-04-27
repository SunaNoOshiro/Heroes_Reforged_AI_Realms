# Screen 30: Town Hall / Build Tree
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
| `town-presentation.schema.json` | Town layout, building slot presentation, flyby views, and presentation-only town bindings. | `content-schema/schemas/town-presentation.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.buildings` | `state.towns.byId[selected].buildings` | Built nodes. |
| `availableBuildings` | `state.towns.byId[selected].availableBuilds` | Available nodes from prerequisite graph. |
| `selectedBuilding` | `state.ui.buildTree.selectedBuildingId` | Local selected node. |
| `player.resources` | `state.players.active.resources` | Cost availability. |
| `builtToday` | `state.towns.byId[selected].builtToday` | Daily build guard. |

### Commands And Events
- `SELECT_BUILDING_NODE` from `buildTree.selectBuilding`: Updates detail and cost panel.
- `BUILD_BUILDING` from `buildTree.build`: Spends resources and marks building built.
- `CLOSE_BUILD_TREE` from `buildTree.close`: Returns to town.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.build-tree.title`
- `ui.build-tree.actions.*`
- `ui.build-tree.status.*`
- `ui.build-tree.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.build-tree.background`
- `ui.build-tree.frame`
- `ui.build-tree.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.build-tree.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Build validates ownership, prerequisites, resources, town hall/castle rules, and daily build flag before committing construction.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
