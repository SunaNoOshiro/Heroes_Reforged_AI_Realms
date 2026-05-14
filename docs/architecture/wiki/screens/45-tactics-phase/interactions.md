# Screen 45: Combat Tactics Phase
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Pre-combat tactics deployment phase. Friendly stacks may be
repositioned inside the deployment zone granted by the hero's tactics
skill; the enemy side is locked. Starting battle freezes deployment
and routes to `38-combat-screen`.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Drag stack | `tactics.dragStack` | local-ui | Current screen | `PREVIEW_TACTICS_MOVE` (UI-local) | Updates the drag-ghost position and highlights the hovered hex as legal/illegal. | Legal deployment cells glow; the drag-ghost tracks the cursor; illegal hexes flash red. |
| Place stack | `tactics.placeStack` | command | Current screen | `PLACE_TACTICS_STACK` | Moves the stack to a legal hex inside `state.battle.tactics.legalHexes` and decrements `remainingMoves`. | Drag-ghost snaps to the chosen hex; failure plays a localized error toast (see § Error surfaces). |
| Start battle | `tactics.startBattle` | command | `38-combat-screen` | `START_BATTLE_AFTER_TACTICS` | Freezes deployment, clears tactics draft state, and emits the first initiative turn. | Zone overlays wipe; brief transition then the combat screen mounts. |
| Reset placement | `tactics.reset` | local-ui | Current screen | `RESET_TACTICS_PLACEMENT` (UI-local) | Discards the current tactics draft and re-derives stack positions from the last reducer-approved `BattleState`. | Stacks tween back to original hexes; reduced-motion mode renders the snap-back instantly. |

`PREVIEW_TACTICS_MOVE` and `RESET_TACTICS_PLACEMENT` are UI-local per
the `PREVIEW_` / `RESET_` prefix policy in
[`docs/architecture/screen-command-coverage.json`](../../../screen-command-coverage.json);
they do not enter the deterministic command log.
`PLACE_TACTICS_STACK` and `START_BATTLE_AFTER_TACTICS` are schema-
backed reducer commands defined in
[`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
and owned by
[`mvp.09-tactical-combat.12-tactics-phase-engine`](../../../../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md).

### State Changes
- `tacticsAvailable` re-reads `state.battle.tactics.enabled` after the
  reducer accepts a phase transition.
- `deploymentZone` re-reads `state.battle.tactics.legalHexes` after
  hero skill / ruleset reload.
- `friendlyStacks` re-reads `state.battle.armies.attacker.stacks`
  after a `PLACE_TACTICS_STACK` accept.
- `enemyPreview` re-reads `state.battle.armies.defender.stacks` (never
  mutated by this screen).
- `remainingMoves` re-reads `state.battle.tactics.remainingMoves`
  after each accepted placement.
- Hover, focus, drag-ghost position, animation frame, and tactics
  draft state stay UI-local; they never enter `state.battle` or the
  command log.

### Navigation Outcomes
- `tactics.startBattle` routes to `38-combat-screen` after the reducer
  accepts `START_BATTLE_AFTER_TACTICS` and the wipe animation finishes.

### Disabled And Error Cases
- Disable command controls when required selectors, registry records,
  battle phase, ownership, or route guards fail.
- Missing presentation assets fall back through the asset resolver.
  Missing gameplay records, invalid content IDs, or rejected commands
  fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve the tactics
  draft when useful, render a localized error inline, and play the
  failure cue.
- Error text is produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never construct
  toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they never
  introduce new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each row whose `Type` is `command` to its default surface for this
screen's dominant error domain. A row whose Notes column reads
`override` replaces the § 2 default for that action; otherwise the
default applies. Specific codes (`DISPATCHER_<token>`,
`STORAGE_<token>`, …) are emitted alongside the engine reducer that
owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Place stack (`PLACE_TACTICS_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |
| Start battle (`START_BATTLE_AFTER_TACTICS`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

`tactics.reset` is UI-local; it has no dispatcher path and therefore
no error-surfaces row.

---

## 🔍 Sync Check

- **UI: ⚠** — Action IDs (`tactics.dragStack`, `tactics.placeStack`, `tactics.startBattle`, `tactics.reset`) match the bindings in sibling [`spec.md`](./spec.md) § State Bindings. The mockup ([`mockup.html`](./mockup.html)) renders a different six-button command strip (`tactics-phase.spell|wait|defend|auto|retreat|end`) with no row here; see `## ⚠ Issues` below.
- **Schema: ✔** — `PLACE_TACTICS_STACK` and `START_BATTLE_AFTER_TACTICS` are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and the snapshot. `PREVIEW_TACTICS_MOVE` and `RESET_TACTICS_PLACEMENT` are correctly classified UI-local under the `PREVIEW_` / `RESET_` prefix policy in [`screen-command-coverage.json`](../../../screen-command-coverage.json) (previous revision marked `tactics.reset` as `command` — corrected in this pass).
- **Tasks: ✔** — UI owner [`phase-2.07-ui-screen-backlog.45-tactics-phase-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/45-tactics-phase-screen.md) Reads First this file; engine owner [`mvp.09-tactical-combat.12-tactics-phase-engine`](../../../../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md) owns the two reducer commands.

## ⚠ Issues

- **Mockup command strip not covered.** `mockup.html` renders six buttons with `data-action="tactics-phase.{spell,wait,defend,auto,retreat,end}"`; none of those action IDs appears here, and the labels (Spell / Wait / Defend / Retreat / End) overlap with combat-phase actions owned by sibling [`38-combat-screen/interactions.md`](../38-combat-screen/interactions.md). Per Hard Prohibition B, this audit did not invent rows. Owning UI task [`phase-2.07-ui-screen-backlog.45-tactics-phase-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/45-tactics-phase-screen.md) must decide whether the mockup is amended to show the tactics-only controls or `interactions.md` is extended to cover the visible strip.
- **`tactics.reset` Type corrected.** Previous revision listed `Reset placement` with `Type: command` and a corresponding row in § Error surfaces. `RESET_TACTICS_PLACEMENT` is not in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and falls under the `RESET_` UI-local prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json). Reclassified to `local-ui` and removed the error-surfaces row, consistent with sibling [`data-contracts.md`](./data-contracts.md) § Commands And Events.
