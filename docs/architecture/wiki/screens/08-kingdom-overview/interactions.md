# Screen 08: Kingdom Overview — Interaction Map

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Purpose
Adventure-layer kingdom ledger summarizing owned towns, heroes,
daily income, movement status, and strategic warnings. Selection
and close route to other screens; **no deterministic gameplay
command is committed here**.

## 2. Actions

All four tokens are **UI-local routing** (prefixes `OPEN_`,
`FOCUS_`, `CLOSE_` per
[`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json));
none enter the command log. Every row resolves into the § 3
Animation pool.

| UI element | Action ID | Type | Next screen | Token | Data updated |
| --- | --- | --- | --- | --- | --- |
| Click town row | `kingdom.selectTown` | navigation | [`24-town-screen`](../24-town-screen/) | `OPEN_TOWN_SCREEN` | Sets selected town context; no economy mutation. |
| Click hero row | `kingdom.selectHero` | navigation | [`46-hero-screen`](../46-hero-screen/) | `OPEN_HERO_SCREEN` | Sets selected hero context; preserves adventure camera. |
| `FOCUS` button | `kingdom.focusMap` | navigation | [`07-adventure-map`](../07-adventure-map/) | `FOCUS_ADVENTURE_ENTITY` | Centers camera on the selected town or hero. |
| `CLOSE` button | `kingdom.close` | navigation | [`07-adventure-map`](../07-adventure-map/) | `CLOSE_KINGDOM_OVERVIEW` | Returns to previous adventure selection. |

## 3. Animation
Pool of screen-wide animations that the actions above pick from:

- **A1.** Ledger slides up over the dimmed adventure map on open.
- **A2.** Selected row receives a brass outline on hover or select.
- **A3.** Resource deltas in `DailyIncomeStrip` count upward after day / week changes.
- **A4.** Ledger fades back to map focus on `kingdom.close`.

Under `config.ui.reducedMotion === true`, motion is replaced by
static highlights; visible state changes are preserved with
localized feedback.

## 4. State Changes
Authoritative selectors refresh their bound handles whenever the
owning reducer or local UI draft changes:

- `state.players.active.townIds` → `townRows`.
- `state.players.active.heroIds` → `heroRows`.
- `selectors.economy.dailyIncomeByResource` → `incomeTotals`.
- `state.ui.kingdomOverview.selectedRowId` → `selectedRow` (UI-only; not persisted, not replayed).
- `selectors.adventure.kingdomWarnings` → `warnings`.

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay
state.

## 5. Disabled & Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the current screen open, preserve local draft
  where useful, show localized error text, and play failure
  feedback.
- Error toast text is produced by `formatUserError(err, locale)`
  declared in [`error-formatter.md`](../../../error-formatter.md);
  never construct error strings inline.

## 6. Navigation Outcomes
- `kingdom.selectTown` → [`24-town-screen`](../24-town-screen/) after guard approval and exit animation.
- `kingdom.selectHero` → [`46-hero-screen`](../46-hero-screen/) after guard approval and exit animation.
- `kingdom.focusMap` → [`07-adventure-map`](../07-adventure-map/) after guard approval and exit animation.
- `kingdom.close` → [`07-adventure-map`](../07-adventure-map/) after guard approval and exit animation.

## 7. AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these interactions and must not invent new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action set matches the `data-action` attributes in [`mockup.html`](./mockup.html) (`kingdom.selectTown`, `kingdom.selectHero`, `kingdom.focusMap`, `kingdom.close`) and the four-route flow in [`architecture.md` § 7 Outgoing Transitions](./architecture.md#7-outgoing-transitions).
- **Schema: ✔** — All four tokens classified as `localUiPrefixes` in [`screen-command-coverage.json`](../../../screen-command-coverage.json); none are schema-backed commands. Error formatter reference resolves to [`error-formatter.md`](../../../error-formatter.md).
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md) Acceptance Criteria require every token here to resolve through `screen-command-coverage.json` — UI-local tokens render in route / draft state, never as engine reducers.

## ⚠ Issues

_None._
