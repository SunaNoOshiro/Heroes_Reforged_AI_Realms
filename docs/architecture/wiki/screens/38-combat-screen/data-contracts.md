# Screen 38: Combat Screen
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
| `ability.schema.json` | Unit and hero abilities shown in detail panels, combat previews, and validation text. | `content-schema/schemas/ability.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, and buildings. | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes, legal target shapes, range rules, and targeting overlays. | `content-schema/schemas/targeting.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `battle.phase` | `state.battle.phase` | Tactics, active turn, animation lock, or result phase. |
| `activeStack` | `state.battle.activeStackId` | Current initiative actor. |
| `legalHexes` | `state.battle.legalTargets` | Reducer/combat rules output. |
| `combatLog` | `state.battle.log` | Localized event log from deterministic outcomes. |
| `pendingAnimation` | `state.ui.battle.pendingAnimation` | Presentation-only timeline from reducer result. |

### Commands And Events
- `PREVIEW_COMBAT_TARGET` from `combat.selectTarget`: Highlights legal movement/attack/cast target.
- `MOVE_COMBAT_STACK` from `combat.moveStack`: Updates stack hex and initiative state.
- `RESOLVE_COMBAT_ATTACK` from `combat.attack`: Applies deterministic damage, retaliation, morale/luck, death.
- `OPEN_COMBAT_SPELL_TARGETING` from `combat.castSpell`: Creates combat spell targeting draft.
- `WAIT_COMBAT_STACK` from `combat.wait`: Moves active stack later in initiative order.
- `DEFEND_COMBAT_STACK` from `combat.defend`: Applies defend state and advances initiative.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.combat-screen.title`
- `ui.combat-screen.actions.*`
- `ui.combat-screen.status.*`
- `ui.combat-screen.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.combat-screen.background`
- `ui.combat-screen.frame`
- `ui.combat-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.combat-screen.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Initiative order, movement, melee/ranged attack, wait, defend, spell casting, morale/luck, death, surrender, retreat, and victory checks are deterministic reducer commands.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
