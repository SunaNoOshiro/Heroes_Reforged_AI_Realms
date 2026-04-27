# Screen 15: Underground Layer Toggle
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure map layer switcher for surface and underground views, including gate focus and known subterranean entrance state.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Switch surface | `layer.surface` | command | `07-adventure-map` | `SET_ADVENTURE_LAYER` | Sets active layer to surface and refreshes camera. | Screen wipes vertically between layers, minimap palette swaps, known gates pulse, and unavailable layer buttons clank with disabled feedback. |
| Switch underground | `layer.underground` | command | `07-adventure-map` | `SET_ADVENTURE_LAYER` | Sets active layer to underground if scenario supports it. | Screen wipes vertically between layers, minimap palette swaps, known gates pulse, and unavailable layer buttons clank with disabled feedback. |
| Focus gate | `layer.focusGate` | navigation | `07-adventure-map` | `FOCUS_SUBTERRANEAN_GATE` | Centers camera on selected known gate. | Screen wipes vertically between layers, minimap palette swaps, known gates pulse, and unavailable layer buttons clank with disabled feedback. |
| Close | `layer.close` | navigation | `07-adventure-map` | `CLOSE_LAYER_TOGGLE` | Keeps current layer unchanged. | Screen wipes vertically between layers, minimap palette swaps, known gates pulse, and unavailable layer buttons clank with disabled feedback. |

### State Changes
- `state.adventure.activeLayer` refreshes `activeLayer` after the owning reducer or local UI draft changes.
- `state.scenario.layers.underground.enabled` refreshes `hasUnderground` after the owning reducer or local UI draft changes.
- `selectors.adventure.knownSubterraneanGates` refreshes `knownGates` after the owning reducer or local UI draft changes.
- `state.ui.layerToggle.selectedGateId` refreshes `selectedGate` after the owning reducer or local UI draft changes.
- `state.adventure.camera` refreshes `cameraFocus` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Switch surface can route to `07-adventure-map` after guard approval and exit animation.
- Switch underground can route to `07-adventure-map` after guard approval and exit animation.
- Focus gate can route to `07-adventure-map` after guard approval and exit animation.
- Close can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
