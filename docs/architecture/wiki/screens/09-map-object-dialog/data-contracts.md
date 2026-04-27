# Screen 09: Map Object Dialog
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
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `objectId` | `state.ui.adventure.pendingObjectVisit.objectId` | Map object selected by movement or click. |
| `heroId` | `state.adventure.selectedHeroId` | Visiting hero context. |
| `visitRecord` | `state.mapObjects.byId[objectId]` | Object type, visited flags, rewards, requirements, and scripts. |
| `rewardPreview` | `selectors.mapObjects.previewVisitReward` | Visible deterministic reward/cost preview. |
| `guardResult` | `selectors.mapObjects.visitGuard` | Eligibility, disabled reason, and command availability. |

### Commands And Events
- `VISIT_MAP_OBJECT` from `mapObject.accept`: Applies reward, visit flag, teleport, quest, or event result.
- `CANCEL_MAP_OBJECT_VISIT` from `mapObject.decline`: Closes without mutating gameplay.
- `OPEN_OBJECT_TOOLTIP` from `mapObject.details`: Shows public object details.
- `OPEN_RELATED_QUEST` from `mapObject.quest`: Focuses related quest entry when the object is a quest source.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.map-object-dialog.title`
- `ui.map-object-dialog.actions.*`
- `ui.map-object-dialog.status.*`
- `ui.map-object-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.map-object-dialog.background`
- `ui.map-object-dialog.frame`
- `ui.map-object-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.map-object-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Visit resolution reads the object record, visit state, guard requirement, reward table, and hero eligibility before dispatching a deterministic object interaction command.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
