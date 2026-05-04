# Screen 37: Quick Recruit Window
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Condensed town-wide recruitment window for buying available creatures across all built dwellings in one pass.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle row | `quickRecruit.toggleRow` | local-ui | Current screen | `TOGGLE_QUICK_RECRUIT_ROW` | Updates selected rows and total cost. | Checked rows glow, total cost rolls up, recruited stacks march into army slots, and unavailable rows remain dark with localized disabled reasons. |
| Select all affordable | `quickRecruit.selectAffordable` | local-ui | Current screen | `SELECT_AFFORDABLE_RECRUITS` | Checks all currently affordable legal rows. | Checked rows glow, total cost rolls up, recruited stacks march into army slots, and unavailable rows remain dark with localized disabled reasons. |
| Recruit selected | `quickRecruit.commit` | command | `24-town-screen` | `QUICK_RECRUIT_CREATURES` | Spends resources, decrements stock, updates destination army. | Checked rows glow, total cost rolls up, recruited stacks march into army slots, and unavailable rows remain dark with localized disabled reasons. |
| Close | `quickRecruit.close` | navigation | `24-town-screen` | `CLOSE_QUICK_RECRUIT` | Discards local selections. | Checked rows glow, total cost rolls up, recruited stacks march into army slots, and unavailable rows remain dark with localized disabled reasons. |

### State Changes
- `selectors.towns.quickRecruitRows` refreshes `dwellingRows` after the owning reducer or local UI draft changes.
- `state.ui.quickRecruit.selectedDwellingIds` refreshes `selectedRows` after the owning reducer or local UI draft changes.
- `selectors.towns.quickRecruitDestinationArmy` refreshes `destinationArmy` after the owning reducer or local UI draft changes.
- `selectors.economy.quickRecruitTotalCost` refreshes `totalCost` after the owning reducer or local UI draft changes.
- `selectors.towns.quickRecruitRowGuards` refreshes `rowGuards` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Recruit selected can route to `24-town-screen` after guard approval and exit animation.
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
| Recruit selected (`QUICK_RECRUIT_CREATURES`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
