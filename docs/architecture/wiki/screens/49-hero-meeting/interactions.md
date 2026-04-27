# Screen 49: Hero Meeting
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Two friendly heroes meeting on the adventure map to exchange troops, artifacts, and war machines.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Drag stack | `heroMeeting.dragStack` | local-ui | Current screen | `START_HERO_MEETING_DRAG` | Creates local drag draft. | Stack and artifact drag ghosts travel between panels, legal targets glow, swaps crossfade, and rejected drops snap back. |
| Drop stack | `heroMeeting.dropStack` | command | Current screen | `TRANSFER_HERO_ARMY_STACK` | Moves, merges, swaps, or rejects stacks. | Stack and artifact drag ghosts travel between panels, legal targets glow, swaps crossfade, and rejected drops snap back. |
| Move artifact | `heroMeeting.moveArtifact` | command | Current screen | `TRANSFER_HERO_ARTIFACT` | Moves artifact if slot/backpack rules allow. | Stack and artifact drag ghosts travel between panels, legal targets glow, swaps crossfade, and rejected drops snap back. |
| Close | `heroMeeting.close` | navigation | `07-adventure-map` | `CLOSE_HERO_MEETING` | Returns to adventure map. | Stack and artifact drag ghosts travel between panels, legal targets glow, swaps crossfade, and rejected drops snap back. |

### State Changes
- `state.ui.heroMeeting.leftHeroId` refreshes `leftHero` after the owning reducer or local UI draft changes.
- `state.ui.heroMeeting.rightHeroId` refreshes `rightHero` after the owning reducer or local UI draft changes.
- `state.heroes.byId[left].army` refreshes `leftArmy` after the owning reducer or local UI draft changes.
- `state.heroes.byId[right].army` refreshes `rightArmy` after the owning reducer or local UI draft changes.
- `state.ui.heroMeeting.dragDraft` refreshes `dragDraft` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
