# Screen 62: Multiplayer Setup
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
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `connectionType` | `state.ui.multiplayer.connectionType` | Hotseat, LAN, online, or direct. |
| `playerSlots` | `state.ui.multiplayer.playerSlots` | Player colors, teams, control type, ready flags. |
| `selectedScenario` | `state.ui.multiplayer.scenarioId` | Scenario/map draft. |
| `timerConfig` | `state.ui.multiplayer.timer` | Turn timer draft. |
| `contentHash` | `selectors.multiplayer.contentCompatibilityHash` | Pack/ruleset compatibility hash. |

### Commands And Events
- `SET_MULTIPLAYER_CONNECTION_TYPE` from `mpSetup.connectionType`: Changes setup draft.
- `EDIT_MULTIPLAYER_SLOT` from `mpSetup.editSlot`: Updates player slot draft.
- `HOST_MULTIPLAYER_SESSION` from `mpSetup.host`: Creates session or hotseat game draft.
- `JOIN_MULTIPLAYER_SESSION` from `mpSetup.join`: Routes to network lobby.
- `CLOSE_MULTIPLAYER_SETUP` from `mpSetup.back`: Discards draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.multiplayer-setup.title`
- `ui.multiplayer-setup.actions.*`
- `ui.multiplayer-setup.status.*`
- `ui.multiplayer-setup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.multiplayer-setup.background`
- `ui.multiplayer-setup.frame`
- `ui.multiplayer-setup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.multiplayer.*`
- `vfx.multiplayer-setup.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Creates a multiplayer setup draft, validates identical content hashes/ruleset, assigns player slots, and routes to hotseat handoff or network lobby.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
