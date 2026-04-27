# Screen 59: Loading Screen
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
| `manifest.schema.json` | Pack identity, dependencies, content hashes, capabilities, and trust metadata. | `content-schema/schemas/manifest.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `loadingTask` | `state.ui.loading.taskId` | Scenario generation, save load, asset warmup, or route. |
| `progress` | `state.ui.loading.progress` | Named step progress for presentation. |
| `destination` | `state.ui.loading.destinationRoute` | Route after load. |
| `errors` | `state.ui.loading.errors` | Recoverable validation or IO errors. |
| `contentHashes` | `state.ui.loading.contentHashes` | Pack/hash data for deterministic load. |

### Commands And Events
- `CANCEL_LOADING_TASK` from `loading.cancel`: Cancels only recoverable tasks.
- `RETRY_LOADING_STEP` from `loading.retry`: Retries failed IO/presentation step.
- `COMPLETE_LOADING_TASK` from `loading.complete`: Routes when all required data is ready.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.loading-screen.title`
- `ui.loading-screen.actions.*`
- `ui.loading-screen.status.*`
- `ui.loading-screen.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.loading-screen.background`
- `ui.loading-screen.frame`
- `ui.loading-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.loading-screen.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Coordinates async presentation/content work while deterministic game state creation remains explicit and seed/hash based. Failures show localized recovery actions.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
