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
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and formulas consumed by siege commands (wall HP, gate HP, moat damage, tower shots-per-round). | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Unit stats, stacks, combat previews. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `building.schema.json` | Town buildings, fortifications, dwellings, mage guilds, forts. | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `town-presentation.schema.json` | Town layout and presentation bindings (siege backdrop / wall sprites). | [`content-schema/schemas/town-presentation.schema.json`](../../../../../content-schema/schemas/town-presentation.schema.json) |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `command.schema.json` | Reducer-backed siege commands dispatched or previewed by this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, shell state as listed below. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `wallState` | `state.battle.siege.wallSegments` | HP / breach state by segment. |
| `gateState` | `state.battle.siege.gate` | Gate open / broken / blocked state. |
| `towerState` | `state.battle.siege.towers` | Tower ammo and targeting. |
| `catapultTarget` | `state.ui.battle.catapultTarget` | Local selected siege target (UI draft, not persisted). |
| `activeStack` | `state.battle.activeStackId` | Current combat actor. |

### Commands And Events
Canonical kinds in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); aliasing follows [`screen-command-coverage.json`](../../../screen-command-coverage.json).

| Action ID | Token in `interactions.md` | Resolves To | Notes |
| --- | --- | --- | --- |
| `siege.selectWall` | `SELECT_CATAPULT_TARGET` | local-ui (`SELECT_` prefix) | Writes `state.ui.battle.catapultTarget`; never enters the deterministic command log. |
| `siege.fireCatapult` | `FIRE_CATAPULT` | `FIRE_CATAPULT` (schema kind, line 1726) | Applies deterministic wall / gate damage. |
| `siege.moveStack` | `MOVE_COMBAT_STACK` | `BATTLE_MOVE` (`commandAliases`) | Handles moat / gate passability through standard stack movement. |
| `siege.attack` | `RESOLVE_COMBAT_ATTACK` | `BATTLE_ATTACK` (`commandAliases`) | Resolves stack attack with siege modifiers (tower fire, defender bonuses). |

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
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or other transient visual effects.
- `state.ui.battle.catapultTarget` is a UI draft; it is **not** persisted and **not** included in replays.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Extends combat with wall segments, gate blocking, tower shots, moat penalties, catapult targeting, and breach state in deterministic battle commands.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors match sibling [`spec.md`](./spec.md) State Bindings and [`interactions.md`](./interactions.md) State Changes; commands match the four actions in `interactions.md`.
- **Schema: ✔** — `FIRE_CATAPULT` present in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) line 1726; aliases `MOVE_COMBAT_STACK` → `BATTLE_MOVE` and `RESOLVE_COMBAT_ATTACK` → `BATTLE_ATTACK` confirmed in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `commandAliases`; `SELECT_CATAPULT_TARGET` matches the `SELECT_` local-ui prefix.
- **Tasks: ❌** — No data-inventory row exists for `state.battle.siege.wallSegments` / `state.battle.siege.gate` / `state.battle.siege.towers`. See `## ⚠ Issues`.

## ⚠ Issues

- **Missing data-inventory rows for `state.battle.siege.*`.** This file binds `wallState`, `gateState`, and `towerState` to slices under `state.battle.siege.*` (also asserted in [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md)), but [`data-inventory.md`](../../../data-inventory.md) has no matching row. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), the engine owner — [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) — must add rows before this slice can ship. Suggested values: domain=`battle`, owner=`phase-2.01-spells-artifacts.13-siege-state-machine`, persistence=`memory` (battle-scoped), retention=`battle`, replay=`derived` (rebuilt from command log). Skill did not add the rows itself (audit rule D — never edit cross-checked files).
- **Mockup `ActionBar` commands not covered.** Mockup shows six labeled buttons (`siege-combat.spell` / `.wait` / `.defend` / `.auto` / `.retreat` / `.end`) but only the four battlefield actions are listed in `Commands And Events` because the sibling `interactions.md` does not enumerate them. See sibling [`spec.md`](./spec.md) `## ⚠ Issues` — aligned. Once added to `interactions.md`, the corresponding rows here become: Spell → `SPELL_CAST`, Wait → `BATTLE_WAIT` (alias from `WAIT_COMBAT_STACK`), Defend → `BATTLE_DEFEND` (alias from `DEFEND_COMBAT_STACK`), Auto → `AUTO_RESOLVE_BATTLE`, Retreat → `RETREAT_BEFORE_BATTLE`. The `End` button has no obvious canonical kind in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and needs an owning-task decision.
