# Screen 65: Map Editor
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Map editor shell with terrain/object palettes, brush tools, layers, scenario properties, validation, and save/export controls.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select tool | `editor.selectTool` | local-ui | Current screen | `SELECT_EDITOR_TOOL` | Changes active editing tool. | Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows. |
| Paint tile | `editor.paintTile` | command | Current screen | `APPLY_EDITOR_BRUSH` | Mutates editor draft document. | Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows. |
| Place object | `editor.placeObject` | command | Current screen | `PLACE_EDITOR_OBJECT` | Adds object record with stable ID. | Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows. |
| Validate | `editor.validate` | local-ui | Current screen | `VALIDATE_EDITOR_DOCUMENT` | Refreshes validation drawer. | Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows. |
| Save | `editor.save` | command | Current screen | `SAVE_EDITOR_SCENARIO` | Writes scenario draft after validation guard. | Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows. |

### State Changes
- `state.editor.currentDocument` refreshes `editorDocument` after the owning reducer or local UI draft changes.
- `state.editor.selectedTool` refreshes `selectedTool` after the owning reducer or local UI draft changes.
- `state.editor.selectedLayer` refreshes `selectedLayer` after the owning reducer or local UI draft changes.
- `state.editor.selection` refreshes `selection` after the owning reducer or local UI draft changes.
- `selectors.editor.validationIssues` refreshes `validationIssues` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes


### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
