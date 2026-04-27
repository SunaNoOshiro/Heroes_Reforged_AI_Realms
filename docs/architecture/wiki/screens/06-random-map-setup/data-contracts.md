# Screen 06: Random Map Generator Settings
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
| `templateId` | `state.ui.rmg.templateId` | Selected random map template. |
| `mapSize` | `state.ui.rmg.mapSize` | Small/medium/large/extra large dimensions. |
| `players` | `state.ui.rmg.players` | Player count, AI/human flags, teams. |
| `seed` | `state.ui.rmg.seed` | Explicit deterministic seed. |
| `zonePreview` | `selectors.rmg.templateZonePreview` | Preview graph for template and options. |

### Commands And Events
- `SELECT_RMG_TEMPLATE` from `rmg.selectTemplate`: Updates zone preview.
- `ROLL_RMG_SEED` from `rmg.rollSeed`: Creates local deterministic seed draft.
- `GENERATE_RANDOM_MAP` from `rmg.generate`: Builds scenario data from validated draft.
- `CLOSE_RANDOM_MAP_SETUP` from `rmg.back`: Discards RMG draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.random-map-setup.title`
- `ui.random-map-setup.actions.*`
- `ui.random-map-setup.status.*`
- `ui.random-map-setup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.random-map-setup.background`
- `ui.random-map-setup.frame`
- `ui.random-map-setup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.random-map-setup.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Edits an RMG draft only. Generate validates template compatibility, player slots, content packs, deterministic seed, and ruleset before building scenario data.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
