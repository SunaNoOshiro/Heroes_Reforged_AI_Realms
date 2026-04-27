# Screen 55: Save / Load
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
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, and save/load metadata. | `content-schema/schemas/scenario.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `manifest.schema.json` | Pack identity, dependencies, content hashes, capabilities, and trust metadata. | `content-schema/schemas/manifest.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `mode` | `state.ui.saveLoad.mode` | Save or load mode. |
| `slots` | `selectors.persistence.saveSlotManifests` | Save metadata list. |
| `selectedSlot` | `state.ui.saveLoad.selectedSlotId` | Local selected slot. |
| `compatibility` | `selectors.persistence.selectedSaveCompatibility` | Version/hash/migration result. |
| `overwriteGuard` | `selectors.persistence.overwriteGuard` | Overwrite availability and confirmation need. |

### Commands And Events
- `SELECT_SAVE_SLOT` from `saveLoad.selectSlot`: Updates preview and compatibility.
- `SAVE_GAME_SLOT` from `saveLoad.save`: Writes save manifest and payload after overwrite guard.
- `LOAD_GAME_SLOT` from `saveLoad.load`: Validates and loads selected save.
- `REQUEST_DELETE_SAVE_SLOT` from `saveLoad.delete`: Requires confirmation.
- `CLOSE_SAVE_LOAD` from `saveLoad.back`: Returns to caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.save-load.title`
- `ui.save-load.actions.*`
- `ui.save-load.status.*`
- `ui.save-load.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.save-load.background`
- `ui.save-load.frame`
- `ui.save-load.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.save-load.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Reads save manifests first. Loading validates schema version, content hashes, pack compatibility, ruleset version, and migration availability before hydrating state.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
