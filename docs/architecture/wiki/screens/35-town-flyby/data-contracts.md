# Screen 35: Town Flyby
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
| `town-presentation.schema.json` | Town layout, building slot presentation, flyby views, and presentation-only town bindings. | `content-schema/schemas/town-presentation.schema.json` |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `townId` | `state.towns.selectedTownId` | Town being entered. |
| `factionId` | `state.towns.byId[selected].factionId` | Faction visuals and music. |
| `assetWarmup` | `state.ui.assetWarmup.townScreen` | Presentation loading state. |
| `cameraPath` | `selectors.presentation.townFlybyPath` | Deterministic presentation path from asset metadata. |
| `skipAvailable` | `config.ui.allowSkipCinematics` | Skip button availability. |

### Commands And Events
- `SKIP_TOWN_FLYBY` from `townFlyby.skip`: Completes presentation transition only.
- `COMPLETE_TOWN_FLYBY` from `townFlyby.complete`: Routes after assets are ready.
- `CANCEL_TOWN_ENTRY_AFTER_PRESENTATION_ERROR` from `townFlyby.errorBack`: Returns if required town data cannot load.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.town-flyby.title`
- `ui.town-flyby.actions.*`
- `ui.town-flyby.status.*`
- `ui.town-flyby.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.town-flyby.background`
- `ui.town-flyby.frame`
- `ui.town-flyby.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.town-flyby.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Presentation-only transition loads town panorama assets, faction audio, and hotspot metadata before opening the interactive town screen.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
