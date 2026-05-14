# Screen 46: Hero Screen
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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, ownership selectors. | `content-schema/schemas/hero.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `skill.schema.json` | Secondary skill records, mastery tiers, skill grids, level-up choices. | `content-schema/schemas/skill.schema.json` |
| `unit.schema.json` | Unit stats, stacks, combat previews, upgrades, army transfers. | `content-schema/schemas/unit.schema.json` |
| `spell.schema.json` | Spell catalog, school/level metadata, mana costs, mastery scaling, castability. | `content-schema/schemas/spell.schema.json` |
| `hero-class.schema.json` | Hero class growth weights, starting skills, level-up offer rules. | `content-schema/schemas/hero-class.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched by this screen. | `content-schema/schemas/command.schema.json` |
| Runtime registries | Hero, artifact, skill, unit, spell records and saved army state resolved at load. | Pack runtime + save store. |

### Runtime State Selectors
Selectors bound by this screen. `state.heroes.*` is save-borne
gameplay state managed by the engine reducer; it is **not** a
privacy-tracked slice, so it has no row in
[`data-inventory.md`](../../../data-inventory.md).

| UI Element | Selector | Notes |
| --- | --- | --- |
| `hero.id` | `state.heroes.selectedHeroId` | Current hero context. |
| `hero.primaryStats` | `state.heroes.byId[selected].stats` | Attack, defense, power, knowledge. |
| `hero.skills` | `state.heroes.byId[selected].secondarySkills` | Skill grid and tooltips. |
| `hero.equipment` | `state.heroes.byId[selected].equipment` | Paper-doll slots. |
| `hero.backpack` | `state.heroes.byId[selected].backpack` | Backpack inventory. |
| `hero.army` | `state.heroes.byId[selected].army` | Army row and stack operations. |

### Commands And Events

**Engine commands** (defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json),
dispatched through the reducer):

- `EQUIP_HERO_ARTIFACT` from `hero.equipArtifact` — moves an artifact
  from backpack to a legal equipment slot.
- `UNEQUIP_HERO_ARTIFACT` from `hero.unequipArtifact` — moves
  equipment to the backpack when capacity allows.

**UI-local routing tokens** (covered by the `OPEN_` / `REQUEST_`
prefixes in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
not in the deterministic command log):

- `OPEN_HERO_SPELLBOOK` from `hero.openSpellBook` — routes to
  `47-spell-book` with selected hero and spell context.
- `OPEN_QUEST_LOG` from `hero.questLog` — routes to `11-quest-log`.
- `OPEN_SPLIT_STACK_DIALOG` from `hero.splitStack` — opens the stack
  split draft in `51-split-stack-dialog`.
- `REQUEST_DISMISS_HERO` from `hero.dismiss` — opens the confirmation
  modal at `60-confirmation-dialog`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hero-screen.title`
- `ui.hero-screen.actions.*`
- `ui.hero-screen.status.*`
- `ui.hero-screen.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hero-screen.background`
- `ui.hero-screen.frame`
- `ui.hero-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.hero-screen.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named by
  the owning system.
- Never persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw asset
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Artifact equip / unequip, backpack drag-drop, army stack movement,
  hero dismissal guard, quest log, spellbook access, and right-click
  detail all consume hero selectors plus validated commands.
- Missing presentation may fall back through the asset resolver per
  [`fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and action IDs match sibling [`spec.md`](./spec.md) § State Bindings and [`interactions.md`](./interactions.md) § Actions.
- **Schema: ✔** — `EQUIP_HERO_ARTIFACT` and `UNEQUIP_HERO_ARTIFACT` are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (lines 1050, 1077). The four `OPEN_*` / `REQUEST_*` tokens match UI-local prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json) and correctly stay outside the command log.
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.46-hero-screen-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/46-hero-screen-screen.md) Reads First this file; engine equip / unequip commands are owned by [`phase-2.01-spells-artifacts.05a-equip-unequip-artifact-commands`](../../../../../tasks/phase-2/01-spells-artifacts/05a-equip-unequip-artifact-commands.md).

## ⚠ Issues

_None._
