# Screen 71: Pack Manager
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Enumerate installed packs, audit trust decisions, install new
packs, downgrade to sandboxed, revoke trust, or remove packs.
Upgrade-to-trust review happens on screen 72; destructive paths
(revoke / remove) route through `60-confirmation-dialog`.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open pack manager | `packManager.open` | navigation | Current screen | `OPEN_PACK_MANAGER` | Mounts the manager and resolves selectors. | List rows fade in; modded-indicator mirror updates. |
| Install pack | `packManager.install` | command | `72-pack-trust-prompt` | `INSTALL_PACK_FROM_FILE` | File picker → traversal sanitizer per [`pack-trust.md` § 1](../../../pack-trust.md#1-resource-limits) → screen 72 for trust review. | Install button highlight fades on success. |
| Trust selected | `packManager.trust` | command | `72-pack-trust-prompt` | `OPEN_PACK_TRUST_PROMPT` (`GRANT_PACK_TRUST` is dispatched on screen 72) | Routes the selected pack into screen 72; the trust-store write happens there. | Trust badge transitions to green after screen 72 confirms. |
| Run sandboxed | `packManager.sandboxed` | command | Current screen | `RUN_PACK_SANDBOXED` | Writes `decision = "sandboxed"` for the selected pack (downgrade — no re-prompt). | Sandboxed badge transitions to amber. |
| Revoke trust | `packManager.revoke` | command | `60-confirmation-dialog` | `REQUEST_CONFIRMATION` → `REVOKE_PACK_TRUST` | Drops the trust-store entry for `(packId, contentHash)`. Routes through `60-confirmation-dialog`; payload `{ packId, contentHash }`. Severity inherits the caller's choice (default `warning`). | Confirmation modal mounts; on accept, revoke transition plays. |
| Remove pack | `packManager.remove` | command | `60-confirmation-dialog` | `REQUEST_CONFIRMATION` → `REMOVE_PACK` | Uninstalls the pack and drops every trust-store entry under that `packId`. Routes through `60-confirmation-dialog` with `severity: 'critical'`, `confirmDelayMs: 1500` (default), and `requireType: 'UNINSTALL'`. Payload `{ packId, contentHash }`. | Confirmation modal mounts; row removes on success. |
| Close manager | `packManager.close` | local-ui | `54-system-menu` | `CLOSE_PACK_MANAGER` | Returns to the caller stored on mount. | Manager fades out. |
| Filter rows | `packManager.filter` | local-ui | Current screen | `SET_PACK_MANAGER_FILTER` | Updates `state.ui.packManager.filter`. | Filter chips highlight selection. |

### State Changes
- `selectors.packs.installed` updates after a successful
  `INSTALL_PACK_FROM_FILE` or `REMOVE_PACK`.
- `selectors.packs.trustStore` updates after every
  `GRANT_PACK_TRUST` / `RUN_PACK_SANDBOXED` / `DENY_PACK_TRUST` /
  `REVOKE_PACK_TRUST` (GRANT/DENY originate on screen 72).
- `selectors.session.moddedIndicator` recomputes after any
  trust-decision write per
  [`pack-trust.md` § 6](../../../pack-trust.md#6-modded-indicator).
- UI-only hover, focus, selected-row, drag ghost, and animation
  frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Install / Trust → `72-pack-trust-prompt` (after the traversal
  sanitizer for Install).
- Revoke / Remove → `60-confirmation-dialog` (guard); on accept,
  the underlying command dispatches and the user returns here.
- Sandboxed / Filter → stay on the current screen.
- Close → returns to the caller (typically `54-system-menu`)
  after the exit animation.

### Disabled And Error Cases
- Pack on the revocation list with `reason ∈ {malware, tampered}`
  → row marked terminal; only `REMOVE_PACK` is enabled per
  [`pack-trust.md` § 4](../../../pack-trust.md#4-trust-anchors).
- `INSTALL_PACK_FROM_FILE` rejects on size, ratio, entry-count,
  or path-traversal failures per
  [`pack-trust.md` § 1](../../../pack-trust.md#1-resource-limits).
- Safe mode (`state.session.safeMode === true`) disables every
  action other than `REMOVE_PACK` and `CLOSE_PACK_MANAGER` until
  the user exits safe mode per
  [`pack-trust.md` § 5](../../../pack-trust.md#5-safe-mode).
- Missing presentation assets fall back through the resolver.
  Missing manifest fields fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).

### Error Formatter
- Errors are produced by `formatUserError(err, locale)` declared
  in [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Install pack (`INSTALL_PACK_FROM_FILE`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Default per [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping) `STORAGE_*`; size / ratio / traversal failures all surface as modal. |
| Remove pack (`REMOVE_PACK`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Trust-store / pack-registry write failure surfaces as modal. |
| Revoke trust (`REVOKE_PACK_TRUST`) | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Trust-store write failure surfaces as modal. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs match `data-action` attributes in
  `mockup.html` (`packManager.install`, `packManager.trust`,
  `packManager.sandboxed`, `packManager.revoke`, `packManager.remove`,
  `packManager.close`). Filter chips correspond to the
  `FILTERS: …` row in the mockup. Sibling
  [`spec.md`](./spec.md) component tree aligns; sibling
  [`architecture.md`](./architecture.md) transition flow aligns
  on the confirmation step for revoke / remove.
- **Schema: ✔** — Every command referenced is defined in
  [`command-schema.md` § Save-Import & Pack-Trust Commands](../../../command-schema.md#save-import--pack-trust-commands)
  (`OPEN_PACK_MANAGER`, `INSTALL_PACK_FROM_FILE`,
  `OPEN_PACK_TRUST_PROMPT`, `GRANT_PACK_TRUST`,
  `RUN_PACK_SANDBOXED`, `DENY_PACK_TRUST`, `REVOKE_PACK_TRUST`,
  `REMOVE_PACK`) and [`command-schema.md` § Consent, Onboarding &
  Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands)
  (`REQUEST_CONFIRMATION`); `CLOSE_PACK_MANAGER` and
  `SET_PACK_MANAGER_FILTER` are local-ui per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  The `REQUEST_CONFIRMATION` payload (`severity`, `confirmDelayMs`,
  `requireType`) matches
  [`60-confirmation-dialog/spec.md` § Click-Through Resistance](../60-confirmation-dialog/spec.md#click-through-resistance).
- **Tasks: ✔** — Owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  lists this file under Read First; the trust store is registered
  in [`data-inventory.md`](../../../data-inventory.md) (row
  `trust store` → `hr-trust.decisions`).

## ⚠ Issues

- **Reconciled internal contradiction on the Trust-selected row.**
  The prior table cell listed `GRANT_PACK_TRUST` as the command
  dispatched by `packManager.trust` while also routing to
  `72-pack-trust-prompt`; those two claims contradict (the write
  belongs to screen 72, not screen 71). Per
  [`command-schema.md` § Save-Import & Pack-Trust Commands](../../../command-schema.md#save-import--pack-trust-commands),
  `OPEN_PACK_TRUST_PROMPT` is the local-ui token that opens
  screen 72, and sibling
  [`72-pack-trust-prompt/interactions.md`](../72-pack-trust-prompt/interactions.md)
  is where `GRANT_PACK_TRUST` actually fires. Rewrote the cell as
  `OPEN_PACK_TRUST_PROMPT` (`GRANT_PACK_TRUST` is dispatched on
  screen 72), the interpretation consistent with the cross-checked
  command-schema and sibling-screen file. Hard Prohibition A
  requires this be surfaced rather than silently rewritten.
