# Screen 19: Status Bar
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
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `hoverContext` | `state.ui.adventure.hoverContext` | Current hover/focus description. |
| `latestMessage` | `state.ui.messages.latest` | Most recent localized status event. |
| `messageHistory` | `state.ui.messages.history` | Client-side message history, not replay authoritative. |
| `resourceDeltas` | `selectors.economy.lastVisibleDeltas` | Recent command-result deltas. |
| `drawerOpen` | `state.ui.statusBar.drawerOpen` | Local expanded/collapsed state. |

### Commands And Events
- `EXPAND_STATUS_HISTORY` from `status.expand`: Shows recent UI feedback.
- `PIN_STATUS_MESSAGE` from `status.pinMessage`: Pins selected visible message locally.
- `CLEAR_STATUS_HISTORY` from `status.clear`: Clears client-only history, not gameplay records.
- `COLLAPSE_STATUS_HISTORY` from `status.collapse`: Returns to single-line status strip.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.status-bar.title`
- `ui.status-bar.actions.*`
- `ui.status-bar.status.*`
- `ui.status-bar.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.status-bar.background`
- `ui.status-bar.frame`
- `ui.status-bar.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.status-bar.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Status messages are UI feedback derived from hover context, command results, and localized errors. They do not control reducers or alter replay state.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
