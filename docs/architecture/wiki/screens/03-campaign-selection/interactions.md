# Screen 03: Campaign Selection
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Campaign book selection with campaign list, faction emblem, progress medals, difficulty, and briefing route.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select campaign | `campaign.select` | local-ui | Current screen | `SELECT_CAMPAIGN` | Updates map, medals, and briefing preview. | Book pages turn between campaigns, faction shield glints, locked campaign chains rattle, and Begin routes to briefing parchment. |
| Change difficulty | `campaign.difficulty` | local-ui | Current screen | `SET_CAMPAIGN_DIFFICULTY` | Updates campaign setup draft. | Book pages turn between campaigns, faction shield glints, locked campaign chains rattle, and Begin routes to briefing parchment. |
| Begin | `campaign.begin` | navigation | `04-campaign-narrative` | `OPEN_CAMPAIGN_BRIEFING` | Creates campaign run draft and opens briefing. | Book pages turn between campaigns, faction shield glints, locked campaign chains rattle, and Begin routes to briefing parchment. |
| Back | `campaign.back` | navigation | `02-new-game-setup` | `CLOSE_CAMPAIGN_SELECTION` | Returns to setup. | Book pages turn between campaigns, faction shield glints, locked campaign chains rattle, and Begin routes to briefing parchment. |

### State Changes
- `selectors.campaigns.availableCampaigns` refreshes `campaigns` after the owning reducer or local UI draft changes.
- `state.ui.campaign.selectedCampaignId` refreshes `selectedCampaign` after the owning reducer or local UI draft changes.
- `state.profile.campaignUnlocks` refreshes `unlockState` after the owning reducer or local UI draft changes.
- `state.ui.campaign.difficulty` refreshes `difficulty` after the owning reducer or local UI draft changes.
- `selectors.campaigns.carryoverPreview` refreshes `carryoverPreview` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Begin can route to `04-campaign-narrative` after guard approval and exit animation.
- Back can route to `02-new-game-setup` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
