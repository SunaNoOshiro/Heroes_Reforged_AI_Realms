# Screen 18: Map Object Tooltip
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
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature bank defenders, rewards, and attitude. | `content-schema/schemas/neutral-stack-template.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `hoverObject` | `state.ui.adventure.hoverObjectId` | Object under pointer or controller focus. |
| `publicInfo` | `selectors.mapObjects.publicTooltipInfo` | Name, type, owner, and visible hints. |
| `hiddenGuard` | `selectors.scouting.hiddenTooltipFields` | Masked fields due to fog/scouting rules. |
| `pinState` | `state.ui.tooltips.pinnedObjectId` | Local pinned tooltip state. |
| `anchorPosition` | `state.ui.pointer.anchorRect` | Screen-space placement only. |

### Commands And Events
- `OPEN_OBJECT_TOOLTIP` from `tooltip.open`: Sets tooltip hover/pin draft.
- `PIN_OBJECT_TOOLTIP` from `tooltip.pin`: Keeps tooltip visible while pointer moves.
- `OPEN_TOOLTIP_DETAIL` from `tooltip.details`: Routes when the object has a detailed viewer.
- `CLOSE_OBJECT_TOOLTIP` from `tooltip.close`: Clears tooltip UI draft only.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.map-object-tooltip.title`
- `ui.map-object-tooltip.actions.*`
- `ui.map-object-tooltip.status.*`
- `ui.map-object-tooltip.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.map-object-tooltip.background`
- `ui.map-object-tooltip.frame`
- `ui.map-object-tooltip.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.map-object-tooltip.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Tooltip data is presentation-only and visibility-filtered; hidden army counts, rewards, or ownership stay masked when fog/scouting rules require it.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
