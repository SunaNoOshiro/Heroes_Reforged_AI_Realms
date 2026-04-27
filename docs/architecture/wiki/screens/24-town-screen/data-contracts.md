# Screen 24: Town Screen
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
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | `content-schema/schemas/hero.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `town-presentation.schema.json` | Town layout, building slot presentation, flyby views, and presentation-only town bindings. | `content-schema/schemas/town-presentation.schema.json` |
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.id` | `state.towns.selectedTownId` | Current town context. |
| `town.buildings` | `state.towns.byId[selected].buildings` | Controls hotspots, built state, and availability. |
| `dailyBuild` | `state.towns.byId[selected].builtToday` | Disables construction after one build. |
| `garrison` | `state.towns.byId[selected].garrison` | Town army row. |
| `visitingHero` | `state.adventure.visitingHeroId` | Visiting hero army row and hero portrait. |

### Commands And Events
- `SELECT_TOWN_BUILDING` from `town.selectBuilding`: Highlights hotspot and updates status line.
- `OPEN_BUILD_TREE` from `town.openBuildTree`: Routes with selected town context.
- `OPEN_RECRUITMENT_DIALOG` from `town.recruit`: Opens dwelling/town recruit contract.
- `OPEN_MAGE_GUILD` from `town.mageGuild`: Uses visiting hero eligibility if present.
- `TRANSFER_TOWN_ARMY_STACK` from `town.transferArmy`: Moves stack after ownership/capacity checks.
- `CLOSE_TOWN_SCREEN` from `town.exit`: Returns to adventure map focus.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.town-screen.title`
- `ui.town-screen.actions.*`
- `ui.town-screen.status.*`
- `ui.town-screen.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.town-screen.background`
- `ui.town-screen.frame`
- `ui.town-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.town-screen.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Building inspection, one-build-per-day construction, recruitment, mage guild/tavern/market routing, garrison transfer, visiting hero context, and exit use town selectors and commands.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
