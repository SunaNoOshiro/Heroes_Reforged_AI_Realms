# Screen 37: Quick Recruit Window
## Interaction Map

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Purpose
Condensed town-wide recruitment window for buying available
creatures across all built dwellings in one pass.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle row | `quickRecruit.toggleRow` | local-ui | Current | `TOGGLE_QUICK_RECRUIT_ROW` | Updates `selectedRows` and `totalCost`. | Checked row glows; total cost ticks up. |
| Select all affordable | `quickRecruit.selectAffordable` | local-ui | Current | `SELECT_AFFORDABLE_RECRUITS` | Checks every legal, currently-affordable row. | All newly-checked rows glow; total cost rolls up; unaffordable rows stay dim with localized reason. |
| Recruit selected | `quickRecruit.commit` | command | `24-town-screen` | `QUICK_RECRUIT_CREATURES` (alias `RECRUIT_UNITS`) | Spends resources, decrements stock, updates destination army. | Recruited stacks march into army slots on accept; locked / blocked rows remain dim with reason. |
| Close | `quickRecruit.close` | navigation | `24-town-screen` | `CLOSE_QUICK_RECRUIT` | Discards local selections. | Window fades out; no gameplay-state change. |

The animation column splits the screen-wide animation contract in
[`spec.md`](./spec.md) § Animation Contract by triggering action; no
new animations are introduced here.

### State Changes
- `selectors.towns.quickRecruitRows` refreshes `dwellingRows` after
  the owning reducer changes stock, cost, or growth.
- `state.ui.quickRecruit.selectedDwellingIds` refreshes
  `selectedRows` from the `quickRecruit.toggleRow` /
  `quickRecruit.selectAffordable` local-ui drafts.
- `selectors.towns.quickRecruitDestinationArmy` refreshes
  `destinationArmy` after the reducer applies `RECRUIT_UNITS`.
- `selectors.economy.quickRecruitTotalCost` refreshes `totalCost`
  whenever `selectedRows` or affordability changes.
- `selectors.towns.quickRecruitRowGuards` refreshes `rowGuards`
  per-row from current stock, cost, capacity, and merge rules.
- UI-only hover, focus, selected row, drag ghost, and animation
  frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `quickRecruit.commit` routes to `24-town-screen` after the
  reducer accepts every selected row.
- `quickRecruit.close` routes to `24-town-screen` immediately;
  local selections are discarded.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail. The per-row guard list is the same as
  [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md)
  validation: hero in town, town friendly, dwelling exists, stock
  sufficient, resources sufficient, army or garrison capacity.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the window open, preserve local selections,
  show localized error text, and play failure feedback.
- Error text is produced by `formatUserError(err, locale)` declared
  in [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions; they must not introduce hidden behavior.

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
| Recruit selected (`QUICK_RECRUIT_CREATURES`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, route targets, and animation cues align with sibling [`spec.md`](./spec.md) § Animation Contract, [`data-contracts.md`](./data-contracts.md) § Commands And Events, and [`architecture.md`](./architecture.md) § Main Interaction Flow. Both command and navigation actions route to the existing [`24-town-screen`](../24-town-screen/spec.md).
- **Schema: ✔** — `QUICK_RECRUIT_CREATURES` aliases `RECRUIT_UNITS` (verified in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `commandAliases`); canonical schema in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and documented in [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md). The three UI-local tokens (`TOGGLE_QUICK_RECRUIT_ROW`, `SELECT_AFFORDABLE_RECRUITS`, `CLOSE_QUICK_RECRUIT`) match `localUiPrefixes`.
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/37-quick-recruit-window-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/37-quick-recruit-window-screen.md) lists this file in Read First; engine command owner is `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`.

## ⚠ Issues

- **Per-action animation split is a clarification, not a meaning change.** The previous revision listed the full screen-wide animation set on every row, which violated `doc-audit` § 5 ("no ambiguity — every conditional is explicit"). The split here maps each cue to the action that triggers it as described in sibling [`spec.md`](./spec.md) § Animation Contract; no new animation cues are introduced.
- **Mockup `data-action` on row checkboxes is missing.** [`mockup.html`](./mockup.html) declares `data-action` on the three `<g class="button">` elements but the per-row `<rect>` checkboxes carry no `data-action="quickRecruit.toggleRow"`. The owning UI task should attach the toggle action when wiring the React component so the mockup remains a faithful contract for automated coverage checks.
