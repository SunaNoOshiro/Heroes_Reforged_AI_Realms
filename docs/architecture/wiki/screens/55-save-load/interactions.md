# Screen 55: Save / Load
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Save/load slot browser with save metadata, compatibility checks, overwrite confirmation, and selected slot preview.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select slot | `saveLoad.selectSlot` | local-ui | Current screen | `SELECT_SAVE_SLOT` | Updates preview and compatibility. | Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation. |
| Save | `saveLoad.save` | command | Current screen | `SAVE_GAME_SLOT` | Writes save manifest and payload after overwrite guard. | Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation. |
| Load | `saveLoad.load` | navigation | `59-loading-screen` | `LOAD_GAME_SLOT` | Validates and loads selected save. | Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation. |
| Delete | `saveLoad.delete` | navigation | `60-confirmation-dialog` | `REQUEST_DELETE_SAVE_SLOT` | Requires confirmation. | Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation. |
| Back | `saveLoad.back` | navigation | `54-system-menu` or `01-main-menu` | `CLOSE_SAVE_LOAD` | Returns to caller. | Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation. |

### State Changes
- `state.ui.saveLoad.mode` refreshes `mode` after the owning reducer or local UI draft changes.
- `selectors.persistence.saveSlotManifests` refreshes `slots` after the owning reducer or local UI draft changes.
- `state.ui.saveLoad.selectedSlotId` refreshes `selectedSlot` after the owning reducer or local UI draft changes.
- `selectors.persistence.selectedSaveCompatibility` refreshes `compatibility` after the owning reducer or local UI draft changes.
- `selectors.persistence.overwriteGuard` refreshes `overwriteGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Load can route to `59-loading-screen` after guard approval and exit animation.
- Delete can route to `60-confirmation-dialog` after guard approval and exit animation.
- Back can route to `54-system-menu` or `01-main-menu` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
