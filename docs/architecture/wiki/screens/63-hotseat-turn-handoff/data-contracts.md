# Screen 63: Hotseat Turn Handoff
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
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `nextPlayer` | `state.turn.activePlayerId` | Player whose turn is about to be shown. |
| `calendar` | `state.calendar.currentDate` | Current turn date. |
| `privacyCover` | `state.ui.hotseat.coverActive` | Map hidden state. |
| `playerName` | `state.players.byId[next].displayName` | Localized/player-entered name. |
| `pendingAnnouncements` | `selectors.turn.pendingStartOfTurnAnnouncements` | Week/month or event popups after begin. |

### Commands And Events
- `BEGIN_HOTSEAT_TURN` from `hotseat.begin`: Clears privacy cover and shows next player state.
- `OPEN_OPTIONS_FROM_HANDOFF` from `hotseat.options`: Allows presentation settings before reveal.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hotseat-turn-handoff.title`
- `ui.hotseat-turn-handoff.actions.*`
- `ui.hotseat-turn-handoff.status.*`
- `ui.hotseat-turn-handoff.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hotseat-turn-handoff.background`
- `ui.hotseat-turn-handoff.frame`
- `ui.hotseat-turn-handoff.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.multiplayer.*`
- `vfx.hotseat-turn-handoff.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Appears only after turn transition commits. Begin reveals the next player view; no game commands are allowed while covered.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
