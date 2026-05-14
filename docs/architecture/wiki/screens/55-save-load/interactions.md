# Screen 55: Save / Load
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

Owning task:
[`mvp.08-persistence.03-save-load-ui`](../../../../../tasks/mvp/08-persistence/03-save-load-ui.md).

### Purpose
Slot browser for user saves and the three rotating autosave slots
(`auto-1`, `auto-2`, `auto-3`). Surfaces save metadata, compatibility
checks, overwrite/delete confirmation with a non-modal undo toast,
the rolling overwrite-ring restore, and the quarantined save-import
route.

### Screen-Level Animation Contract
- Slot rows slide; selected thumbnail resolves; compatibility seal
  stamps; overwrite / delete actions route through confirmation.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback per `spec.md` § Animation
  Contract.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Per-Row Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select slot | `saveLoad.selectSlot` | local-ui | Current screen | `SELECT_SAVE_SLOT` | Updates preview and compatibility. | Selected row highlights; thumbnail resolves; compatibility seal stamps. |
| Save | `saveLoad.save` | command | Current screen | `SAVE_GAME_SLOT` (empty slot) or `OVERWRITE_SAVE_SLOT` (existing slot, after overwrite-guard confirmation) | Writes save manifest and payload. Overwrite clones the prior payload into the rolling overwrite ring before the new payload writes. Both populate `state.ui.lastDestructive` only on the overwrite branch per [`undo-policy.md`](../../../undo-policy.md). | Confirm fade; button feedback; failure toast on `STORAGE_*`. |
| Load | `saveLoad.load` | navigation | `59-loading-screen` | `LOAD_GAME_SLOT` | Validates and loads selected save. | Compatibility seal stamps before route; exit animation feeds the loading screen. |
| Delete | `saveLoad.delete` | navigation | `60-confirmation-dialog` | `REQUEST_DELETE_SAVE_SLOT` → on confirm `DELETE_SAVE_SLOT` (soft-delete) | Routes through `60-confirmation-dialog` with `severity: 'critical'`. On confirm, `DELETE_SAVE_SLOT` marks the slot `softDeleted: true` with a 5 s tombstone TTL per [`undo-policy.md`](../../../undo-policy.md); a non-modal undo toast surfaces while `state.ui.lastDestructive` is non-null. After TTL, `EXPIRE_LAST_DESTRUCTIVE` performs the file-system delete. | Row fades to tombstone; undo toast slides in. |
| Undo destructive | `saveLoad.undo` | command | Current screen | `UNDO_LAST_DESTRUCTIVE` | Clears the tombstone fields or restores the overwrite-ring entry per [`undo-policy.md`](../../../undo-policy.md); only available while the toast is mounted (`state.ui.lastDestructive != null && now() < expiresAt`). | Slot row pulses; toast fades out. |
| Back | `saveLoad.back` | navigation | `54-system-menu` or `01-main-menu` | `CLOSE_SAVE_LOAD` | Returns to caller. | Exit animation; selection cleared. |
| Import… | `saveLoad.import` | navigation | `70-save-import` | `OPEN_SAVE_IMPORT` | Opens the quarantined save-import flow per [`pack-trust.md`](../../../pack-trust.md). | Import button highlight; exit animation routes to screen 70. |
| Restore overwritten | `saveLoad.restoreOverwritten` | command | Current screen | `RESTORE_OVERWRITTEN_SAVE` | Restores from `selectors.persistence.recycle.savedSlots`. | Slot row pulses; restored thumbnail resolves. |

### State Changes
- `mode` refreshes from `state.ui.saveLoad.mode` after the owning
  reducer or local UI draft changes.
- `slots` refreshes from `selectors.persistence.saveSlotManifests`.
- `selectedSlot` refreshes from `state.ui.saveLoad.selectedSlotId`.
- `compatibility` refreshes from
  `selectors.persistence.selectedSaveCompatibility`.
- `overwriteGuard` refreshes from
  `selectors.persistence.overwriteGuard`.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Soft-Delete Toast
While `state.ui.lastDestructive != null && now() < state.ui.lastDestructive.expiresAt`,
the screen mounts a non-modal undo toast at the bottom of the slot
list per [`undo-policy.md`](../../../undo-policy.md). The toast
renders the localized `toastMessageKey` and an `Undo` button that
dispatches `UNDO_LAST_DESTRUCTIVE`. The TTL is authoritative; toast
dismissal is gestural only.

### Navigation Outcomes
- Load → `59-loading-screen` after guard approval and exit animation.
- Delete → `60-confirmation-dialog` for `severity: 'critical'`
  confirmation; on confirm stays on this screen and surfaces the
  undo toast.
- Import → `70-save-import`.
- Back → `54-system-menu` or `01-main-menu` after guard approval and
  exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure feedback.
- All error toast text is produced by `formatUserError(err, locale)`
  declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct toast text inline.
- A save loaded with `saveVersion` outside the migration support
  window (last 4) renders the canonical "incompatible save migration
  needed" missing-state; the player is told to keep the file. Load
  is disabled; Delete remains enabled.
- A `QuotaExceededError` from the IDB wrapper does not retry; the
  "Manage saves" CTA is the remediation surface and the failure
  toast cites it.
