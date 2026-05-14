# Screen 36: Marketplace Artifact Trading
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town-marketplace sub-service for exchanging a hero artifact for
gold, resources, or another artifact via a deterministic quote.

### Actions
Shared animation for every row: artifact cards slide onto the
scales, the valuation needle moves, an accepted trade stamps the
receipt, and a rejected locked artifact snaps back. Reduced motion
swaps the slide / needle motion for static highlights.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select artifact | `artifactTrade.selectOffer` | local-ui | Current | `SELECT_ARTIFACT_TRADE_OFFER` | Places artifact on offer scale locally. |
| Select quote | `artifactTrade.selectQuote` | local-ui | Current | `SELECT_ARTIFACT_TRADE_QUOTE` | Updates requested outcome locally. |
| Trade | `artifactTrade.commit` | command | Current | `TRADE_ARTIFACT` | Moves / removes artifact and applies quote result. |
| Close | `artifactTrade.close` | navigation | `26-marketplace` | `CLOSE_ARTIFACT_TRADING` | Returns to the main marketplace. |

Token coverage per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):
`SELECT_*` and `CLOSE_*` are local-ui prefixes; `TRADE_ARTIFACT`
is the schema-backed command kind in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### State Changes
- `state.heroes.byId[visiting].artifacts` refreshes `heroArtifacts`
  after the reducer accepts `TRADE_ARTIFACT`.
- `state.ui.artifactTrading.offerArtifactId` refreshes
  `selectedOffer` from the local UI draft.
- `state.ui.artifactTrading.requestId` refreshes `selectedRequest`
  from the local UI draft.
- `selectors.economy.artifactTradeQuote` refreshes `quote` whenever
  offer / request inputs or market state change.
- `selectors.economy.artifactTradeGuard` refreshes `tradeGuard`
  whenever ownership, locked-slot, capacity, or affordability
  inputs change.
- UI-only hover, focus, drag-ghost, and animation frame stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `Close` routes to `26-marketplace` after the guard approves and
  the exit animation completes.

### Disabled And Error Cases
- Disable `Trade` when any of: required selectors absent, registry
  records missing, ownership invalid, equipped slot locked,
  backpack capacity exceeded, valuation undefined, phase wrong, or
  route guard fails.
- Missing presentation assets may fall back through the asset
  resolver. Missing gameplay records, invalid content IDs, or
  rejected commands fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the screen open, preserve the local draft when
  useful, show localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)` per
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5 this screen inherits
the default code → surface mapping from § 2. The table below maps
each `Type: command` action to its default surface for this
screen's dominant error domain. A row whose Notes column reads
`override` replaces the § 2 default for that action; otherwise the
default applies. Specific codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Trade (`TRADE_ARTIFACT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Each action token in the table corresponds to a `data-action` hook in `mockup.html` (`artifactTrade.commit`, `artifactTrade.close`); state-change paths and component names match sibling [`spec.md`](./spec.md) and [`architecture.md`](./architecture.md).
- **Schema: ❌** — `TRADE_ARTIFACT` is schema-backed but the payload shape in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (`fromHeroId` + `toHeroId` + `artifactId`) does not match the marketplace flow the action row dispatches (artifact → gold / resource / artifact quote). See sibling [`spec.md`](./spec.md) `## ⚠ Issues` — same gap, single owner.
- **Tasks: ✔** — Owning UI task [`tasks/phase-2/07-ui-screen-backlog/36-marketplace-artifact-trading-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/36-marketplace-artifact-trading-screen.md) Reads-First this file; command implementation lives in [`tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md`](../../../../../tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md).

## ⚠ Issues

- **`TRADE_ARTIFACT` payload mismatch.** Documented in sibling [`spec.md`](./spec.md) `## ⚠ Issues` — single canonical entry. The interaction row dispatches `TRADE_ARTIFACT` as the screen's trade-commit command; the schema kind is hero-to-hero. Owner: [`phase-2.01-spells-artifacts.17-trade-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md). Not edited here per Hard Prohibition D.
- **Animation column collapsed to a shared lead-in.** The original table repeated the same `Animation / Audio` string in every row. Consolidated to a single paragraph above the table per § 4 (no duplicated ideas); meaning preserved verbatim, no per-action behavior added or dropped.
