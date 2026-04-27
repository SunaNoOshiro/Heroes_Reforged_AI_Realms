# Screen 01: Main Menu
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
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `menu.commands` | `state.shell.availableCommands` | Controls enabled by shell mode and platform capabilities. |
| `lastSaveAvailable` | `state.persistence.hasLoadableSave` | Load button is disabled when no compatible save manifest exists. |
| `quitGuard` | `state.shell.quitRequiresConfirmation` | Quit opens confirmation instead of closing immediately when required. |

### Commands And Events
- `OPEN_NEW_GAME_SETUP` from `mainMenu.newGame`: Creates local setup draft only.
- `OPEN_LOAD_GAME` from `mainMenu.loadGame`: Reads save manifests; does not load until a slot is confirmed.
- `OPEN_HIGH_SCORES` from `mainMenu.highScore`: Reads completed-game score records.
- `OPEN_CREDITS_OR_INTRO` from `mainMenu.credits`: Routes to presentation-only cinematic shell.
- `REQUEST_QUIT_CONFIRMATION` from `mainMenu.quit`: No gameplay mutation.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.main-menu.title`
- `ui.main-menu.actions.*`
- `ui.main-menu.status.*`
- `ui.main-menu.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.main-menu.background`
- `ui.main-menu.frame`
- `ui.main-menu.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.main-menu.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Routes only into setup, save/load, high scores, credits/options, or quit confirmation. No deterministic gameplay state is created until New Game completes setup.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
