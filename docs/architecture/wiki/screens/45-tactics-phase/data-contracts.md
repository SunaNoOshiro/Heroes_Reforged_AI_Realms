# Screen 45: Combat Tactics Phase
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and formulas consumed by tactics guards. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, tactics-skill rank, army composition. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Stack stats and unit metadata referenced by stack tokens. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `command.schema.json` | Reducer-backed command payloads dispatched from this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

### Runtime State Selectors
All selectors read transient battle state. No row in
[`data-inventory.md`](../../../data-inventory.md) is required because
`state.battle.*` is not persisted as its own slice; it is rebuilt from
the replay command log.

| UI element | Selector | Notes |
| --- | --- | --- |
| `tacticsAvailable` | `state.battle.tactics.enabled` | Phase is active. |
| `deploymentZone` | `state.battle.tactics.legalHexes` | Allowed placement hexes. |
| `friendlyStacks` | `state.battle.armies.attacker.stacks` | Movable attacker stacks. |
| `enemyPreview` | `state.battle.armies.defender.stacks` | Locked defender stacks. |
| `remainingMoves` | `state.battle.tactics.remainingMoves` | Tactics move budget. |

### Commands And Events
Reducer-backed (defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json),
owned by
[`mvp.09-tactical-combat.12-tactics-phase-engine`](../../../../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md)):
- `PLACE_TACTICS_STACK` (from `tactics.placeStack`) — validates phase,
  stack ownership, legal hex, passability, and no overlap, then
  updates `state.battle.armies.attacker.stacks[*].position` and
  decrements `remainingMoves`.
- `START_BATTLE_AFTER_TACTICS` (from `tactics.startBattle`) — freezes
  deployment and transitions to the first initiative turn (routes to
  `38-combat-screen`).

UI-local (not in the command log; classified under the `PREVIEW_` /
`RESET_` prefixes in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):
- `PREVIEW_TACTICS_MOVE` (from `tactics.dragStack`) — updates the
  drag-ghost position and the hovered-hex legal/illegal hint.
- `RESET_TACTICS_PLACEMENT` (from `tactics.reset`) — discards the
  tactics draft and re-derives positions from the last reducer-
  approved `BattleState`.

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
- Persist only reducer-approved gameplay state, setup records,
  content hashes, and command inputs named by the owning system.
- Do **not** persist hover, focus, tooltip, drag-ghost, cursor blink,
  animation frame, tactics-draft positions, or any transient visual
  effect.
- Replays use stable IDs and scalar command inputs (hex coordinates,
  stack IDs, battle ID), never raw paths, localized labels, rendered
  pixel positions, or wall-clock timestamps.

### Validation And Fallback
- Repositioning is allowed only inside `legalHexes` and only before
  initiative begins; `START_BATTLE_AFTER_TACTICS` freezes deployment.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors here are the same five rows used in sibling [`spec.md`](./spec.md) § State Bindings and [`architecture.md`](./architecture.md) § State Inputs; localization / asset prefixes (`ui.tactics-phase.*`, `vfx.tactics-phase.*`) match the screen slug.
- **Schema: ✔** — `PLACE_TACTICS_STACK` and `START_BATTLE_AFTER_TACTICS` are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (verified `kind` consts at the `placeTacticsStack` / `startBattleAfterTactics` definitions) and listed in the enum snapshot. `PREVIEW_TACTICS_MOVE` / `RESET_TACTICS_PLACEMENT` are classified UI-local by the `PREVIEW_` / `RESET_` prefix policy in [`screen-command-coverage.json`](../../../screen-command-coverage.json), consistent with sibling [`interactions.md`](./interactions.md) § Actions after this audit. `state.battle.*` is transient (not persisted), so no [`data-inventory.md`](../../../data-inventory.md) row is required.
- **Tasks: ✔** — UI owner [`phase-2.07-ui-screen-backlog.45-tactics-phase-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/45-tactics-phase-screen.md) Reads First this file; engine owner [`mvp.09-tactical-combat.12-tactics-phase-engine`](../../../../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md) owns the two reducer commands referenced here.

## ⚠ Issues

_None._
