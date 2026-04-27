# Screen 04: Campaign Inter-Mission Narrative
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Campaign briefing or inter-mission narrative screen with story text, portrait, mission objectives, carryover, and Start Mission control.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select bonus | `narrative.selectBonus` | local-ui | Current screen | `SELECT_CAMPAIGN_BONUS` | Updates local bonus draft. | Narrative text types in, portrait fades from sepia, objective seals stamp, and Start transitions through loading. |
| Start mission | `narrative.start` | navigation | `59-loading-screen` | `START_CAMPAIGN_MISSION` | Creates mission setup from campaign node. | Narrative text types in, portrait fades from sepia, objective seals stamp, and Start transitions through loading. |
| Back | `narrative.back` | navigation | `03-campaign-selection` | `CLOSE_CAMPAIGN_BRIEFING` | Returns before mission creation. | Narrative text types in, portrait fades from sepia, objective seals stamp, and Start transitions through loading. |

### State Changes
- `state.campaign.currentNodeId` refreshes `campaignNode` after the owning reducer or local UI draft changes.
- `localization.campaign[node].briefing` refreshes `storyText` after the owning reducer or local UI draft changes.
- `registries.scenarios.byId[mission].objectives` refreshes `objectives` after the owning reducer or local UI draft changes.
- `state.ui.campaignNarrative.selectedBonus` refreshes `bonusChoices` after the owning reducer or local UI draft changes.
- `selectors.campaigns.currentCarryover` refreshes `carryover` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Start mission can route to `59-loading-screen` after guard approval and exit animation.
- Back can route to `03-campaign-selection` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
