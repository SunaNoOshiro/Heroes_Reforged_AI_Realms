# Screen 45: Combat Tactics Phase
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Pre-combat tactics deployment phase with legal placement zones, draggable friendly stacks, locked enemy side, remaining placement moves, and start battle action.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Drag stack | `tactics.dragStack` | local-ui | Current screen | `PREVIEW_TACTICS_MOVE` | Shows legal/illegal drop target. | Legal deployment cells glow, stack drag ghost snaps to allowed hex, illegal placement flashes red, start battle wipes away zone overlays. |
| Place stack | `tactics.placeStack` | command | Current screen | `PLACE_TACTICS_STACK` | Moves stack within legal deployment zone. | Legal deployment cells glow, stack drag ghost snaps to allowed hex, illegal placement flashes red, start battle wipes away zone overlays. |
| Start battle | `tactics.startBattle` | command | `38-combat-screen` | `START_BATTLE_AFTER_TACTICS` | Freezes deployment and begins initiative. | Legal deployment cells glow, stack drag ghost snaps to allowed hex, illegal placement flashes red, start battle wipes away zone overlays. |
| Reset placement | `tactics.reset` | command | Current screen | `RESET_TACTICS_PLACEMENT` | Restores original placement. | Legal deployment cells glow, stack drag ghost snaps to allowed hex, illegal placement flashes red, start battle wipes away zone overlays. |

### State Changes
- `state.battle.tactics.enabled` refreshes `tacticsAvailable` after the owning reducer or local UI draft changes.
- `state.battle.tactics.legalHexes` refreshes `deploymentZone` after the owning reducer or local UI draft changes.
- `state.battle.armies.attacker.stacks` refreshes `friendlyStacks` after the owning reducer or local UI draft changes.
- `state.battle.armies.defender.stacks` refreshes `enemyPreview` after the owning reducer or local UI draft changes.
- `state.battle.tactics.remainingMoves` refreshes `remainingMoves` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Start battle can route to `38-combat-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Place stack (`PLACE_TACTICS_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Start battle (`START_BATTLE_AFTER_TACTICS`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Reset placement (`RESET_TACTICS_PLACEMENT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
