# Screen 16: View World
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Full-world overview for View Air/View Earth style spells and strategic map scanning.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select pin | `viewWorld.selectPin` | local-ui | Current screen | `SELECT_VIEW_WORLD_PIN` | Updates detail plaque. | Cloud/fog masks part over legal regions, ownership pins twinkle, selected focus ring expands, and return zooms back to adventure camera. |
| Change layer | `viewWorld.changeLayer` | local-ui | Current screen | `SET_VIEW_WORLD_LAYER` | Changes overview layer without moving adventure camera. | Cloud/fog masks part over legal regions, ownership pins twinkle, selected focus ring expands, and return zooms back to adventure camera. |
| Focus selected | `viewWorld.focusSelected` | navigation | `07-adventure-map` | `FOCUS_VIEW_WORLD_TARGET` | Centers map on legal selected target. | Cloud/fog masks part over legal regions, ownership pins twinkle, selected focus ring expands, and return zooms back to adventure camera. |
| Close | `viewWorld.close` | navigation | `07-adventure-map` or `47-spell-book` | `CLOSE_VIEW_WORLD` | Returns to spell/adventure caller. | Cloud/fog masks part over legal regions, ownership pins twinkle, selected focus ring expands, and return zooms back to adventure camera. |

### State Changes
- `state.ui.viewWorld.spellContext` refreshes `spellContext` after the owning reducer or local UI draft changes.
- `selectors.spells.viewWorldVisibleObjects` refreshes `visibleWorld` after the owning reducer or local UI draft changes.
- `state.ui.viewWorld.selectedObjectId` refreshes `selectedFocus` after the owning reducer or local UI draft changes.
- `state.adventure.activeLayer` refreshes `activeLayer` after the owning reducer or local UI draft changes.
- `selectors.spells.viewWorldManaCost` refreshes `manaPreview` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Focus selected can route to `07-adventure-map` after guard approval and exit animation.
- Close can route to `07-adventure-map` or `47-spell-book` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
