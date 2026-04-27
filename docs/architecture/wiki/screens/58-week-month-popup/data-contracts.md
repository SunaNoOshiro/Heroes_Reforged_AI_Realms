# Screen 58: Week / Month Popup
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
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `calendar` | `state.calendar.currentDate` | Month/week/day after transition. |
| `eventRecord` | `state.calendar.pendingAnnouncement` | Week/month event to announce. |
| `growthEffects` | `selectors.calendar.visibleGrowthEffects` | Creature growth modifiers. |
| `resourceEffects` | `selectors.calendar.visibleResourceEffects` | Resource/income changes. |
| `acknowledged` | `state.ui.calendarAnnouncement.acknowledged` | Local acknowledgment state. |

### Commands And Events
- `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` from `calendarPopup.ok`: Clears pending UI announcement only.
- `OPEN_CALENDAR_CREATURE_INFO` from `calendarPopup.inspectCreature`: Shows creature info for month/week creature.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.week-month-popup.title`
- `ui.week-month-popup.actions.*`
- `ui.week-month-popup.status.*`
- `ui.week-month-popup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.week-month-popup.background`
- `ui.week-month-popup.frame`
- `ui.week-month-popup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.week-month-popup.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Appears after the calendar reducer advances and weekly/monthly events are already computed. OK only acknowledges visible results.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
