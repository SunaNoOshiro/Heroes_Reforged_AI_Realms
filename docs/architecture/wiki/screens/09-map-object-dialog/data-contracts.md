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
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `map-object.schema.json` | Map object `category`, `interactionModel`, `rewards[]`, `cooldown`, `placementRules`, and `presentation` resolution. | [`content-schema/schemas/map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json) |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `neutral-stack-template.schema.json` | Neutral stack composition for guarded rewards. | [`content-schema/schemas/neutral-stack-template.schema.json`](../../../../../content-schema/schemas/neutral-stack-template.schema.json) |
| `artifact.schema.json` | Artifact rewards, tooltip effects, equip-slot eligibility checks. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

### Runtime State Selectors
| UI Element | Selector / Slice | Notes |
| --- | --- | --- |
| `objectId` | `state.ui.adventure.pendingObjectVisit.objectId` | Map object selected by movement or click. Transient UI slice. |
| `heroId` | `state.adventure.selectedHeroId` | Visiting hero context. |
| `visitRecord` | `state.mapObjects.byId[objectId]` | Object type, visited flags, rewards, requirements, scripts. |
| `rewardPreview` | `selectors.mapObjects.previewVisitReward` | Deterministic reward / cost preview. |
| `guardResult` | `selectors.mapObjects.visitGuard` | Eligibility, disabled reason, command availability. |

### Commands And Local-UI Events
| Token | Class | Origin | Effect |
| --- | --- | --- | --- |
| `VISIT_MAP_OBJECT` | schema command | `mapObject.accept` | Reducer applies reward, visit flag, teleport, quest hook, or event result. See [`command-schema.md` § VISIT_MAP_OBJECT](../../../command-schema.md#visit_map_object). |
| `CANCEL_MAP_OBJECT_VISIT` | local-ui (`CANCEL_` prefix) | `mapObject.decline` | Clears `state.ui.adventure.pendingObjectVisit`; no engine mutation. |
| `OPEN_OBJECT_TOOLTIP` | local-ui (`OPEN_` prefix) | `mapObject.details` | Opens `18-map-object-tooltip` over the current dialog. |
| `OPEN_RELATED_QUEST` | local-ui (`OPEN_` prefix) | `mapObject.quest` | Focuses the related quest entry in `11-quest-log`. |

Prefix recognition is enforced by
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
and `npm run validate:commands`.

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
- `error.dispatcher.rejected.body` (inline tooltip on a rejected
  `VISIT_MAP_OBJECT`; see sibling `interactions.md` § Error surfaces)

### Asset, Sound, And VFX IDs
- `ui.map-object-dialog.background`
- `ui.map-object-dialog.frame`
- `ui.map-object-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.map-object-dialog.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Visit resolution reads the object record, visit state, guard
  requirement, reward table, and hero eligibility **before**
  dispatching `VISIT_MAP_OBJECT`.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Token / origin / effect rows match the Actions table
  in sibling `interactions.md`; bindings match sibling `spec.md`
  § State Bindings.
- **Schema: ✔** — Every schema row resolves under
  [`content-schema/schemas/`](../../../../../content-schema/schemas/);
  `map-object.schema.json` enum surface (`category`,
  `interactionModel`, `cooldown.kind`) is consumed verbatim.
  `VISIT_MAP_OBJECT` is a closed-enum kind in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  references this file; reducer task
  [`mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`](../../../../../tasks/mvp/05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md)
  owns `VISIT_MAP_OBJECT` and reads sibling `interactions.md`.

## ⚠ Issues

_None._
