# Screen 43: Siege Combat Variant
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
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `town-presentation.schema.json` | Town layout, building slot presentation, flyby views, and presentation-only town bindings. | `content-schema/schemas/town-presentation.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `wallState` | `state.battle.siege.wallSegments` | HP/breach state by segment. |
| `gateState` | `state.battle.siege.gate` | Gate open/broken/blocked state. |
| `towerState` | `state.battle.siege.towers` | Tower ammo and targeting. |
| `catapultTarget` | `state.ui.battle.catapultTarget` | Local selected siege target. |
| `activeStack` | `state.battle.activeStackId` | Current combat actor. |

### Commands And Events
- `SELECT_CATAPULT_TARGET` from `siege.selectWall`: Highlights wall/gate target.
- `FIRE_CATAPULT` from `siege.fireCatapult`: Applies deterministic wall damage.
- `MOVE_COMBAT_STACK` from `siege.moveStack`: Handles moat/gate passability.
- `RESOLVE_COMBAT_ATTACK` from `siege.attack`: Resolves stack attack with siege modifiers.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.siege-combat.title`
- `ui.siege-combat.actions.*`
- `ui.siege-combat.status.*`
- `ui.siege-combat.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.siege-combat.background`
- `ui.siege-combat.frame`
- `ui.siege-combat.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.siege-combat.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Extends combat with wall segments, gate blocking, tower shots, moat penalties, catapult targeting, and breach state in deterministic battle commands.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
