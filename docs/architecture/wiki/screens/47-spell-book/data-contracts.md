# Screen 47: Spell Book
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
| `skill.schema.json` | Secondary skill records, mastery tiers, hero skill grids, and level-up choices. | `content-schema/schemas/skill.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `hero.spells` | `state.heroes.byId[selected].knownSpells` | Known spell IDs. |
| `spellbook.school` | `state.ui.spellbook.selectedSchool` | Local school filter. |
| `selectedSpell` | `state.ui.spellbook.selectedSpellId` | Local selected spell. |
| `mana` | `state.heroes.byId[selected].mana` | Current and max spell points. |
| `castContext` | `state.ui.spellbook.castContext` | Adventure or combat scope controls enabled spells. |

### Commands And Events
- `SELECT_SPELL_SCHOOL_TAB` from `spellbook.selectSchool`: Changes local filter/page.
- `TURN_SPELLBOOK_PAGE` from `spellbook.turnPage`: Changes local page index.
- `SELECT_SPELL` from `spellbook.selectSpell`: Updates selected spell detail and cast enabled state.
- `BEGIN_SPELL_TARGETING` from `spellbook.cast`: Creates targeting draft if mana and context are valid.
- `CLOSE_SPELLBOOK` from `spellbook.close`: Returns to owning screen.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.spell-book.title`
- `ui.spell-book.actions.*`
- `ui.spell-book.status.*`
- `ui.spell-book.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.spell-book.background`
- `ui.spell-book.frame`
- `ui.spell-book.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.spell-book.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Known spell list, school filters, wisdom/mastery gating, adventure/combat scope, mana cost, and target mode determine whether Cast routes to targeting or remains disabled.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
