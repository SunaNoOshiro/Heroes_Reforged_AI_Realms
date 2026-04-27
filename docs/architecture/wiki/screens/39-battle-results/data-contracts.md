# Screen 39: Battle Results
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
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `battle.outcome` | `state.battle.result.outcome` | Win/loss/retreat/surrender outcome. |
| `experience` | `state.battle.result.experienceGained` | Hero XP reward. |
| `casualties` | `state.battle.result.casualties` | Lost stacks by side. |
| `spoils` | `state.battle.result.spoils` | Resources/artifacts gained. |
| `nextRoute` | `state.battle.result.returnRoute` | Adventure, town, defeat, or campaign route. |

### Commands And Events
- `ACKNOWLEDGE_BATTLE_RESULT` from `battleResults.continue`: Finalizes result routing and clears battle phase.
- `SELECT_BATTLE_RESULT_ROW` from `battleResults.inspectCasualties`: Highlights casualty detail only.
- `SELECT_BATTLE_SPOILS_ITEM` from `battleResults.inspectSpoils`: Shows artifact/resource tooltip.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.battle-results.title`
- `ui.battle-results.actions.*`
- `ui.battle-results.status.*`
- `ui.battle-results.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.battle-results.background`
- `ui.battle-results.frame`
- `ui.battle-results.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.battle-results.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Applies battle outcome exactly once: surviving stacks, hero experience, artifacts, spoils, retreat/surrender state, and victory-condition triggers.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
