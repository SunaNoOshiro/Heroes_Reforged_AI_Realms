# Screen 70: Save Import
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Quarantined save-import flow. Source disclosure → schema validate →
quarantine staging → pack disclosure → trust review → compatibility
seal → overwrite + retention.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open import surface | `saveImport.open` | navigation | Current screen | `OPEN_SAVE_IMPORT` | Mounts the staged-save in-memory area. | Source panel slides in, focus moves to file picker. |
| Begin import | `saveImport.begin` | command | Current screen | `BEGIN_SAVE_IMPORT` | Reads source, runs size/ratio caps, schema-validate, quarantines on success. | Validation seal stamps green/amber/red/black per outcome. |
| Review pack trust | `saveImport.review` | navigation | `72-pack-trust-prompt` | `OPEN_PACK_TRUST_PROMPT` | Routes to per-pack consent. | Modal stack pushes screen 72. |
| Confirm import | `saveImport.confirm` | command | `60-confirmation-dialog` | `CONFIRM_SAVE_IMPORT` | Promotes staged save into the target slot; previous slot moves to overwrite ring. | Confirmation modal mounts, accepted action plays save-write transition. |
| Cancel import | `saveImport.cancel` | local-ui | `55-save-load` | `CANCEL_SAVE_IMPORT` | Drops the staged save and clears the in-memory quarantine. | Source panel fades out. |
| Restore overwritten | `saveImport.restoreOverwritten` | command | Current screen | `RESTORE_OVERWRITTEN_SAVE` | Restores from `selectors.persistence.recycle.savedSlots`. | Slot row pulses, restored thumbnail resolves. |

### State Changes
- `state.ui.saveImport.source` refreshes after the source-tab
  selection or paste/drop event.
- `selectors.persistence.import.staging` populates only after
  schema validate succeeds (state machine reaches `schema_ok`).
- `selectors.persistence.selectedSaveCompatibility` returns to
  `ok | skew | tamper | unsupported` per
  [`pack-trust.md` § Save Version Bounds](../../../pack-trust.md#3-save-version-bounds).
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Navigation Outcomes
- Review pack trust can route to `72-pack-trust-prompt` after the
  staged save is in the `schema_ok` state.
- Confirm import routes to `60-confirmation-dialog` for the
  overwrite decision and back to `55-save-load` on success.
- Cancel routes to `55-save-load` after clearing the staging area.

### Disabled And Error Cases
- File over 4 MiB → reject before decompression with
  `ui.save-import.reject.too-large`.
- Decompression ratio over 1:200 → reject with
  `ui.save-import.reject.bomb`.
- `saveVersion > runtimeMaxSaveVersion` → terminal,
  `ui.save-import.reject.too-new`. No click-through.
- `saveVersion < runtimeMinSaveVersion` AND no migration →
  terminal, `ui.save-import.reject.no-migration`.
- `compatibility.status = "tamper"` → terminal,
  `ui.save-import.error.tamper`. No `Continue anyway` button.
- `state.session.safeMode === true` AND staged save references
  non-canonical packs → reject with
  `ui.save-import.reject.safe-mode-blocks-pack`.
- Confirm is disabled while any referenced pack is `missing` and
  has not been granted consent.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.
- All caps and thresholds are pinned in
  [`pack-trust.md`](../../../pack-trust.md). Do not invent
  per-screen thresholds.

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Begin import (`BEGIN_SAVE_IMPORT`) | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; size, ratio, schema, and tamper failures all surface as modal terminals. |
| Confirm import (`CONFIRM_SAVE_IMPORT`) | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Quota exhaustion at slot promote surfaces as a modal. |
