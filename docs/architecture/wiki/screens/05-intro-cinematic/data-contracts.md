# Screen 05: Intro / Outro Cinematics
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
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `cinematicId` | `state.ui.cinematic.cinematicId` | Manifest ID for the clip. |
| `playbackState` | `state.ui.cinematic.playback` | Client playback progress. |
| `subtitles` | `localization.cinematics[cinematicId]` | Subtitle cues. |
| `skipAllowed` | `config.ui.allowSkipCinematics` | Skip availability. |
| `destination` | `state.ui.cinematic.returnRoute` | Route after playback/skip. |

### Commands And Events
- `SKIP_CINEMATIC` from `cinematic.skip`: Completes presentation route only.
- `COMPLETE_CINEMATIC` from `cinematic.complete`: Routes after final cue.
- `TOGGLE_CINEMATIC_SUBTITLES` from `cinematic.subtitles`: Updates local presentation setting.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.intro-cinematic.title`
- `ui.intro-cinematic.actions.*`
- `ui.intro-cinematic.status.*`
- `ui.intro-cinematic.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.intro-cinematic.background`
- `ui.intro-cinematic.frame`
- `ui.intro-cinematic.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.intro-cinematic.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Resolves cinematic manifest, localization subtitles, audio cue, playback progress, and skip policy. It never mutates deterministic gameplay except route completion events.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
