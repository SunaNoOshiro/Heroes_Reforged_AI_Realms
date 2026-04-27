# Screen 28: Tavern
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
| `hero-class.schema.json` | Hero class growth weights, starting skills, and level-up offer rules. | `content-schema/schemas/hero-class.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroPool` | `state.tavern.weeklyHeroOffers` | Two current recruitable heroes. |
| `playerGold` | `state.players.active.resources.gold` | Hire cost availability. |
| `selectedOffer` | `state.ui.tavern.selectedHeroId` | Local selected hero card. |
| `rumor` | `state.tavern.currentRumorId` | Localized rumor text. |

### Commands And Events
- `SELECT_TAVERN_HERO` from `tavern.selectHero`: Updates selected hero details.
- `HIRE_TAVERN_HERO` from `tavern.hireHero`: Spends gold and adds hero to town/roster.
- `OPEN_THIEVES_GUILD` from `tavern.thievesGuild`: Routes to intelligence screen.
- `CLOSE_TAVERN` from `tavern.close`: Returns to town.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.tavern.title`
- `ui.tavern.actions.*`
- `ui.tavern.status.*`
- `ui.tavern.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.tavern.background`
- `ui.tavern.frame`
- `ui.tavern.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.tavern.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Hiring validates available hero pool, player gold, town/hero capacity, and weekly refresh rules before creating the hero.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
