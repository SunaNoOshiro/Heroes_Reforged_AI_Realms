# Screen 02: New Game Setup
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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | `content-schema/schemas/hero.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `setupMode` | `state.ui.newGame.mode` | Single, campaign, random, multiplayer, or tutorial draft. |
| `scenarioList` | `selectors.scenarios.availableScenarios` | Compatible scenario records from installed packs. |
| `selectedScenario` | `state.ui.newGame.selectedScenarioId` | Local selected scenario. |
| `playerSlots` | `state.ui.newGame.playerSlots` | Human/AI/open/closed player slot draft. |
| `difficulty` | `state.ui.newGame.difficulty` | Ruleset difficulty draft. |

### Commands And Events
- `SET_NEW_GAME_MODE` from `newGame.selectMode`: Updates setup draft and visible fields.
- `SELECT_SCENARIO` from `newGame.selectScenario`: Updates preview and player slots.
- `CREATE_GAME_FROM_SETUP` from `newGame.start`: Validates setup and creates deterministic initial game request.
- `CANCEL_NEW_GAME_SETUP` from `newGame.back`: Discards setup draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.new-game-setup.title`
- `ui.new-game-setup.actions.*`
- `ui.new-game-setup.status.*`
- `ui.new-game-setup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.new-game-setup.background`
- `ui.new-game-setup.frame`
- `ui.new-game-setup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.new-game-setup.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Creates a setup draft only. Starting the game validates selected scenario or generator config, pack compatibility, player slots, victory/loss conditions, and deterministic seed.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
