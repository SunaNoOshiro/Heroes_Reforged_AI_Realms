# Screen 71: Pack Manager
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Enumerate installed packs, audit trust decisions, install new packs,
revoke trust, or remove packs.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open pack manager | `packManager.open` | navigation | Current screen | `OPEN_PACK_MANAGER` | Mounts the manager and resolves selectors. | List rows fade in; modded indicator mirror updates. |
| Install pack | `packManager.install` | command | `72-pack-trust-prompt` | `INSTALL_PACK_FROM_FILE` | Opens file picker → traversal sanitizer → screen 72. | Install button highlight fades on success. |
| Trust selected | `packManager.trust` | command | `72-pack-trust-prompt` | `GRANT_PACK_TRUST` | Writes `decision = "trust"` to the trust store. | Trust badge transitions to green. |
| Run sandboxed | `packManager.sandboxed` | command | Current screen | `RUN_PACK_SANDBOXED` | Writes `decision = "sandboxed"`. | Sandboxed badge transitions to amber. |
| Revoke trust | `packManager.revoke` | command | `60-confirmation-dialog` | `REVOKE_PACK_TRUST` | Drops trust-store entry; routes through confirmation. | Confirmation modal mounts, accepted action plays revoke transition. |
| Remove pack | `packManager.remove` | command | `60-confirmation-dialog` | `REMOVE_PACK` | Uninstalls the pack, drops trust-store entries. | Confirmation modal mounts; row removes on success. |
| Close manager | `packManager.close` | local-ui | `54-system-menu` | `CLOSE_PACK_MANAGER` | Returns to caller. | Manager fades out. |
| Filter rows | `packManager.filter` | local-ui | Current screen | `SET_PACK_MANAGER_FILTER` | Updates `state.ui.packManager.filter`. | Filter chips highlight selection. |

### State Changes
- `selectors.packs.installed` updates after successful
  `INSTALL_PACK_FROM_FILE` or `REMOVE_PACK`.
- `selectors.packs.trustStore` updates after every
  `GRANT_PACK_TRUST` / `RUN_PACK_SANDBOXED` / `DENY_PACK_TRUST` /
  `REVOKE_PACK_TRUST`.
- `selectors.session.moddedIndicator` recomputes after any
  trust-decision write.
- UI-only hover, focus, selected row, drag ghost, and animation
  frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Install pack can route to `72-pack-trust-prompt` after the
  traversal sanitizer accepts the file.
- Trust selected can route to `72-pack-trust-prompt` for review
  before granting.
- Revoke trust and remove pack can route to
  `60-confirmation-dialog` after guard approval.
- Close manager can route to `54-system-menu` after exit
  animation.

### Disabled And Error Cases
- Pack on the revocation list with `reason in [malware, tampered]`
  → row marked terminal; only `REMOVE_PACK` is enabled.
- `INSTALL_PACK_FROM_FILE` rejects on size, ratio, entry-count, or
  path-traversal failures per
  [`pack-trust.md` § Resource Limits](../../../pack-trust.md#1-resource-limits).
- Safe mode (`state.session.safeMode === true`) disables every
  action other than `REMOVE_PACK` and `CLOSE_PACK_MANAGER` until
  the user exits safe mode.
- Missing presentation assets may use resolver fallback. Missing
  manifest fields fail loudly.


### Error Formatter

- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Install pack (`INSTALL_PACK_FROM_FILE`) | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; size/ratio/traversal failures all surface as modal. |
| Remove pack (`REMOVE_PACK`) | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Failure to write trust-store changes surfaces as modal. |