- The Save tab follows the `canSaveNow(state)` predicate from
  [`content-schema/save-eligibility.md`](../../../../../content-schema/save-eligibility.md).
  Disabled reasons surface as localized strings: "Finish battle to
  save" (`save.disabled.in_battle`), "Wait for your turn to save"
  (`save.disabled.not_your_turn`), "Resolve the open prompt to
  save" (`save.disabled.modal_open`), "Wait for end-of-day to
  finish" (`save.disabled.animating`).
- Storage budget warning toasts ("Storage nearly full — consider
  exporting saves." at 90 % quota, once per session) and the
  quota-exhaustion toast ("Storage full — manage saves.") are
  emitted from the persistence layer per
  [`docs/architecture/storage-policy.md`](../../../storage-policy.md).
  This screen is the canonical surface for both.

### During Multiplayer
- **Saving** is host-only. The host's save captures the full agreed
  log. Peers may not save mid-match: the Save tab is read-only on
  peer machines and displays a localized "host saved" indicator
  after each host autosave or manual save.
- **Loading into MP** is host-driven: the host loads the save
  locally, then the lobby flow re-establishes lockstep from the
  saved log. Peers do not load files; they receive the full log over
  the signaling channel as part of join.
- Mid-match save records embed `mp.{ matchId, participants, hostPlayerId }`
  (see [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../../../tasks/mvp/08-persistence/02-log-only-save-format.md))
  so a re-loaded match can recognize itself. Runtime consumption of
  this block lives in the M5 multiplayer module.
- Peers do **not** autosave during a remote match (see
  [`tasks/mvp/08-persistence/06-autosave.md`](../../../../../tasks/mvp/08-persistence/06-autosave.md)).
  This avoids divergent libraries and keeps save / replay artifacts
  attributable to the host.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions and must not
  invent new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each `Type: command` action to its default surface for this screen's
dominant error domain. A row whose Notes column reads `override`
replaces the § 2 default; otherwise the default applies. Specific
error codes (e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) land
alongside the engine reducer that owns each command and trigger the
gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Save (`SAVE_GAME_SLOT` / `OVERWRITE_SAVE_SLOT`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 `STORAGE_*`; quota / corrupt-save / future-version surface as modal. |
| Restore overwritten (`RESTORE_OVERWRITTEN_SAVE`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Default per `STORAGE_*`; ring entry expired or missing → modal. |
| Undo destructive (`UNDO_LAST_DESTRUCTIVE`) | `DISPATCHER_TOMBSTONE_EXPIRED` | toast | `error.dispatcher.tombstone-expired.body` | override — TTL elapsed before press; the destructive action is no longer reversible and the player did not initiate this rejection, so toast (not inline) per `error-ux.md` § 1. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, command tokens, and navigation targets match [`spec.md`](./spec.md), [`data-contracts.md`](./data-contracts.md), and `mockup.html` visible regions. Animation contract pulled up to a single line above the table (previously duplicated per row).
- **Schema: ⚠** — `SAVE_GAME_SLOT`, `LOAD_GAME_SLOT`, `SELECT_SAVE_SLOT`, `REQUEST_DELETE_SAVE_SLOT`, `CLOSE_SAVE_LOAD`, `OVERWRITE_SAVE_SLOT` are dispatched here but absent from [`command-schema.md`](../../../command-schema.md) and from [`screen-command-coverage.json`](../../../screen-command-coverage.json). The destructive-flow subset is already tracked in [`undo-policy.md` § Issues](../../../undo-policy.md). See `## ⚠ Issues`.
- **Tasks: ✔** — Owning task [`mvp.08-persistence.03-save-load-ui`](../../../../../tasks/mvp/08-persistence/03-save-load-ui.md) reads this file first; multiplayer host-only save rule is consistent with [`tasks/mvp/08-persistence/06-autosave.md`](../../../../../tasks/mvp/08-persistence/06-autosave.md) and [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../../../tasks/mvp/08-persistence/02-log-only-save-format.md).

## ⚠ Issues

- **Six screen-dispatched commands are not canonically registered.** Per CLAUDE.md and [`command-schema.md`](../../../command-schema.md), every command dispatched by a UI surface must appear either in `command-schema.md` (engine reducer tokens) or `screen-command-coverage.json` (runtime / persistence-side tokens). `SAVE_GAME_SLOT`, `LOAD_GAME_SLOT`, `SELECT_SAVE_SLOT`, `REQUEST_DELETE_SAVE_SLOT`, `CLOSE_SAVE_LOAD`, `OVERWRITE_SAVE_SLOT` are referenced here and in [`data-contracts.md`](./data-contracts.md) but registered in neither. Suggested owner: `mvp.08-persistence.03-save-load-ui` for the user-flow tokens; `mvp.08-persistence.27-undo-soft-delete` for `OVERWRITE_SAVE_SLOT` (matches its undo-policy semantics). Flagged not rewritten because the fix lives in cross-checked files (Hard Prohibition D).
- **Error surfaces table previously listed only `SAVE_GAME_SLOT`.** Added `RESTORE_OVERWRITTEN_SAVE` and `UNDO_LAST_DESTRUCTIVE` rows per [`error-ux.md` § 2](../../../error-ux.md) ("the block must list every fallible action the screen can dispatch"). The `UNDO_LAST_DESTRUCTIVE` row is an explicit `override` because a tombstone-expired rejection is not actionable by the player and must be a toast, not an inline disabled control. Engine reducer must define the `DISPATCHER_TOMBSTONE_EXPIRED` code or these rows will fail [`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs); owner: `mvp.08-persistence.27-undo-soft-delete`.
