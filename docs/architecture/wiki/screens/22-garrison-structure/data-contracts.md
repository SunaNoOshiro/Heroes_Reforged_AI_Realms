# Screen 22: Garrison Structure
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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | `content-schema/schemas/hero.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroArmy` | `state.heroes.byId[selected].army` | Visiting hero stack row. |
| `garrisonArmy` | `state.mapObjects.byId[garrisonId].army` | Structure stack row. |
| `selectedStack` | `state.ui.garrisonTransfer.selectedStackRef` | Local drag/click selection. |
| `transferRules` | `selectors.armies.garrisonTransferRules` | Ownership, lock, capacity, and merge legality. |
| `splitDraft` | `state.ui.garrisonTransfer.splitQuantity` | Local split quantity before command. |

### Commands And Events
- `START_GARRISON_STACK_DRAG` from `garrison.dragStack`: Creates drag draft only.
- `TRANSFER_GARRISON_STACK` from `garrison.dropStack`: Moves, merges, swaps, or rejects stack transfer.
- `OPEN_SPLIT_STACK_DIALOG` from `garrison.splitStack`: Creates split quantity draft.
- `CLOSE_GARRISON_STRUCTURE` from `garrison.close`: Returns to visited map tile.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.garrison-structure.title`
- `ui.garrison-structure.actions.*`
- `ui.garrison-structure.status.*`
- `ui.garrison-structure.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.garrison-structure.background`
- `ui.garrison-structure.frame`
- `ui.garrison-structure.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.garrison-structure.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Transfers validate ownership, locked garrison flags, stack compatibility, one-creature-left rules where applicable, and capacity before reducer updates both armies.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
