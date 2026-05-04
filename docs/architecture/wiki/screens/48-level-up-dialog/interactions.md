# Screen 48: Level Up Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Hero level-up choice dialog showing primary stat gain, two secondary skill choices, class weighting, and acceptance result.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select left skill | `levelUp.selectLeft` | local-ui | Current screen | `SELECT_LEVEL_UP_CHOICE` | Updates local selected skill. | XP bar fills, primary stat gem flashes, skill cards slide in from left/right, and selected card stamps into the hero sheet. |
| Select right skill | `levelUp.selectRight` | local-ui | Current screen | `SELECT_LEVEL_UP_CHOICE` | Updates local selected skill. | XP bar fills, primary stat gem flashes, skill cards slide in from left/right, and selected card stamps into the hero sheet. |
| Confirm | `levelUp.confirm` | command | `46-hero-screen` or previous screen | `APPLY_HERO_LEVEL_UP` | Applies primary stat and selected secondary skill. | XP bar fills, primary stat gem flashes, skill cards slide in from left/right, and selected card stamps into the hero sheet. |

### State Changes
- `state.ui.levelUp.heroId` refreshes `heroId` after the owning reducer or local UI draft changes.
- `state.ui.levelUp.primaryStatGain` refreshes `primaryGain` after the owning reducer or local UI draft changes.
- `state.ui.levelUp.skillChoices` refreshes `skillChoices` after the owning reducer or local UI draft changes.
- `state.ui.levelUp.selectedChoiceId` refreshes `selectedChoice` after the owning reducer or local UI draft changes.
- `state.heroes.byId[heroId].experience` refreshes `experience` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Confirm can route to `46-hero-screen` or previous screen after guard approval and exit animation.

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
| Confirm (`APPLY_HERO_LEVEL_UP`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
