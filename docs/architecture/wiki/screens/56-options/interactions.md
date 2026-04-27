# Screen 56: Options
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Options screen for audio, animation speed, combat settings, autosave, language, accessibility, and renderer scale.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change tab | `options.tab` | local-ui | Current screen | `SET_OPTIONS_TAB` | Changes visible category. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Adjust slider | `options.slider` | local-ui | Current screen | `SET_OPTIONS_DRAFT_VALUE` | Updates draft value. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Apply | `options.apply` | command | Current screen | `APPLY_OPTIONS` | Persists allowed settings. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |
| Cancel | `options.cancel` | navigation | Caller screen | `CANCEL_OPTIONS` | Discards draft. | Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values. |

### State Changes
- `state.ui.options.draft` refreshes `optionsDraft` after the owning reducer or local UI draft changes.
- `config.audio` refreshes `audioConfig` after the owning reducer or local UI draft changes.
- `config.ui` refreshes `uiConfig` after the owning reducer or local UI draft changes.
- `selectors.options.gameplayConfigLocks` refreshes `gameplayLocks` after the owning reducer or local UI draft changes.
- `selectors.options.hasUnsavedChanges` refreshes `dirty` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cancel can route to Caller screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
