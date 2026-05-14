# Screen 26: Marketplace
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Resource exchange board: pick an offer resource and a receive
resource, set quantity, preview the rate, and commit
`TRADE_RESOURCES`. Close returns to the town screen.

### Actions
Per-row Animation/Audio reuses the shared cue described under
`spec.md` § Animation Contract; selection brightens the slot, the
exchange arrow pulses, and on reducer acceptance the offered
amount counts down while the received amount counts up. Hover and
click use `audio.ui.hover` / `audio.ui.click`.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select offer slot | `market.selectOffer` | local-ui | Current screen | `SELECT_MARKET_OFFER_RESOURCE` | Updates `selectedOffer` and recomputes rate preview / valid receive targets. |
| Select receive slot | `market.selectReceive` | local-ui | Current screen | `SELECT_MARKET_RECEIVE_RESOURCE` | Updates `selectedReceive` and result preview. |
| Adjust quantity | `market.changeAmount` | local-ui | Current screen | `SET_MARKET_TRADE_AMOUNT` | Updates `tradeAmount` draft and rate × amount result. |
| Trade button | `market.trade` | command | Current screen | `TRADE_RESOURCES` | Commits the resource exchange; refreshes `player.resources`. |
| Close button | `market.close` | navigation | `24-town-screen` | `CLOSE_MARKETPLACE` | Returns to town after guard approval and exit animation. |

### State Changes
- `state.players.active.resources` refreshes `player.resources`
  only after the reducer accepts `TRADE_RESOURCES`.
- `state.marketplace.currentRates` refreshes `market.rates` when
  the owning marketplace count, ruleset, or selected pair changes.
- `state.ui.marketplace.offerResource`,
  `state.ui.marketplace.receiveResource`, and
  `state.ui.marketplace.amount` are local-ui drafts; they do not
  enter the deterministic command log.
- Hover, focus, slot highlight, drag ghost, and animation frame
  stay outside deterministic gameplay state.

### Navigation Outcomes
- `market.close` routes to `24-town-screen` after the route guard
  approves and the exit animation completes.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback; missing
  gameplay records, invalid content IDs, or rejected commands
  fail loudly.
- On rejection, keep the current screen open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Error toast text is produced by `formatUserError(err, locale)`
  declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct it inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
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
| Trade (`TRADE_RESOURCES`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — `market.trade` and `market.close` action IDs match the `data-action` attributes on the TRADE / CLOSE buttons in `mockup.html`; sibling `spec.md` § Component Tree and `architecture.md` § Main Interaction Flow reference the same command list.
- **Schema: ✔** — `TRADE_RESOURCES` is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json#L835). All other tokens are local-ui per [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes` (`SELECT_`, `SET_`, `CLOSE_`).
- **Tasks: ✔** — Engine reducer owned by [`tasks/mvp/05-adventure-map/10-trade-resources-command.md`](../../../../../tasks/mvp/05-adventure-map/10-trade-resources-command.md); UI owned by [`tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md).

## ⚠ Issues

- **Mockup exposes only Trade/Close buttons.** `market.selectOffer`, `market.selectReceive`, and `market.changeAmount` are implied by clickable slots / slider but `mockup.html` has no `data-action="market.selectOffer"` (etc.) hooks on the slot `<g>` elements. Not CI-blocking — the slot groups carry `data-item` — but the UI implementer in `phase-2.07-ui-screen-backlog.26-marketplace-screen` must wire each slot click and the slider to the listed action IDs.
- **Hotkey column missing.** [`contract-sweep.md`](../../_templates/contract-sweep.md) prescribes a Hotkey column referencing [`hotkey/global-default.hotkey.json`](../../../../../content-schema/examples/records/hotkey/global-default.hotkey.json) for every action; not present here. Sweep batch 4 ("Remaining screens") owns the addition.
- **Drag affordances undeclared.** `contract-sweep.md` lists `26-marketplace` under drag-using screens; no `accepts` column or `DragKind` is declared. Per Hard Prohibition B, not added here. Suggested next step: declare drag from offer slot → receive slot if the implementer chooses drag input, owned by the same sweep.
- **Sibling-aligned** with `spec.md` § Animation Contract (single source of animation cues) and `data-contracts.md` § Commands And Events (same five action IDs).
