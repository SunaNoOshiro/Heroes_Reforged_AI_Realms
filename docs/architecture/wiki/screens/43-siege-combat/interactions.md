# Screen 43: Siege Combat Variant
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Siege battlefield variant with walls, gate, towers, moat, catapult target preview, breaching state, and defender/attacker stack placement.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select wall target | `siege.selectWall` | local-ui | Current screen | `SELECT_CATAPULT_TARGET` | Highlights wall/gate target. | Catapult arcs toward selected wall, impact dust plays after reducer result, breached wall segment darkens, tower shot flashes from battlement. |
| Fire catapult | `siege.fireCatapult` | command | Current screen | `FIRE_CATAPULT` | Applies deterministic wall damage. | Catapult arcs toward selected wall, impact dust plays after reducer result, breached wall segment darkens, tower shot flashes from battlement. |
| Move stack | `siege.moveStack` | command | Current screen | `MOVE_COMBAT_STACK` | Handles moat/gate passability. | Catapult arcs toward selected wall, impact dust plays after reducer result, breached wall segment darkens, tower shot flashes from battlement. |
| Attack | `siege.attack` | command | Current screen or battle results | `RESOLVE_COMBAT_ATTACK` | Resolves stack attack with siege modifiers. | Catapult arcs toward selected wall, impact dust plays after reducer result, breached wall segment darkens, tower shot flashes from battlement. |

### State Changes
- `state.battle.siege.wallSegments` refreshes `wallState` after the owning reducer or local UI draft changes.
- `state.battle.siege.gate` refreshes `gateState` after the owning reducer or local UI draft changes.
- `state.battle.siege.towers` refreshes `towerState` after the owning reducer or local UI draft changes.
- `state.ui.battle.catapultTarget` refreshes `catapultTarget` after the owning reducer or local UI draft changes.
- `state.battle.activeStackId` refreshes `activeStack` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Attack can route to Current screen or battle results after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

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
| Fire catapult (`FIRE_CATAPULT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Move stack (`MOVE_COMBAT_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Attack (`RESOLVE_COMBAT_ATTACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
