# Screen 14: War Machine Factory
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure shop for buying ballista, ammo cart, first aid tent, or catapult-related war machine services where rules allow.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select machine | `warFactory.selectMachine` | local-ui | Current screen | `SELECT_WAR_MACHINE` | Updates price and slot preview. | Machine bay lights on hover, purchase stamps SOLD, gold count ticks down, and the acquired machine slides into the hero rack. |
| Buy | `warFactory.buy` | command | Current screen | `BUY_WAR_MACHINE` | Spends gold, updates hero machine slot, decrements stock when limited. | Machine bay lights on hover, purchase stamps SOLD, gold count ticks down, and the acquired machine slides into the hero rack. |
| Close | `warFactory.close` | navigation | `07-adventure-map` | `CLOSE_WAR_MACHINE_FACTORY` | Returns to adventure map. | Machine bay lights on hover, purchase stamps SOLD, gold count ticks down, and the acquired machine slides into the hero rack. |

### State Changes
- `state.mapObjects.byId[factoryId].warMachineStock` refreshes `shopStock` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].warMachines` refreshes `heroMachines` after the owning reducer or local UI draft changes.
- `state.ui.warMachineFactory.selectedMachineId` refreshes `selectedMachine` after the owning reducer or local UI draft changes.
- `selectors.economy.selectedWarMachinePrice` refreshes `price` after the owning reducer or local UI draft changes.
- `state.players.active.resources.gold` refreshes `resources` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `07-adventure-map` after guard approval and exit animation.

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
| Buy (`BUY_WAR_MACHINE`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
