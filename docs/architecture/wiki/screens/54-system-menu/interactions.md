# Screen 54: System Menu
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
In-game system menu overlay for save, load, options, restart, main menu, and quit confirmation.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Save Game | `system.save` | navigation | `55-save-load` | `OPEN_SAVE_GAME` | Routes to save mode. | Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs. |
| Load Game | `system.load` | navigation | `55-save-load` | `OPEN_LOAD_GAME` | Routes to load mode. | Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs. |
| Options | `system.options` | navigation | `56-options` | `OPEN_OPTIONS` | Routes to settings. | Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs. |
| Main Menu | `system.mainMenu` | navigation | `60-confirmation-dialog` | `REQUEST_RETURN_TO_MAIN_MENU` | Requires confirmation. | Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs. |
| Resume | `system.resume` | navigation | Caller screen | `CLOSE_SYSTEM_MENU` | Returns to gameplay. | Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs. |

### State Changes
- `state.ui.systemMenu.callerRoute` refreshes `callerRoute` after the owning reducer or local UI draft changes.
- `selectors.persistence.canSaveCurrentGame` refreshes `canSave` after the owning reducer or local UI draft changes.
- `selectors.persistence.hasLoadableSave` refreshes `canLoad` after the owning reducer or local UI draft changes.
- `selectors.session.restartGuard` refreshes `restartGuard` after the owning reducer or local UI draft changes.
- `state.ui.unsavedDrafts` refreshes `dirtyDrafts` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Save Game can route to `55-save-load` after guard approval and exit animation.
- Load Game can route to `55-save-load` after guard approval and exit animation.
- Options can route to `56-options` after guard approval and exit animation.
- Main Menu can route to `60-confirmation-dialog` after guard approval and exit animation.
- Resume can route to Caller screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
