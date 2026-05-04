# Screen 26: Marketplace
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Resource exchange screen with offer resource, receive resource, rate calculation, quantity slider, resource ledger, and trade confirmation.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select offer | `market.selectOffer` | local-ui | Current screen | `SELECT_MARKET_OFFER_RESOURCE` | Updates rate preview and valid receive targets. | Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance. |
| Select receive | `market.selectReceive` | local-ui | Current screen | `SELECT_MARKET_RECEIVE_RESOURCE` | Updates output preview. | Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance. |
| Change amount | `market.changeAmount` | local-ui | Current screen | `SET_MARKET_TRADE_AMOUNT` | Updates draft quantity and result. | Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance. |
| Trade | `market.trade` | command | Current screen | `TRADE_RESOURCES` | Commits resource exchange. | Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance. |
| Close | `market.close` | navigation | `24-town-screen` | `CLOSE_MARKETPLACE` | Returns to town. | Selected resources brighten, the exchange arrow pulses, offered amount counts down, received amount counts up after reducer acceptance. |

### State Changes
- `state.players.active.resources` refreshes `player.resources` after the owning reducer or local UI draft changes.
- `state.marketplace.currentRates` refreshes `market.rates` after the owning reducer or local UI draft changes.
- `state.ui.marketplace.offerResource` refreshes `selectedOffer` after the owning reducer or local UI draft changes.
- `state.ui.marketplace.receiveResource` refreshes `selectedReceive` after the owning reducer or local UI draft changes.
- `state.ui.marketplace.amount` refreshes `tradeAmount` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `24-town-screen` after guard approval and exit animation.

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
| Trade (`TRADE_RESOURCES`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
