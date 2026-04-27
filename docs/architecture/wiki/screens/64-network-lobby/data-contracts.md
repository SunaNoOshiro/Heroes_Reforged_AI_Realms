# Screen 64: Network Lobby
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
| `sessionId` | `state.net.sessionId` | Network session identifier. |
| `players` | `state.net.lobby.players` | Connected players and slot assignment. |
| `chatMessages` | `state.net.lobby.chat` | Lobby chat log. |
| `compatibility` | `selectors.net.lobbyCompatibility` | Hash/version/ruleset match result. |
| `launchGuard` | `selectors.net.canLaunchSession` | All ready and compatible. |

### Commands And Events
- `SET_LOBBY_READY` from `network.ready`: Sends ready state to host/session.
- `SEND_LOBBY_CHAT` from `network.chat`: Sends chat message.
- `REQUEST_LOBBY_SLOT_CHANGE` from `network.slot`: Requests color/team/control slot change.
- `LAUNCH_NETWORK_GAME` from `network.launch`: Host starts deterministic session.
- `LEAVE_NETWORK_LOBBY` from `network.leave`: Disconnects or leaves lobby.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.network-lobby.title`
- `ui.network-lobby.actions.*`
- `ui.network-lobby.status.*`
- `ui.network-lobby.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.network-lobby.background`
- `ui.network-lobby.frame`
- `ui.network-lobby.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.multiplayer.*`
- `vfx.network-lobby.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Lobby state mirrors authoritative host/session messages. Launch is enabled only when content hashes, slots, scenario, teams, and ready state all match.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
