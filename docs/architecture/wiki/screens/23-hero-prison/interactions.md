# Screen 23: Hero Prison
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure prison dialog for releasing an imprisoned hero into the player's roster when limits and ownership rules allow.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Release hero | `prison.release` | command | `07-adventure-map` | `RELEASE_PRISON_HERO` | Adds hero to roster, marks prison visited, spawns hero at valid tile. | Cell bars lift, hero portrait brightens, roster slot glows, released hero appears beside the prison, and the prison object becomes visited. |
| Inspect hero | `prison.inspectHero` | navigation | `46-hero-screen` | `OPEN_IMPRISONED_HERO_PREVIEW` | Shows read-only hero sheet preview. | Cell bars lift, hero portrait brightens, roster slot glows, released hero appears beside the prison, and the prison object becomes visited. |
| Leave | `prison.leave` | navigation | `07-adventure-map` | `CLOSE_HERO_PRISON` | Leaves prison unresolved. | Cell bars lift, hero portrait brightens, roster slot glows, released hero appears beside the prison, and the prison object becomes visited. |

### State Changes
- `state.ui.adventure.pendingPrisonId` refreshes `prisonId` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[prisonId].heroId` refreshes `imprisonedHero` after the owning reducer or local UI draft changes.
- `selectors.heroes.availableRosterSlots` refreshes `rosterSlots` after the owning reducer or local UI draft changes.
- `selectors.heroes.prisonReleaseGuard` refreshes `releaseGuard` after the owning reducer or local UI draft changes.
- `selectors.mapObjects.prisonReleaseTile` refreshes `spawnTile` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Release hero can route to `07-adventure-map` after guard approval and exit animation.
- Inspect hero can route to `46-hero-screen` after guard approval and exit animation.
- Leave can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
