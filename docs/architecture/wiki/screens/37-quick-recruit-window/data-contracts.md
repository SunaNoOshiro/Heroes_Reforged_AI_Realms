# Screen 37: Quick Recruit Window
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
| `dwellingRows` | `selectors.towns.quickRecruitRows` | Built dwellings, stock, creature IDs, and costs. |
| `selectedRows` | `state.ui.quickRecruit.selectedDwellingIds` | Local checked rows. |
| `destinationArmy` | `selectors.towns.quickRecruitDestinationArmy` | Hero or garrison target. |
| `totalCost` | `selectors.economy.quickRecruitTotalCost` | Aggregated cost for selected rows. |
| `rowGuards` | `selectors.towns.quickRecruitRowGuards` | Per-row disabled reasons. |

### Commands And Events
- `TOGGLE_QUICK_RECRUIT_ROW` from `quickRecruit.toggleRow`: Updates selected rows and total cost.
- `SELECT_AFFORDABLE_RECRUITS` from `quickRecruit.selectAffordable`: Checks all currently affordable legal rows.
- `QUICK_RECRUIT_CREATURES` from `quickRecruit.commit`: Spends resources, decrements stock, updates destination army.
- `CLOSE_QUICK_RECRUIT` from `quickRecruit.close`: Discards local selections.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.quick-recruit-window.title`
- `ui.quick-recruit-window.actions.*`
- `ui.quick-recruit-window.status.*`
- `ui.quick-recruit-window.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.quick-recruit-window.background`
- `ui.quick-recruit-window.frame`
- `ui.quick-recruit-window.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.quick-recruit-window.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Each checked row validates dwelling built state, stock, resources, growth availability, destination capacity, and merge rules. Commit applies rows in deterministic order.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
