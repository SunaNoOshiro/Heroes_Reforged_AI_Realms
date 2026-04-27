# Screen 51: Split Stack Dialog
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
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `sourceStack` | `state.ui.splitStack.sourceStackRef` | Caller-provided stack reference. |
| `destinationSlot` | `state.ui.splitStack.destinationSlotRef` | Caller-provided target slot. |
| `quantity` | `state.ui.splitStack.quantity` | Local split amount. |
| `splitGuard` | `selectors.armies.splitStackGuard` | Count, ownership, capacity, and merge legality. |
| `caller` | `state.ui.splitStack.returnScreen` | Screen to refresh after split. |

### Commands And Events
- `SET_SPLIT_STACK_QUANTITY` from `splitStack.changeQuantity`: Updates preview only.
- `SET_SPLIT_STACK_ONE` from `splitStack.one`: Sets quantity to one if legal.
- `SET_SPLIT_STACK_MAX` from `splitStack.max`: Sets max legal split.
- `SPLIT_ARMY_STACK` from `splitStack.confirm`: Updates source and destination army slots.
- `CANCEL_SPLIT_STACK` from `splitStack.cancel`: Discards split draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.split-stack-dialog.title`
- `ui.split-stack-dialog.actions.*`
- `ui.split-stack-dialog.status.*`
- `ui.split-stack-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.split-stack-dialog.background`
- `ui.split-stack-dialog.frame`
- `ui.split-stack-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.split-stack-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Split validates source count, destination slot availability, merge legality, minimum one creature in source where required, and caller ownership rules.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
