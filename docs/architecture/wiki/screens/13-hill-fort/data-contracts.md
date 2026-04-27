# Screen 13: Hill Fort
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
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroArmy` | `state.heroes.byId[selected].army` | Hero stacks available for upgrade. |
| `upgradeTargets` | `selectors.creatures.availableHillFortUpgrades` | Upgrade path and target creature records. |
| `selectedStack` | `state.ui.hillFort.selectedStackIndex` | Local selected army slot. |
| `costPreview` | `selectors.economy.upgradeCostPreview` | Gold/resource cost for selected quantity. |
| `resources` | `state.players.active.resources` | Available resources for command guard. |

### Commands And Events
- `SELECT_HILL_FORT_STACK` from `hillFort.selectStack`: Updates selected upgrade preview.
- `UPGRADE_ARMY_STACK` from `hillFort.upgradeSelected`: Spends resources and replaces stack creature ID/count.
- `UPGRADE_ALL_ELIGIBLE_STACKS` from `hillFort.upgradeAll`: Applies all legal upgrades in deterministic order.
- `CLOSE_HILL_FORT` from `hillFort.close`: Returns to visited fort tile.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hill-fort.title`
- `ui.hill-fort.actions.*`
- `ui.hill-fort.status.*`
- `ui.hill-fort.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hill-fort.background`
- `ui.hill-fort.frame`
- `ui.hill-fort.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.hill-fort.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Each stack upgrade checks creature upgrade path, town/faction rules, hero ownership, resource cost, and destination army capacity before dispatching upgrade commands.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
