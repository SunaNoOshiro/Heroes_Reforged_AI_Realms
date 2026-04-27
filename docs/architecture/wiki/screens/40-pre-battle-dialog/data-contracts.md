# Screen 40: Pre-Battle Dialog
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
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature bank defenders, rewards, and attitude. | `content-schema/schemas/neutral-stack-template.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `attacker` | `state.pendingBattle.attacker` | Attacking hero/army. |
| `defender` | `state.pendingBattle.defender` | Defending hero/army or neutral stack. |
| `terrain` | `state.pendingBattle.terrainId` | Battlefield terrain context. |
| `tacticsAvailable` | `state.pendingBattle.tacticsAvailable` | Whether tactics phase can start. |
| `retreatAllowed` | `state.pendingBattle.retreatAllowed` | Retreat button guard. |

### Commands And Events
- `START_TACTICAL_BATTLE` from `preBattle.fight`: Creates deterministic battle state.
- `AUTO_RESOLVE_BATTLE` from `preBattle.autoResolve`: Runs deterministic auto-resolve.
- `RETREAT_BEFORE_BATTLE` from `preBattle.retreat`: Cancels encounter if legal.
- `SELECT_PRE_BATTLE_STACK` from `preBattle.inspectArmy`: Shows stack detail tooltip.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.pre-battle-dialog.title`
- `ui.pre-battle-dialog.actions.*`
- `ui.pre-battle-dialog.status.*`
- `ui.pre-battle-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.pre-battle-dialog.background`
- `ui.pre-battle-dialog.frame`
- `ui.pre-battle-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.pre-battle-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Initializes tactical combat only after guard checks for encounter legality, army state, terrain, siege context, and optional tactics phase.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
