# Screen 70: Save Import
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Quarantined save-import flow. Source disclosure → schema validate
(size / ratio / wall-time / schema) → quarantine staging → pack
disclosure → trust review → compatibility seal → overwrite +
retention.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open import surface | `saveImport.open` | navigation | Current screen | `OPEN_SAVE_IMPORT` | Mounts the staged-save in-memory area. | Source panel slides in; focus moves to file picker. |
| Begin import | `saveImport.begin` | command | Current screen | `BEGIN_SAVE_IMPORT` | Reads source; runs size / ratio / wall-time / schema-validate gates; quarantines on success. | Validation seal stamps green / amber / red / black per outcome. |
| Review pack trust | `saveImport.review` | navigation | `72-pack-trust-prompt` | `OPEN_PACK_TRUST_PROMPT` | Routes to per-pack consent. | Modal stack pushes screen 72. |
| Confirm import | `saveImport.confirm` | command | `60-confirmation-dialog` | `CONFIRM_SAVE_IMPORT` | Promotes staged save into the target slot; previous slot moves to overwrite ring. | Confirmation modal mounts (`ui.save-import.confirm.overwrite`); accepted action plays save-write transition. |
| Cancel import | `saveImport.cancel` | local-ui | `55-save-load` | `CANCEL_SAVE_IMPORT` | Drops the staged save and clears the in-memory quarantine. | Source panel fades out. |
| Restore overwritten | `saveImport.restoreOverwritten` | command | Current screen | `RESTORE_OVERWRITTEN_SAVE` | Restores from `selectors.persistence.recycle.savedSlots`. | Slot row pulses; restored thumbnail resolves. |

### State Changes
- `state.ui.saveImport.source` refreshes after each source-tab
  selection or paste / drop event.
- `selectors.persistence.import.staging` populates only after
  schema validate succeeds (state machine reaches `schema_ok`).
- `selectors.persistence.selectedSaveCompatibility` resolves to
  `ok | skew | tamper | unsupported` per
  [`pack-trust.md` § Save Version Bounds](../../../pack-trust.md#3-save-version-bounds).
- For `compatibility.status = "skew"`, the **"continue anyway
  (acknowledge skew)" checkbox** in the compatibility-seal panel
  must be checked before `saveImport.confirm` is enabled. The
  checkbox state is UI-local and not persisted.
- UI-only hover, focus, selected row, open tab, target cursor,
  drag ghost, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes
- `saveImport.review` routes to `72-pack-trust-prompt` after the
  staged save reaches `schema_ok`.
- `saveImport.confirm` routes to `60-confirmation-dialog` for the
  overwrite decision, then returns to `55-save-load` on success.
- `saveImport.cancel` returns to `55-save-load` after clearing the
  staging area.

### Disabled And Error Cases
- File over **4 MiB** → reject before decompression with
  `ui.save-import.reject.too-large`.
- Decompression ratio over **1 : 200** → reject with
  `ui.save-import.reject.bomb`.
- Streaming wall time over **5 s** on a 4 MiB save → reject with
  `ui.save-import.reject.timeout` per
  [`pack-trust.md` § 1](../../../pack-trust.md#1-resource-limits).
- `saveVersion > runtimeMaxSaveVersion` → terminal
  `ui.save-import.reject.too-new`. No click-through.
- `saveVersion < runtimeMinSaveVersion` AND no migration chain →
  terminal `ui.save-import.reject.no-migration`.
- `compatibility.status = "tamper"` → terminal
  `ui.save-import.error.tamper`. There is **no** `Continue anyway`
  control for the tamper case (skew has a checkbox; tamper does
  not).
- `state.session.safeMode === true` AND staged save references
  non-canonical packs → reject with
  `ui.save-import.reject.safe-mode-blocks-pack`.
- `Confirm import` is disabled while any referenced pack is
  `missing` and has not been granted consent in screen 72, or
  while a `skew` compatibility seal is unacknowledged.

### Error Formatter
- Error toast text is produced by `formatUserError(err, locale)`
  declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than introduce new behavior.
- All caps and thresholds are pinned in
  [`pack-trust.md`](../../../pack-trust.md). Do not invent
  per-screen thresholds.

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Begin import (`BEGIN_SAVE_IMPORT`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Default per [`error-ux.md` § 2 STORAGE_*](../../../error-ux.md). Size, ratio, wall-time, schema, and tamper failures all surface as modal terminals. |
| Confirm import (`CONFIRM_SAVE_IMPORT`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Quota exhaustion at slot promote surfaces as a modal. |

---

## 🔍 Sync Check

- **UI: ✔** — Every Action-table row matches a panel or button in
  [`mockup.html`](./mockup.html); state bindings match sibling
  [`spec.md`](./spec.md) and [`data-contracts.md`](./data-contracts.md);
  pipeline branches match
  [`architecture.md`](./architecture.md). The skew-acknowledge
  checkbox documented here is the one rendered in
  [`mockup.html`](./mockup.html) as
  `[ ] continue anyway (acknowledge skew)`.
- **Schema: ✔** — Six action IDs map to the six commands in
  [`command-schema.md` § Save-Import & Pack-Trust](../../../command-schema.md#save-import--pack-trust-commands);
  reject keys, seal keys, and the compatibility-union arms match
  [`pack-trust.md` § 10](../../../pack-trust.md#10-error-codes) and
  [`pack-trust.md` § 3](../../../pack-trust.md#3-save-version-bounds).
- **Tasks: ⚠** — Owning task
  [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  references this file in Read First and lists the size, ratio,
  schema, tamper, safe-mode, and overwrite-ring behaviors as
  acceptance criteria. The overwrite-ring slice is not registered
  in [`data-inventory.md`](../../../data-inventory.md); see sibling
  [`spec.md` § ⚠ Issues](./spec.md) — aligned.

## ⚠ Issues

- **Overwrite ring not registered in `data-inventory.md`.** See
  sibling [`spec.md`](./spec.md) for the full description and
  suggested row. Same gap flagged in
  [`pack-trust.md` § ⚠ Issues](../../../pack-trust.md). Owning
  task:
  [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md).
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
- **Owning task acceptance criteria does not list the 5-second
  wall-time reject.** [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  enumerates `too-large`, `bomb`, `too-new`, `no-migration`,
  `tamper`, and `safe-mode-blocks-pack` but omits the
  `ui.save-import.reject.timeout` case that
  [`pack-trust.md` § 1](../../../pack-trust.md#1-resource-limits)
  defines and that this screen surfaces. Owning task should add
  the criterion: "Streaming wall time > 5 s on a 4 MiB save aborts
  with `ui.save-import.reject.timeout`." Skill did not edit the
  task file (Hard Prohibition D).
