# Screen 32: Artifact Merchant / Black Market
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Artifact shop or black market service for browsing, buying, and selling eligible artifacts.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select shelf item | `artifactMarket.selectShelf` | local-ui | Current screen | `SELECT_ARTIFACT_MARKET_ITEM` | Updates item details and price. | Artifacts shimmer on the shelf, selected item lifts, price tag flips between buy/sell, and purchased items slide into the backpack. |
| Buy artifact | `artifactMarket.buy` | command | Current screen | `BUY_ARTIFACT` | Spends gold, moves artifact to backpack, marks stock sold. | Artifacts shimmer on the shelf, selected item lifts, price tag flips between buy/sell, and purchased items slide into the backpack. |
| Sell artifact | `artifactMarket.sell` | command | Current screen | `SELL_ARTIFACT` | Removes backpack item and adds gold if selling is allowed. | Artifacts shimmer on the shelf, selected item lifts, price tag flips between buy/sell, and purchased items slide into the backpack. |
| Close | `artifactMarket.close` | navigation | `24-town-screen` | `CLOSE_ARTIFACT_MARKET` | Returns to town service strip. | Artifacts shimmer on the shelf, selected item lifts, price tag flips between buy/sell, and purchased items slide into the backpack. |

### State Changes
- `state.towns.byId[selected].artifactMarketStock` refreshes `marketStock` after the owning reducer or local UI draft changes.
- `state.ui.artifactMarket.selectedArtifactId` refreshes `selectedArtifact` after the owning reducer or local UI draft changes.
- `state.heroes.byId[visiting].backpack` refreshes `heroBackpack` after the owning reducer or local UI draft changes.
- `selectors.economy.artifactMarketPrice` refreshes `pricePreview` after the owning reducer or local UI draft changes.
- `state.players.active.resources.gold` refreshes `gold` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `24-town-screen` after guard approval and exit animation.

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
| Buy artifact (`BUY_ARTIFACT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Sell artifact (`SELL_ARTIFACT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
