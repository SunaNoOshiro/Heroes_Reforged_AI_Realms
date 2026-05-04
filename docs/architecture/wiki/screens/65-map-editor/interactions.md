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

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Paint tile (`APPLY_EDITOR_BRUSH`) | VALIDATION_REJECTED | inline | `error.validation.rejected.body` | Default per `error-ux.md` § 2 VALIDATION_*; disabled control + tooltip on rejection. |
| Place object (`PLACE_EDITOR_OBJECT`) | VALIDATION_REJECTED | inline | `error.validation.rejected.body` | Default per `error-ux.md` § 2 VALIDATION_*; disabled control + tooltip on rejection. |
| Save (`SAVE_EDITOR_SCENARIO`) | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; quota / corrupt-save / future-version surface as modal. |
