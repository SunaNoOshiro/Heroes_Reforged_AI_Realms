# Screen 27: Thieves Guild
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
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `players` | `state.players.all` | Player order and colors. |
| `intelligenceLevel` | `state.townServices.thievesGuildLevel` | Controls visible columns. |
| `rankings` | `state.intelligence.rankings` | Computed ranking rows. |
| `selectedPlayer` | `state.ui.thievesGuild.selectedPlayerId` | Local selected row. |

### Commands And Events
- `SELECT_THIEVES_GUILD_ROW` from `thieves.selectPlayer`: Highlights row and detail footer.
- `SORT_THIEVES_GUILD_COLUMN` from `thieves.sort`: Changes local sort order only.
- `CLOSE_THIEVES_GUILD` from `thieves.close`: Returns to tavern/town context.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.thieves-guild.title`
- `ui.thieves-guild.actions.*`
- `ui.thieves-guild.status.*`
- `ui.thieves-guild.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.thieves-guild.background`
- `ui.thieves-guild.frame`
- `ui.thieves-guild.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.thieves-guild.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Visible columns depend on thieves guild access and scenario visibility rules; the screen reads intelligence state and does not mutate gameplay.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
