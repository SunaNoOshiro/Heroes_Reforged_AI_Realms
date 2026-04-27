# Screen 25: Building / Recruitment Dialog
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
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.id` | `state.towns.selectedTownId` | Town providing dwelling stock. |
| `dwelling.stock` | `state.towns.byId[selected].dwellingStock` | Available creatures by dwelling. |
| `selectedDwelling` | `state.ui.town.selectedDwellingId` | Local recruitment selection. |
| `recruitQuantity` | `state.ui.town.recruitQuantity` | Local draft until confirmed. |
| `destinationArmy` | `state.townRecruit.destinationArmy` | Hero or garrison target slots. |

### Commands And Events
- `SELECT_RECRUIT_DWELLING` from `recruit.selectDwelling`: Updates selected creature, stock, and cost preview.
- `SET_RECRUIT_QUANTITY` from `recruit.changeQuantity`: Updates local quantity and total cost.
- `SET_MAX_RECRUIT_QUANTITY` from `recruit.max`: Chooses max legal quantity from stock/resources/capacity.
- `RECRUIT_UNITS` from `recruit.confirm`: Spends resources, decrements stock, updates destination army.
- `CLOSE_RECRUITMENT_DIALOG` from `recruit.cancel`: Discards recruitment draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.building-recruitment-dialog.title`
- `ui.building-recruitment-dialog.actions.*`
- `ui.building-recruitment-dialog.status.*`
- `ui.building-recruitment-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.building-recruitment-dialog.background`
- `ui.building-recruitment-dialog.frame`
- `ui.building-recruitment-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.building-recruitment-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Recruit validates town ownership, built dwelling, available stock, resource cost, and army capacity before creating or merging a stack.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
