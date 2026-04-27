# Screen 34: Fort View
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
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `town-presentation.schema.json` | Town layout, building slot presentation, flyby views, and presentation-only town bindings. | `content-schema/schemas/town-presentation.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `fortLevel` | `state.towns.byId[selected].fortificationLevel` | Fort, Citadel, Castle, or none. |
| `wallDefinition` | `selectors.towns.fortificationBattleLayout` | Wall/tower/gate/moat definitions. |
| `growthBonus` | `selectors.towns.fortificationGrowthBonus` | Creature growth multiplier from fort tier. |
| `buildPrereqs` | `selectors.towns.nextFortUpgradePrereqs` | Next upgrade requirements. |
| `selectedSegment` | `state.ui.fortView.selectedSegment` | Local highlighted wall/tower segment. |

### Commands And Events
- `SELECT_FORT_SEGMENT` from `fortView.selectSegment`: Updates bonus detail plaque.
- `OPEN_BUILD_TREE_FOR_FORT` from `fortView.buildTree`: Focuses next fortification upgrade.
- `CLOSE_FORT_VIEW` from `fortView.close`: Returns to town.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.fort-view.title`
- `ui.fort-view.actions.*`
- `ui.fort-view.status.*`
- `ui.fort-view.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.fort-view.background`
- `ui.fort-view.frame`
- `ui.fort-view.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.fort-view.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Reads built fortification level and faction wall rules to expose battle layout, tower shots, moat presence, growth bonus, and build prerequisites.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
