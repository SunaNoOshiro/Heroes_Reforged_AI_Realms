# Screen 53: University
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
University skill-learning service where a visiting hero can buy offered secondary skills if legal.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select skill | `university.selectSkill` | local-ui | Current screen | `SELECT_UNIVERSITY_SKILL` | Updates price and legality preview. | Professor cards glow, selected skill book opens, gold ticks down, and learned skill slides into the hero skill row. |
| Learn | `university.learn` | command | Current screen | `LEARN_UNIVERSITY_SKILL` | Spends gold and adds/upgrades selected skill. | Professor cards glow, selected skill book opens, gold ticks down, and learned skill slides into the hero skill row. |
| Close | `university.close` | navigation | `07-adventure-map` or `24-town-screen` | `CLOSE_UNIVERSITY` | Returns to caller. | Professor cards glow, selected skill book opens, gold ticks down, and learned skill slides into the hero skill row. |

### State Changes
- `state.ui.university.sourceId` refreshes `universityId` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[universityId].offeredSkills` refreshes `offeredSkills` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].skills` refreshes `heroSkills` after the owning reducer or local UI draft changes.
- `state.ui.university.selectedSkillId` refreshes `selectedSkill` after the owning reducer or local UI draft changes.
- `selectors.heroes.universityLearnGuard` refreshes `learnGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `07-adventure-map` or `24-town-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
