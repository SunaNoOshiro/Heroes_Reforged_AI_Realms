# Screen 11: Quest Log
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
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `questFilter` | `state.ui.questLog.filter` | Local tab: active, completed, failed, or all. |
| `questRows` | `selectors.quests.visibleQuestRows` | Quest rows visible to the active player. |
| `selectedQuest` | `state.ui.questLog.selectedQuestId` | Local selected quest. |
| `requirements` | `selectors.quests.selectedQuestRequirements` | Artifacts, creatures, resources, hero level, or deadline. |
| `rewardPreview` | `selectors.quests.selectedQuestRewards` | Visible reward slots from quest registry. |

### Commands And Events
- `SELECT_QUEST_LOG_ENTRY` from `questLog.selectQuest`: Updates selected details only.
- `SET_QUEST_LOG_FILTER` from `questLog.changeTab`: Filters rows without mutating quests.
- `FOCUS_QUEST_SOURCE` from `questLog.showSource`: Centers camera on a known quest source object.
- `CLOSE_QUEST_LOG` from `questLog.close`: Returns to caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.quest-log.title`
- `ui.quest-log.actions.*`
- `ui.quest-log.status.*`
- `ui.quest-log.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.quest-log.background`
- `ui.quest-log.frame`
- `ui.quest-log.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.quest-log.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Quest state is read from scenario quest records and hero/player progress. The log can focus a source object or reveal completion requirements; it does not grant rewards.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
