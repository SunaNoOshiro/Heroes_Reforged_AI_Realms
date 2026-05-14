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
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, castability. | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, buildings. | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes, legal target shapes, range rules, overlays. | `content-schema/schemas/targeting.schema.json` |
| `target-scope.schema.json` | Runtime target-scope records consumed by effects and spell / ability previews. | `content-schema/schemas/target-scope.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state per the bindings below. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `selectedSpell` | `state.ui.spellTargeting.spellId` | Spell chosen from spell book or command panel. |
| `casterHero` | `state.adventure.selectedHeroId` | Hero paying mana and receiving outcome. |
| `legalTargets` | `selectors.spells.adventureLegalTargets` | Tiles/objects/towns legal for this spell. |
| `mana` | `state.heroes.byId[caster].mana` | Current mana and cost guard. |
| `targetDraft` | `state.ui.spellTargeting.hoverTarget` | Local hover/selected target. |

### Commands And Events
- `PREVIEW_ADVENTURE_SPELL_TARGET` (from `advSpell.hoverTarget`) —
  local-UI; updates target draft and status text.
- `CAST_ADVENTURE_SPELL` (from `advSpell.cast`) — alias of
  `SPELL_CAST` per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  spends mana and applies spell result through the engine
  reducer.
- `OPEN_VIEW_WORLD_FROM_SPELL` (from `advSpell.viewWorld`) —
  local-UI route to `16-view-world` for View Air / View Earth
  spells.
- `CANCEL_SPELL_TARGETING` (from `advSpell.cancel`) — local-UI;
  discards target draft.

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
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.adventure-spell-targeting.background`
- `ui.adventure-spell-targeting.frame`
- `ui.adventure-spell-targeting.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.adventure-spell-targeting.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when
  named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects —
  this includes the `state.ui.spellTargeting.*` slice this screen
  draws from.
- Replays use stable IDs and scalar command inputs; never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Target legality checks spell scope, terrain, hero skills, mana,
  daily cast limits, town ownership, object blocks, and movement
  rules before command dispatch.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and command tokens match sibling
  [`spec.md`](./spec.md) §State Bindings and
  [`interactions.md`](./interactions.md) §Actions — aligned.
- **Schema: ✔** — Every schema listed exists at the cited path
  ([`spell.schema.json`](../../../../../content-schema/schemas/spell.schema.json)
  requires `school | level | scope | manaCost | targeting`;
  [`targeting.schema.json`](../../../../../content-schema/schemas/targeting.schema.json)
  is a closed discriminated union;
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  defines `SPELL_CAST`, the canonical kind behind the
  `CAST_ADVENTURE_SPELL` alias).
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.17-adventure-spell-targeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/17-adventure-spell-targeting-screen.md)
  lists this file in Read First; engine work is owned upstream by
  `phase-2.01-spells-artifacts.03-adventure-map-spells`.

## ⚠ Issues

_None._
