# Screen 08: Kingdom Overview
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
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `townRows` | `state.players.active.townIds` | Owned towns with build, income, and garrison summary. |
| `heroRows` | `state.players.active.heroIds` | Owned heroes with movement, mana, army strength, and location. |
| `incomeTotals` | `selectors.economy.dailyIncomeByResource` | Daily income preview from town and mine ownership. |
| `selectedRow` | `state.ui.kingdomOverview.selectedRowId` | Local focus row for keyboard and pointer navigation. |
| `warnings` | `selectors.adventure.kingdomWarnings` | Threats, idle heroes, empty towns, and blocked build state. |

### Commands And Events
- `OPEN_TOWN_SCREEN` from `kingdom.selectTown`: Sets selected town context; no economy mutation.
- `OPEN_HERO_SCREEN` from `kingdom.selectHero`: Sets selected hero context and preserves adventure camera.
- `FOCUS_ADVENTURE_ENTITY` from `kingdom.focusMap`: Centers camera on the selected town or hero.
- `CLOSE_KINGDOM_OVERVIEW` from `kingdom.close`: Returns to previous adventure selection.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.kingdom-overview.title`
- `ui.kingdom-overview.actions.*`
- `ui.kingdom-overview.status.*`
- `ui.kingdom-overview.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.kingdom-overview.background`
- `ui.kingdom-overview.frame`
- `ui.kingdom-overview.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.kingdom-overview.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Summarizes owned towns, heroes, income, garrison pressure, and movement readiness. Selecting a row focuses a town or hero; no gameplay command is committed until a route opens another screen.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
