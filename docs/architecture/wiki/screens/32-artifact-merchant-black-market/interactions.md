# Screen 32: Artifact Merchant / Black Market
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Artifact shop / black market for browsing, buying, and selling
eligible artifacts at the visiting town.

### Actions
Token classes follow [`screen-command-coverage.json`](../../../screen-command-coverage.json):
`command` = schema-backed (`BUY_ARTIFACT`, `SELL_ARTIFACT`);
`local-ui` = `SELECT_` / `CLOSE_` prefix tokens that never enter the
deterministic command log.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select shelf item | `artifactMarket.selectShelf` | local-ui | Current screen | `SELECT_ARTIFACT_MARKET_ITEM` | `state.ui.artifactMarket.selectedArtifactId`; recomputes `pricePreview`. | Shelf slot shimmers, selected item lifts; price tag flips between buy/sell labels. `audio.ui.hover` on hover, `audio.ui.click` on select. |
| Buy artifact | `artifactMarket.buy` | command | Current screen | `BUY_ARTIFACT` `{ heroId, marketId, artifactId }` | Deducts gold, moves artifact to hero backpack, marks stock sold. | Purchased item slides from shelf into the backpack strip. `audio.town.*` purchase cue. |
| Sell artifact | `artifactMarket.sell` | command | Current screen | `SELL_ARTIFACT` `{ heroId, marketId, artifactId }` | Removes the backpack artifact, credits the quoted gold (when the variant allows selling). | Backpack item slides out toward the shelf. `audio.town.*` sale cue. |
| Close | `artifactMarket.close` | local-ui (navigation) | [`24-town-screen`](../24-town-screen/) | `CLOSE_ARTIFACT_MARKET` | Clears `state.ui.artifactMarket.selectedArtifactId`; returns to town service strip. | Modal exit fade; `audio.ui.click`. |

### State Changes
- `state.towns.byId[<selectedTownId>].artifactMarketStock` refreshes `marketStock` after the owning reducer commits `BUY_ARTIFACT` / `SELL_ARTIFACT`.
- `state.ui.artifactMarket.selectedArtifactId` refreshes `selectedArtifact` after `SELECT_ARTIFACT_MARKET_ITEM` or `CLOSE_ARTIFACT_MARKET`.
- `state.heroes.byId[<visitingHeroId>].backpack` refreshes `heroBackpack` after `BUY_ARTIFACT` / `SELL_ARTIFACT`.
- `selectors.economy.artifactMarketPrice` recomputes `pricePreview` after selection or after stock mutation.
- `state.players.active.resources.gold` refreshes `gold` after `BUY_ARTIFACT` / `SELL_ARTIFACT`.
- UI-only hover, focus, drag ghost, and animation-frame state stay outside deterministic gameplay state.

### Navigation Outcomes
- Close routes to [`24-town-screen`](../24-town-screen/) after the exit animation; no guard required (local-ui only).

### Disabled And Error Cases
- Disable Buy / Sell when required selectors, registry records, gold cost, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Error toast text is produced by `formatUserError(err, locale)` from [`error-formatter.md`](../../../error-formatter.md); never construct error strings inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `data-contracts.md` owns schemas, config, localization, asset, audio, VFX, save, and replay references.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md), this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Buy artifact (`BUY_ARTIFACT`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |
| Sell artifact (`SELL_ARTIFACT`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, types, and `Next Screen` targets match sibling [`spec.md`](./spec.md), [`data-contracts.md`](./data-contracts.md), [`architecture.md`](./architecture.md), and `mockup.html` (`data-action="artifactMarket.buy" | "sell" | "close"`).
- **Schema: ⚠** — `BUY_ARTIFACT` / `SELL_ARTIFACT` payload shape `{ heroId, marketId, artifactId }` is the closed schema; `marketId` has no state-binding source in this package. Detailed in `## ⚠ Issues` and mirrored in sibling [`data-contracts.md` § ⚠ Issues](./data-contracts.md). `SELECT_ARTIFACT_MARKET_ITEM` and `CLOSE_ARTIFACT_MARKET` are correctly UI-local per [`screen-command-coverage.json`](../../../screen-command-coverage.json) prefix list.
- **Tasks: ✔** — Reducer task [`phase-2.01-spells-artifacts.10-buy-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/10-buy-artifact-command.md) owns the two commands; screen task [`phase-2.07-ui-screen-backlog.32-artifact-merchant-black-market-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/32-artifact-merchant-black-market-screen.md) owns the wiring; both read first this file.

## ⚠ Issues

- **`marketId` payload field has no UI source.** The closed `BUY_ARTIFACT` / `SELL_ARTIFACT` schemas in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) require `marketId`, but no binding in this package names it. See sibling [`data-contracts.md` § ⚠ Issues](./data-contracts.md) and [`architecture.md` § ⚠ Issues](./architecture.md) — aligned. Owner: [`phase-2.01-spells-artifacts.10-buy-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/10-buy-artifact-command.md). Flagged per Hard Prohibition B (do not invent the binding).
