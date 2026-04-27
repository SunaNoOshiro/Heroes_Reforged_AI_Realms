# Screen 48: Level Up Dialog
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
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroId` | `state.ui.levelUp.heroId` | Hero receiving the level. |
| `primaryGain` | `state.ui.levelUp.primaryStatGain` | Resolved deterministic stat gain. |
| `skillChoices` | `state.ui.levelUp.skillChoices` | Two legal secondary skill options. |
| `selectedChoice` | `state.ui.levelUp.selectedChoiceId` | Local choice before confirmation. |
| `experience` | `state.heroes.byId[heroId].experience` | XP bar and next-level threshold. |

### Commands And Events
- `SELECT_LEVEL_UP_CHOICE` from `levelUp.selectLeft`: Updates local selected skill.
- `SELECT_LEVEL_UP_CHOICE` from `levelUp.selectRight`: Updates local selected skill.
- `APPLY_HERO_LEVEL_UP` from `levelUp.confirm`: Applies primary stat and selected secondary skill.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.level-up-dialog.title`
- `ui.level-up-dialog.actions.*`
- `ui.level-up-dialog.status.*`
- `ui.level-up-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.level-up-dialog.background`
- `ui.level-up-dialog.frame`
- `ui.level-up-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.level-up-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Level-up choices are produced deterministically from hero class, existing skills, ruleset weights, seed state, and max skill constraints. Selecting a skill commits exactly one level result.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
