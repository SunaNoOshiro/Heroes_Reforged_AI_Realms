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
- Save loaded with `saveVersion` outside the migration support window (last 4) renders the canonical "incompatible save migration needed" missing-state; the player is told to keep the file. Load is disabled, Delete remains enabled.
- A `QuotaExceededError` from the IDB wrapper does not retry; the "Manage saves" CTA is the remediation surface and the failure toast cites it.
- The Save tab follows the `canSaveNow(state)` predicate from [`content-schema/save-eligibility.md`](../../../../../content-schema/save-eligibility.md). Disabled reasons surface as localized strings: "Finish battle to save" (`save.disabled.in_battle`), "Wait for your turn to save" (`save.disabled.not_your_turn`), "Resolve the open prompt to save" (`save.disabled.modal_open`), "Wait for end-of-day to finish" (`save.disabled.animating`).
- Storage budget warning toasts ("Storage nearly full — consider exporting saves." at 90% quota, once per session) and quota-exhaustion toast ("Storage full — manage saves.") are emitted from the persistence layer per [`docs/architecture/storage-policy.md`](../../../storage-policy.md). The Save Load screen is the canonical surface for both.

### During Multiplayer
- **Saving during MP is host-only.** The host's save captures the full agreed log. Peers may not save mid-match: the Save tab is read-only on peer machines and displays a localized "host saved" indicator after each host autosave / manual save.
- **Loading into MP** is host-driven: the host loads the save locally, then the lobby flow re-establishes lockstep from the saved log. Peers do not load files; they receive the full log over the signaling channel as part of join.
- Mid-match save records embed `mp.{ matchId, participants, hostPlayerId }` (see [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../../../tasks/mvp/08-persistence/02-log-only-save-format.md)) so a re-loaded match can recognize itself. Runtime consumption of this block lives in the M5 multiplayer module — cross-reference [`docs/implementation-plans/07-multiplayer-plan.md`](../../../../implementation-plans/07-multiplayer-plan.md).
- Peers do **not** autosave during a remote match (see [`tasks/mvp/08-persistence/06-autosave.md`](../../../../../tasks/mvp/08-persistence/06-autosave.md)). This avoids divergent libraries and keeps save/replay artifacts attributable to the host.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
