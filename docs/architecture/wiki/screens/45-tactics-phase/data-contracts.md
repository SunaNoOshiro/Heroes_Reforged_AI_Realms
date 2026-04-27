# Screen 45: Combat Tactics Phase
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
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `tacticsAvailable` | `state.battle.tactics.enabled` | Whether phase is active. |
| `deploymentZone` | `state.battle.tactics.legalHexes` | Allowed placement hexes. |
| `friendlyStacks` | `state.battle.armies.attacker.stacks` | Movable stack positions. |
| `enemyPreview` | `state.battle.armies.defender.stacks` | Locked enemy placement. |
| `remainingMoves` | `state.battle.tactics.remainingMoves` | Tactics move budget. |

### Commands And Events
- `PREVIEW_TACTICS_MOVE` from `tactics.dragStack`: Shows legal/illegal drop target.
- `PLACE_TACTICS_STACK` from `tactics.placeStack`: Moves stack within legal deployment zone.
- `START_BATTLE_AFTER_TACTICS` from `tactics.startBattle`: Freezes deployment and begins initiative.
- `RESET_TACTICS_PLACEMENT` from `tactics.reset`: Restores original placement.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.tactics-phase.title`
- `ui.tactics-phase.actions.*`
- `ui.tactics-phase.status.*`
- `ui.tactics-phase.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.tactics-phase.background`
- `ui.tactics-phase.frame`
- `ui.tactics-phase.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.tactics-phase.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Allows stack repositioning only within legal tactics rows/columns before initiative begins; starting battle freezes deployment and enters combat phase.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
