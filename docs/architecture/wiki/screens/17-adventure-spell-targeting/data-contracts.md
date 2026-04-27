# Screen 17: Adventure Spell Targeting
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
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, and buildings. | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes, legal target shapes, range rules, and targeting overlays. | `content-schema/schemas/targeting.schema.json` |
| `target-scope.schema.json` | Runtime target scope records consumed by effects and spell/ability previews. | `content-schema/schemas/target-scope.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `selectedSpell` | `state.ui.spellTargeting.spellId` | Spell chosen from spell book or command panel. |
| `casterHero` | `state.adventure.selectedHeroId` | Hero paying mana and receiving outcome. |
| `legalTargets` | `selectors.spells.adventureLegalTargets` | Tiles/objects/towns legal for this spell. |
| `mana` | `state.heroes.byId[caster].mana` | Current mana and cost guard. |
| `targetDraft` | `state.ui.spellTargeting.hoverTarget` | Local hover/selected target. |

### Commands And Events
- `PREVIEW_ADVENTURE_SPELL_TARGET` from `advSpell.hoverTarget`: Updates target draft and status text.
- `CAST_ADVENTURE_SPELL` from `advSpell.cast`: Spends mana and applies spell result.
- `OPEN_VIEW_WORLD_FROM_SPELL` from `advSpell.viewWorld`: Routes for View Air/View Earth style spells.
- `CANCEL_SPELL_TARGETING` from `advSpell.cancel`: Discards target draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.adventure-spell-targeting.title`
- `ui.adventure-spell-targeting.actions.*`
- `ui.adventure-spell-targeting.status.*`
- `ui.adventure-spell-targeting.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.adventure-spell-targeting.background`
- `ui.adventure-spell-targeting.frame`
- `ui.adventure-spell-targeting.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.adventure-spell-targeting.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Target legality checks spell scope, terrain, hero skills, mana, daily cast limits, town ownership, object blocks, and movement rules before command dispatch.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
