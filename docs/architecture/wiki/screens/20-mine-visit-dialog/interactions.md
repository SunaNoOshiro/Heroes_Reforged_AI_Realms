# Screen 20: Mine Visit Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Mine capture or visit dialog showing resource type, current owner, guard state, income, and flagging outcome.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Claim mine | `mine.claim` | command | `07-adventure-map` | `CLAIM_MINE` | Changes owner and updates income selectors. | Flag cloth unfurls in the active player color, resource icon sparkles, income text ticks, and map mine sprite changes owner color on close. |
| Fight guard | `mine.fightGuard` | navigation | `40-pre-battle-dialog` | `START_MINE_GUARD_BATTLE` | Routes to combat if guards block capture. | Flag cloth unfurls in the active player color, resource icon sparkles, income text ticks, and map mine sprite changes owner color on close. |
| Leave | `mine.leave` | navigation | `07-adventure-map` | `CLOSE_MINE_DIALOG` | No ownership change. | Flag cloth unfurls in the active player color, resource icon sparkles, income text ticks, and map mine sprite changes owner color on close. |
| Right-click resource | `mine.resourceInfo` | navigation | `18-map-object-tooltip` | `OPEN_RESOURCE_TOOLTIP` | Shows resource type details. | Flag cloth unfurls in the active player color, resource icon sparkles, income text ticks, and map mine sprite changes owner color on close. |

### State Changes
- `state.ui.adventure.pendingMineVisit.mineId` refreshes `mineId` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[mineId]` refreshes `mineRecord` after the owning reducer or local UI draft changes.
- `state.turn.activePlayerId` refreshes `activePlayer` after the owning reducer or local UI draft changes.
- `selectors.economy.mineIncomePreview` refreshes `dailyIncome` after the owning reducer or local UI draft changes.
- `selectors.mapObjects.mineGuardState` refreshes `guardState` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Claim mine can route to `07-adventure-map` after guard approval and exit animation.
- Fight guard can route to `40-pre-battle-dialog` after guard approval and exit animation.
- Leave can route to `07-adventure-map` after guard approval and exit animation.
- Right-click resource can route to `18-map-object-tooltip` after guard approval and exit animation.

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
| Claim mine (`CLAIM_MINE`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
