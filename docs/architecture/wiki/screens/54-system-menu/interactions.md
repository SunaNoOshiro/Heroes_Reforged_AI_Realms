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
| Manage packs… | `system.managePacks` | navigation | `71-pack-manager` | `OPEN_PACK_MANAGER` | Routes to the pack manager. | Tablet darkens, manager fades in. |
| Safe mode (disable all packs) | `system.safeMode` | navigation | `60-confirmation-dialog` | `ENTER_SAFE_MODE` | Routes through confirmation per [`pack-trust.md` § Safe Mode](../../../pack-trust.md#5-safe-mode). | Confirmation modal mounts; safe-mode banner appears on accept. |
| Forget me on this device | `system.forgetMe` | navigation | `60-confirmation-dialog` | `WIPE_LOCAL_DATA` (with `scope: "all", confirmed: false`) | Routes through confirmation per [`data-inventory.md`](../../../data-inventory.md) § Wipe-Scope Policy. The handler iterates the inventory rows on accept; the page reloads to drop in-memory state. | Confirmation modal mounts; on accept, "Wiped" banner appears, then full reload. |

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
- Manage packs can route to `71-pack-manager` after guard approval and exit animation.
- Safe mode can route to `60-confirmation-dialog` after guard approval and exit animation.
- Forget me can route to `60-confirmation-dialog` after guard approval; on accept, dispatches `WIPE_LOCAL_DATA scope=all confirmed=true` and reloads.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- **Save / load debounce.** All command-emitting buttons and hotkeys here are debounced 250 ms (trailing edge); dispatcher single-flight is the safety net. See [`docs/architecture/command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).
- **Save eligibility.** The Save Game item is disabled per the `canSaveNow(state)` predicate enumerated in [`content-schema/save-eligibility.md`](../../../../../content-schema/save-eligibility.md). Reasons surface as localized strings: `save.disabled.in_battle`, `save.disabled.not_your_turn`, `save.disabled.modal_open`, `save.disabled.animating`.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
