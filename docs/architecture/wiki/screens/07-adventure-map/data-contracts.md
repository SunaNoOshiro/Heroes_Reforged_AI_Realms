# Screen 07: Adventure Map
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
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature bank defenders, rewards, and attitude. | `content-schema/schemas/neutral-stack-template.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `map.tiles` | `state.adventure.visibleTiles` | Rendered from scenario map plus fog visibility. |
| `selectedHero` | `state.adventure.selectedHeroId` | Controls portrait, movement points, army, and path preview. |
| `pathPreview` | `state.ui.adventure.pathPreview` | UI draft until confirmed movement command. |
| `resources` | `state.players.active.resources` | Authoritative player resources. |
| `date` | `state.calendar.currentDate` | Month/week/day text and end-turn state. |

### Commands And Events
- `SELECT_ADVENTURE_HERO` from `adventure.selectHero`: Updates selected hero draft and side panel.
- `PREVIEW_HERO_PATH` from `adventure.previewPath`: Computes visible route without spending movement.
- `MOVE_HERO_ALONG_PATH` from `adventure.moveHero`: Consumes movement, reveals fog, may trigger object visit.
- `OPEN_TOWN_SCREEN` from `adventure.openTown`: Routes if selected town is owned/visible.
- `OPEN_ADVENTURE_SPELL_TARGETING` from `adventure.castSpell`: Creates spell targeting UI draft.
- `END_PLAYER_TURN` from `adventure.endTurn`: Commits turn transition and calendar updates.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.adventure-map.title`
- `ui.adventure-map.actions.*`
- `ui.adventure-map.status.*`
- `ui.adventure-map.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.adventure-map.background`
- `ui.adventure-map.frame`
- `ui.adventure-map.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.adventure-map.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Hero selection, path preview, tile movement, object visits, fog reveal, town/hero focus, spell targeting, and end-turn all dispatch deterministic commands.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
