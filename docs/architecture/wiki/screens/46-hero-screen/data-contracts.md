# Screen 46: Hero Screen
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
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `hero-class.schema.json` | Hero class growth weights, starting skills, and level-up offer rules. | `content-schema/schemas/hero-class.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `hero.id` | `state.heroes.selectedHeroId` | Current hero context. |
| `hero.primaryStats` | `state.heroes.byId[selected].stats` | Attack, defense, power, knowledge. |
| `hero.skills` | `state.heroes.byId[selected].secondarySkills` | Skill grid and tooltips. |
| `hero.equipment` | `state.heroes.byId[selected].equipment` | Paper doll slots. |
| `hero.backpack` | `state.heroes.byId[selected].backpack` | Backpack inventory. |
| `hero.army` | `state.heroes.byId[selected].army` | Army row and stack operations. |

### Commands And Events
- `EQUIP_HERO_ARTIFACT` from `hero.equipArtifact`: Moves artifact from backpack to legal slot.
- `UNEQUIP_HERO_ARTIFACT` from `hero.unequipArtifact`: Moves equipment to backpack if capacity allows.
- `OPEN_HERO_SPELLBOOK` from `hero.openSpellBook`: Routes with selected hero and spell context.
- `OPEN_QUEST_LOG` from `hero.questLog`: Routes to active quest list.
- `OPEN_SPLIT_STACK_DIALOG` from `hero.splitStack`: Creates stack split draft.
- `REQUEST_DISMISS_HERO` from `hero.dismiss`: Requires explicit confirmation.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hero-screen.title`
- `ui.hero-screen.actions.*`
- `ui.hero-screen.status.*`
- `ui.hero-screen.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hero-screen.background`
- `ui.hero-screen.frame`
- `ui.hero-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.hero-screen.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Artifact equip/unequip, backpack drag/drop, army stack movement, hero dismissal guard, quest log, spellbook access, and right-click detail consume hero selectors and validated commands.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
