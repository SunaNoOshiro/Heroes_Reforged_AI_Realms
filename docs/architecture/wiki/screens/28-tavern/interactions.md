# Screen 28: Tavern
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Tavern recruitment and rumor screen with two hero offer cards, hire cost, weekly hero pool, rumor text, and thieves guild entry.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select hero offer | `tavern.selectHero` | local-ui | Current screen | `SELECT_TAVERN_HERO` | Updates selected hero details. | Hero card lifts on hover, hired card slides toward roster, rumor parchment unfurls, thieves guild entry glows on focus. |
| Hire hero | `tavern.hireHero` | command | Current screen | `HIRE_TAVERN_HERO` | Spends gold and adds hero to town/roster. | Hero card lifts on hover, hired card slides toward roster, rumor parchment unfurls, thieves guild entry glows on focus. |
| Open thieves guild | `tavern.thievesGuild` | navigation | `27-thieves-guild` | `OPEN_THIEVES_GUILD` | Routes to intelligence screen. | Hero card lifts on hover, hired card slides toward roster, rumor parchment unfurls, thieves guild entry glows on focus. |
| Close | `tavern.close` | navigation | `24-town-screen` | `CLOSE_TAVERN` | Returns to town. | Hero card lifts on hover, hired card slides toward roster, rumor parchment unfurls, thieves guild entry glows on focus. |

### State Changes
- `state.tavern.weeklyHeroOffers` refreshes `heroPool` after the owning reducer or local UI draft changes.
- `state.players.active.resources.gold` refreshes `playerGold` after the owning reducer or local UI draft changes.
- `state.ui.tavern.selectedHeroId` refreshes `selectedOffer` after the owning reducer or local UI draft changes.
- `state.tavern.currentRumorId` refreshes `rumor` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Open thieves guild can route to `27-thieves-guild` after guard approval and exit animation.
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
| Hire hero (`HIRE_TAVERN_HERO`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
