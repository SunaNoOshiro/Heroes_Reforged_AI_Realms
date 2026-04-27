# Screen 14: War Machine Factory
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
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `shopStock` | `state.mapObjects.byId[factoryId].warMachineStock` | Available machines and restock flags. |
| `heroMachines` | `state.heroes.byId[selected].warMachines` | Hero-owned machine slots. |
| `selectedMachine` | `state.ui.warMachineFactory.selectedMachineId` | Local selected machine. |
| `price` | `selectors.economy.selectedWarMachinePrice` | Gold cost and affordability. |
| `resources` | `state.players.active.resources.gold` | Gold available for purchase guard. |

### Commands And Events
- `SELECT_WAR_MACHINE` from `warFactory.selectMachine`: Updates price and slot preview.
- `BUY_WAR_MACHINE` from `warFactory.buy`: Spends gold, updates hero machine slot, decrements stock when limited.
- `CLOSE_WAR_MACHINE_FACTORY` from `warFactory.close`: Returns to adventure map.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.war-machine-factory.title`
- `ui.war-machine-factory.actions.*`
- `ui.war-machine-factory.status.*`
- `ui.war-machine-factory.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.war-machine-factory.background`
- `ui.war-machine-factory.frame`
- `ui.war-machine-factory.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.war-machine-factory.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Purchases validate hero ownership, machine slot availability, shop stock, resource cost, and existing machine state before committing.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
