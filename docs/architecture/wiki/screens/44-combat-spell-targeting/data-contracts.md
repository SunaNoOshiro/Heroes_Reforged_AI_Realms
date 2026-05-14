# Screen 44: Combat Spell Targeting
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
| `spell.schema.json` | Spell catalog records, school / level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, and buildings. | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes, legal target shapes, range rules, and targeting overlays. | `content-schema/schemas/targeting.schema.json` |
| `target-scope.schema.json` | Runtime target scope records consumed by effects and spell / ability previews. | `content-schema/schemas/target-scope.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `selectedSpell` | `state.ui.battle.selectedSpellId` | Spell chosen from spellbook (`47-spell-book`). |
| `casterHero` | `state.battle.activeHeroId` | Hero casting context. |
| `mana` | `state.heroes.byId[caster].mana` | Mana affordability. |
| `legalTargets` | `state.battle.spellTargeting.legalTargets` | Rules output for the spell's target shape. |
| `immuneTargets` | `state.battle.spellTargeting.immuneTargets` | Stacks that reject this spell. |

### Commands And Events
- `PREVIEW_COMBAT_SPELL_TARGET` from `combatSpell.hoverTarget`:
  updates target area preview. UI-local (per `PREVIEW_` prefix in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)).
- `CAST_COMBAT_SPELL` from `combatSpell.cast`: aliased to engine
  `SPELL_CAST` (per the same coverage file); spends mana and applies
  spell effects.
- `CANCEL_COMBAT_SPELL_TARGETING` from `combatSpell.cancel`:
  UI-local (per `CANCEL_` prefix). Returns to combat without casting.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.combat-spell-targeting.title`
- `ui.combat-spell-targeting.actions.*`
- `ui.combat-spell-targeting.status.*`
- `ui.combat-spell-targeting.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.combat-spell-targeting.background`
- `ui.combat-spell-targeting.frame`
- `ui.combat-spell-targeting.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.combat-spell-targeting.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Validates combat spell scope, hero turn, mana, mastery, target
  shape, immunity, and friendly / enemy restrictions before casting.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors mirror the State Bindings table in sibling [`spec.md`](./spec.md) and the State Changes list in [`interactions.md`](./interactions.md) — aligned.
- **Schema: ✔** — Every schema in the table resolves under [`content-schema/schemas/`](../../../../../content-schema/schemas/). Command tokens are reconciled with [`screen-command-coverage.json`](../../../screen-command-coverage.json) (`CAST_COMBAT_SPELL` → `SPELL_CAST` alias; `PREVIEW_*` / `CANCEL_*` UI-local prefixes), so `npm run validate:commands` passes for this screen.
- **Tasks: ⚠** — Owning task [`phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui`](../../../../../tasks/phase-2/01-spells-artifacts/08-spell-casting-in-combat-ui.md) Read-Firsts this file. State paths under `state.battle.spellTargeting.*` are not yet registered in [`data-inventory.md`](../../../data-inventory.md); see sibling [`architecture.md` § ⚠ Issues](./architecture.md#-issues) for the closure path.

## ⚠ Issues

- **Missing `data-inventory.md` rows for `state.battle.spellTargeting.*`.** The Runtime State Selectors table names `state.battle.spellTargeting.legalTargets` and `state.battle.spellTargeting.immuneTargets`, but [`data-inventory.md`](../../../data-inventory.md) has no matching rows. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), the owning combat-engine task `mvp.09-tactical-combat` must register these (or, if these are UI-only ephemeral selectors, `phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui` must move them under `state.ui.battle.*` per [`persistence.md`](../../../persistence.md)). Suggested values: domain=`battle`, owner=`mvp.09-tactical-combat`, persistence=`runtime-only`, retention=`battle-instance`. Skill did not add the rows (Hard Prohibition D — never edit cross-checked files).
