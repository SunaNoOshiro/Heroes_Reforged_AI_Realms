# Screen 65: Map Editor
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Map editor shell with terrain/object palettes, brush tools, layers,
scenario properties, validation, and save/export controls.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation Cue |
| --- | --- | --- | --- | --- | --- | --- |
| Select tool | `editor.selectTool` | local-ui | Current screen | `SELECT_EDITOR_TOOL` | Changes active editing tool. | Slot pulses; cursor swaps to brush ghost. |
| Paint tile | `editor.paintTile` | command | Current screen | `APPLY_EDITOR_BRUSH` | Mutates editor draft document. | Brush preview follows cursor; invalid cells crosshatch red. |
| Place object | `editor.placeObject` | command | Current screen | `PLACE_EDITOR_OBJECT` | Adds object record with stable ID. | Object stamp bounces on commit. |
| Validate | `editor.validate` | local-ui | Current screen | `VALIDATE_EDITOR_DOCUMENT` | Refreshes validation drawer. | Validation drawer slides up. |
| Save | `editor.save` | command | Current screen | `SAVE_EDITOR_SCENARIO` | Writes scenario draft after validation guard. | Saved-status seal glows. |
| Publish… | `editor.publish` | navigation | `73-ugc-publish-disclaimer` | `OPEN_PUBLISH_DISCLAIMER` | Routes through screen 73 for the per-pack content-policy ack; on accept, dispatches `EXPORT_SCENARIO_AS_PACK` to write a local `.hrmod` (no network upload at v1). | Modal drops in over dimmed editor. |

Animation cues honor `config.ui.reducedMotion`: reduced-motion mode
replaces motion with static highlights per `spec.md` § Animation
Contract.

### State Changes
- `state.editor.currentDocument` refreshes `editorDocument` after
  the owning reducer or local UI draft changes.
- `state.editor.selectedTool` refreshes `selectedTool` after the
  owning reducer or local UI draft changes.
- `state.editor.selectedLayer` refreshes `selectedLayer` after the
  owning reducer or local UI draft changes.
- `state.editor.selection` refreshes `selection` after the owning
  reducer or local UI draft changes.
- `selectors.editor.validationIssues` refreshes `validationIssues`
  after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Navigation Outcomes
- Publish routes to `73-ugc-publish-disclaimer` after the editor's
  validation guard passes. On accept, the disclaimer screen
  dispatches `EXPORT_SCENARIO_AS_PACK` and the OS file-picker
  resolves the destination.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure
  feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they do not
  introduce hidden behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each `command`-type action to its default surface for this screen's
dominant error domain. A row whose Notes column reads `override`
replaces the § 2 default for that action; otherwise the default
applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Paint tile (`APPLY_EDITOR_BRUSH`) | `VALIDATION_REJECTED` | inline | `error.validation.rejected.body` | Default per `error-ux.md` § 2 VALIDATION_*; disabled control + tooltip on rejection. |
| Place object (`PLACE_EDITOR_OBJECT`) | `VALIDATION_REJECTED` | inline | `error.validation.rejected.body` | Default per `error-ux.md` § 2 VALIDATION_*; disabled control + tooltip on rejection. |
| Save (`SAVE_EDITOR_SCENARIO`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; quota / corrupt-save / future-version surface as modal. |

---

## 🔍 Sync Check

- **UI: ✔** — Action set matches the component tree in
  [`spec.md`](./spec.md) § Component Tree (each component has at
  least one row). Publish surface aligned with
  [`73-ugc-publish-disclaimer/interactions.md`](../73-ugc-publish-disclaimer/interactions.md)
  (Open → Accept → Export chain).
- **Schema: ⚠** — Screen-internal command tokens
  (`SELECT_EDITOR_TOOL`, `APPLY_EDITOR_BRUSH`, `PLACE_EDITOR_OBJECT`,
  `VALIDATE_EDITOR_DOCUMENT`, `SAVE_EDITOR_SCENARIO`) match the
  `localUiPrefixes` allowlist in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  but do not equal the canonical enum kinds that the owning task
  will introduce. See `## ⚠ Issues`.
- **Tasks: ✔** —
  [`phase-2.04-content-editor.08-map-editor-commands`](../../../../../tasks/phase-2/04-content-editor/08-map-editor-commands.md)
  owns the engine reducer side;
  [`phase-2.04-content-editor.10-publish-disclaimer-flow`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md)
  owns the Publish chain; both reference this file in `Read First`.
  Out-of-scope token `EXPORT_SCENARIO_AS_PACK` is correctly listed
  in `screen-command-coverage.json` § outOfScope.

## ⚠ Issues

- **Command-token alignment with engine task.** This file lists
  abstract token names (`APPLY_EDITOR_BRUSH`, `PLACE_EDITOR_OBJECT`,
  `SAVE_EDITOR_SCENARIO`, `VALIDATE_EDITOR_DOCUMENT`,
  `SELECT_EDITOR_TOOL`) while
  [`phase-2.04-content-editor.08-map-editor-commands`](../../../../../tasks/phase-2/04-content-editor/08-map-editor-commands.md)
  declares the canonical enum kinds as `EDITOR_SET_TILE`,
  `EDITOR_PLACE_HERO`, `EDITOR_PLACE_TOWN`, `EDITOR_PLACE_MINE`,
  `EDITOR_PLACE_MAP_OBJECT`, `EDITOR_REMOVE_OBJECT`,
  `EDITOR_TOGGLE_UNDERGROUND_LAYER`, `EDITOR_SET_VICTORY_CONDITION`,
  and `EDITOR_SET_DEFEAT_CONDITION`. Per
  [`command-schema.md`](../../../command-schema.md) § Contract
  ("Screen interaction tokens are checked by
  screen-command-coverage.json"), the owning task should either
  rename the screen tokens to the canonical kinds when it lands or
  register aliases in `commandAliases` of
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Skill did not edit either file (Hard Prohibition D).
- **Animation cues split per row.** The original assigned the same
  five-cue bundle to every action; this rewrite maps each action to
  its specific cue from that bundle. No new motion was introduced
  and `spec.md` § Animation Contract still lists the full bundle.
