# Screen 21: External Dwelling
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
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `dwellingId` | `state.ui.adventure.pendingDwellingId` | Visited external dwelling. |
| `dwellingStock` | `state.mapObjects.byId[dwellingId].stock` | Weekly available creature count. |
| `selectedQuantity` | `state.ui.externalDwelling.quantity` | Local recruit draft. |
| `destinationArmy` | `state.heroes.byId[selected].army` | Hero army receiving recruits. |
| `costPreview` | `selectors.economy.externalDwellingCost` | Cost and affordability for quantity. |

### Commands And Events
- `SET_EXTERNAL_DWELLING_QUANTITY` from `dwelling.quantity`: Updates cost and destination preview.
- `RECRUIT_EXTERNAL_DWELLING_UNITS` from `dwelling.recruit`: Spends resources, decrements stock, updates hero army.
- `SET_EXTERNAL_DWELLING_MAX` from `dwelling.max`: Chooses max legal quantity.
- `CLOSE_EXTERNAL_DWELLING` from `dwelling.close`: Returns to map.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.external-dwelling.title`
- `ui.external-dwelling.actions.*`
- `ui.external-dwelling.status.*`
- `ui.external-dwelling.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.external-dwelling.background`
- `ui.external-dwelling.frame`
- `ui.external-dwelling.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.external-dwelling.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Recruitment validates dwelling ownership/visit state, weekly stock, resource cost, hero army capacity, and creature merge legality.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
