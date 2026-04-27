# Screen 50: Creature Info
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
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `ability.schema.json` | Unit and hero abilities shown in detail panels, combat previews, and validation text. | `content-schema/schemas/ability.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, and buildings. | `content-schema/schemas/effect.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `creatureId` | `state.ui.creatureInfo.creatureId` | Creature record to display. |
| `stackContext` | `state.ui.creatureInfo.stackContext` | Hero/combat/dwelling/reward source. |
| `baseStats` | `registries.creatures.byId[creatureId].stats` | Base attack, defense, damage, health, speed, shots. |
| `modifiers` | `selectors.creatures.stackStatModifiers` | Hero, spell, artifact, terrain, and ruleset modifiers. |
| `abilities` | `registries.creatures.byId[creatureId].abilities` | Ability IDs and localized text. |

### Commands And Events
- `SHOW_CREATURE_ABILITY_DETAIL` from `creatureInfo.hoverAbility`: Updates local detail tooltip.
- `OPEN_CREATURE_UPGRADE_SOURCE` from `creatureInfo.openUpgrade`: Routes only when caller supports upgrades.
- `CLOSE_CREATURE_INFO` from `creatureInfo.close`: Returns to caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.creature-info.title`
- `ui.creature-info.actions.*`
- `ui.creature-info.status.*`
- `ui.creature-info.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.creature-info.background`
- `ui.creature-info.frame`
- `ui.creature-info.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.creature-info.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Info is read-only. Values resolve from creature records plus current stack modifiers, hero skills, artifacts, terrain, spells, and ruleset formulas.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
