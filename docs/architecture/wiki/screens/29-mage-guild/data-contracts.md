# Screen 29: Mage Guild
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
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, and buildings. | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes, legal target shapes, range rules, and targeting overlays. | `content-schema/schemas/targeting.schema.json` |
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.mageGuildLevel` | `state.towns.byId[selected].mageGuildLevel` | Available spell shelf levels. |
| `guildSpells` | `state.towns.byId[selected].mageGuildSpells` | Spell IDs offered by level. |
| `visitingHero` | `state.adventure.visitingHeroId` | Hero that can learn spells. |
| `hero.knownSpells` | `state.heroes.byId[visiting].knownSpells` | Known spell markers. |
| `hero.wisdom` | `state.heroes.byId[visiting].skills.wisdom` | Eligibility for higher spell levels. |

### Commands And Events
- `SELECT_GUILD_SPELL` from `mageGuild.selectSpell`: Updates spell detail and eligibility.
- `LEARN_SPELL` from `mageGuild.learnSpell`: Adds spell to hero if eligible.
- `CLOSE_MAGE_GUILD` from `mageGuild.close`: Returns to town.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.mage-guild.title`
- `ui.mage-guild.actions.*`
- `ui.mage-guild.status.*`
- `ui.mage-guild.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.mage-guild.background`
- `ui.mage-guild.frame`
- `ui.mage-guild.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.mage-guild.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Learning validates town mage guild level, hero presence, wisdom requirements, known spell duplication, and spell registry scope.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
