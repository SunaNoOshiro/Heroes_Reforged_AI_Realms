# Screen 41: Surrender Cost Dialog
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
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `survivingArmyValue` | `state.battle.surrender.armyValue` | Cost basis. |
| `surrenderCost` | `state.battle.surrender.cost` | Computed ransom. |
| `availableGold` | `state.players.active.resources.gold` | Affordability guard. |
| `heroOutcome` | `state.battle.surrender.heroOutcome` | Hero survival and return route. |

### Commands And Events
- `ACCEPT_BATTLE_SURRENDER` from `surrender.accept`: Spends gold and resolves battle as surrender.
- `CLOSE_SURRENDER_DIALOG` from `surrender.decline`: Returns to active battle.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.surrender-cost-dialog.title`
- `ui.surrender-cost-dialog.actions.*`
- `ui.surrender-cost-dialog.status.*`
- `ui.surrender-cost-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.surrender-cost-dialog.background`
- `ui.surrender-cost-dialog.frame`
- `ui.surrender-cost-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.surrender-cost-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Surrender cost derives from surviving army value and ruleset; accepting spends gold and resolves battle with hero survival route.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
