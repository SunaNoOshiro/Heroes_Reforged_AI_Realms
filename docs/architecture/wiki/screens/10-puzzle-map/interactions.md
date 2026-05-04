# Screen 10: Puzzle Map
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Obelisk puzzle map view revealing grail-location fragments according to visited obelisks.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select fragment | `puzzle.selectFragment` | local-ui | Current screen | `SELECT_PUZZLE_FRAGMENT` | Updates local clue focus. | New fragments peel open with parchment curl, hidden fragments shimmer subtly, and focused clue tiles pulse with a gold border. |
| Jump to map | `puzzle.jumpToMap` | navigation | `07-adventure-map` | `FOCUS_GRAIL_HINT_REGION` | Centers adventure camera on the revealed region only. | New fragments peel open with parchment curl, hidden fragments shimmer subtly, and focused clue tiles pulse with a gold border. |
| Close | `puzzle.close` | navigation | `07-adventure-map` | `CLOSE_PUZZLE_MAP` | Returns to previous adventure context. | New fragments peel open with parchment curl, hidden fragments shimmer subtly, and focused clue tiles pulse with a gold border. |

### State Changes
- `state.players.active.obelisksVisited` refreshes `obeliskProgress` after the owning reducer or local UI draft changes.
- `selectors.grail.revealedPuzzleFragments` refreshes `fragmentGrid` after the owning reducer or local UI draft changes.
- `state.ui.puzzleMap.selectedFragment` refreshes `selectedFragment` after the owning reducer or local UI draft changes.
- `selectors.grail.visibleRegionHint` refreshes `grailRegionHint` after the owning reducer or local UI draft changes.
- `selectors.grail.selectedFragmentMapFocus` refreshes `mapJumpTarget` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Jump to map can route to `07-adventure-map` after guard approval and exit animation.
- Close can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
