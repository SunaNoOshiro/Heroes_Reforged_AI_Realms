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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, ownership. | `content-schema/schemas/hero.schema.json` |
| `unit.schema.json` | Unit stats, stacks, combat previews, upgrades, transfers. | `content-schema/schemas/unit.schema.json` |
| `ability.schema.json` | Unit and hero abilities shown in detail panels and previews. | `content-schema/schemas/ability.schema.json` |
| `artifact.schema.json` | Equipped artifact effects active in combat. | `content-schema/schemas/artifact.schema.json` |
| `skill.schema.json` | Secondary skill records that modify combat formulas. | `content-schema/schemas/skill.schema.json` |
| `spell.schema.json` | Spell catalog (school, level, mana, mastery, castability). | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities. | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes, legal shapes, range, and overlay rules. | `content-schema/schemas/targeting.schema.json` |
| `command.schema.json` | Canonical gameplay command kinds dispatched by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, units, spells, artifacts, armies, battles loaded at runtime. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `battle.phase` | `state.battle.phase` | Tactics, active turn, animation lock, or result phase. |
| `activeStack` | `state.battle.activeStackId` | Current initiative actor. |
| `legalHexes` | `state.battle.legalTargets` | Reducer/combat-rules output. |
| `combatLog` | `state.battle.log` | Localized event log from deterministic outcomes. |
| `pendingAnimation` | `state.ui.battle.pendingAnimation` | Presentation-only timeline from reducer result. |
| `opponentDisconnect` | `state.net.opponentDisconnect` | `OpponentDisconnect { peerId: string, secondsRemaining: number } \| null`. Drives the multiplayer disconnect banner and forfeit modal. Non-deterministic (`state.net.*` namespace per [`determinism.md` § Clock Policy](../../../determinism.md#clock-policy)). |

### Commands And Events
Screen-package tokens map to canonical schema kinds via
[`screen-command-coverage.json`](../../../screen-command-coverage.json).

| Screen Token | Action ID | Canonical Kind | Effect |
| --- | --- | --- | --- |
| `PREVIEW_COMBAT_TARGET` | `combat.selectTarget` | local-ui (`PREVIEW_` prefix) | Highlights legal movement / attack / cast target. |
| `MOVE_COMBAT_STACK` | `combat.moveStack` | `BATTLE_MOVE` | Updates stack hex and initiative state. |
| `RESOLVE_COMBAT_ATTACK` | `combat.attack` | `BATTLE_ATTACK` | Applies deterministic damage, retaliation, morale/luck, death. |
| `OPEN_COMBAT_SPELL_TARGETING` | `combat.castSpell` | local-ui (`OPEN_` prefix); opens [`44-combat-spell-targeting`](../44-combat-spell-targeting/) | Creates combat spell targeting draft. |
| `WAIT_COMBAT_STACK` | `combat.wait` | `BATTLE_WAIT` | Moves active stack later in initiative order. |
| `DEFEND_COMBAT_STACK` | `combat.defend` | `BATTLE_DEFEND` | Applies defend state and advances initiative. |

`END_BATTLE_TURN` and `START_BATTLE` are single-flight kinds owned
by `mvp.09-tactical-combat` (see
[`command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands)
and [`screen-command-coverage.json` § outOfScope](../../../screen-command-coverage.json)).

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
- `mp.combat.disconnect_banner` — banner shown to the still-connected player during the 30 s reconnect window.
- `mp.combat.forfeit_modal` — forfeit modal shown after 120 s of continuous disconnect.

### Asset, Sound, And VFX IDs
- `ui.combat-screen.background`
- `ui.combat-screen.frame`
- `ui.combat-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.combat-screen.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Initiative order, movement, melee / ranged attack, wait, defend,
  spell casting, morale / luck, death, surrender, retreat, and
  victory checks are deterministic reducer commands.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selector list matches sibling [`spec.md`](./spec.md) § State Bindings and [`interactions.md`](./interactions.md) § State Changes (including `opponentDisconnect`); command list matches sibling [`interactions.md`](./interactions.md) § Actions exactly.
- **Schema: ✔** — Every canonical kind (`BATTLE_MOVE`, `BATTLE_ATTACK`, `BATTLE_WAIT`, `BATTLE_DEFEND`) is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); aliases registered in [`screen-command-coverage.json` § commandAliases](../../../screen-command-coverage.json); `PREVIEW_` / `OPEN_` prefixes match `localUiPrefixes`.
- **Tasks: ✔** — Owning task [`mvp.09-tactical-combat.11-combat-hud-overlay`](../../../../../tasks/mvp/09-tactical-combat/11-combat-hud-overlay.md) lists this file in its Read First and acceptance criteria.

## ⚠ Issues

- **Auto / Retreat / Surrender commands not enumerated here.** Sibling [`mockup.html`](./mockup.html) shows `combat.auto`, `combat.retreat`, `combat.surrender` buttons; sibling [`spec.md`](./spec.md) Mechanics Mapping calls out retreat and surrender. Until [`interactions.md`](./interactions.md) row-documents them with canonical schema kinds (likely `RETREAT_BEFORE_BATTLE`, `ACCEPT_BATTLE_SURRENDER`, and a new `BATTLE_AUTO`), this contract intentionally omits them per Hard Prohibition B (no invented kinds). The owning HUD task [`mvp.09-tactical-combat.11-combat-hud-overlay`](../../../../../tasks/mvp/09-tactical-combat/11-combat-hud-overlay.md) must close the gap in `interactions.md` first; this file follows.
- **Battle state slices not registered in `data-inventory.md`.** `state.battle.phase`, `state.battle.activeStackId`, `state.battle.legalTargets`, `state.battle.log`, and `state.ui.battle.pendingAnimation` are read by this screen but no row appears in [`data-inventory.md`](../../../data-inventory.md). They are gameplay state — persisted only inside save records (`hr-saves.slots`) — but per CLAUDE.md ("every persisted field is registered in data-inventory.md") the parent save-record row should explicitly name the battle slice. Suggested owner: [`mvp.08-persistence`](../../../../../tasks/mvp/08-persistence/) (whichever task owns the save-record inventory row). Surfaced rather than rewritten per Hard Prohibition D (never edit cross-checked files).
