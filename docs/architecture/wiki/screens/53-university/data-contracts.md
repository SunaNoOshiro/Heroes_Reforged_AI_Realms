# Screen 53: University
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
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `universityId` | `state.ui.university.sourceId` | Visited town or adventure university. |
| `offeredSkills` | `state.mapObjects.byId[universityId].offeredSkills` | Skill offer IDs. |
| `heroSkills` | `state.heroes.byId[selected].skills` | Current secondary skill set. |
| `selectedSkill` | `state.ui.university.selectedSkillId` | Local selected offer. |
| `learnGuard` | `selectors.heroes.universityLearnGuard` | Skill legality and affordability. |

### Commands And Events
- `SELECT_UNIVERSITY_SKILL` from `university.selectSkill`: Updates price and legality preview.
- `LEARN_UNIVERSITY_SKILL` from `university.learn`: Spends gold and adds/upgrades selected skill.
- `CLOSE_UNIVERSITY` from `university.close`: Returns to caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.university.title`
- `ui.university.actions.*`
- `ui.university.status.*`
- `ui.university.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.university.background`
- `ui.university.frame`
- `ui.university.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.university.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Learning validates hero ownership, open/upgradeable skill slots, offered skill records, max skill count, current mastery, price, and player gold.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
