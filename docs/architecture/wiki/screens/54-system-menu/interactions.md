# Screen 54: System Menu
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Modal overlay invoked over live gameplay. Routes to save, load,
options, pack manager, and privacy / erasure surfaces; gates
destructive actions through `60-confirmation-dialog`; resumes the
caller route on close. Gameplay state is paused for local UI only.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Save Game | `system.save` | navigation | `55-save-load` | `OPEN_SAVE_GAME` | Routes to save mode. | Backdrop dims, tablet drops in, hovered command glows, route buttons crossfade into the child dialog. |
| Load Game | `system.load` | navigation | `55-save-load` | `OPEN_LOAD_GAME` | Routes to load mode. | Same crossfade as Save. |
| Options | `system.options` | navigation | `56-options` | `OPEN_OPTIONS` | Routes to settings. | Same crossfade as Save. |
| Main Menu | `system.mainMenu` | navigation | `60-confirmation-dialog` | `REQUEST_RETURN_TO_MAIN_MENU` | Confirmation required; on accept, returns to `01-main-menu`. | Modal mounts; on accept, scene shutters out. |
| Resume | `system.resume` | navigation | Caller screen | `CLOSE_SYSTEM_MENU` | Returns to gameplay at `state.ui.systemMenu.callerRoute`. | Tablet fades out, backdrop lifts. |
| Manage packs… | `system.managePacks` | navigation | `71-pack-manager` | `OPEN_PACK_MANAGER` | Routes to the pack manager per [`pack-trust.md`](../../../pack-trust.md). | Tablet darkens, manager fades in. |
| Safe mode (disable all packs) | `system.safeMode` | navigation | `60-confirmation-dialog` | `ENTER_SAFE_MODE` | Routes through confirmation per [`pack-trust.md` § Safe Mode](../../../pack-trust.md#5-safe-mode); safe-mode banner appears on accept. | Confirmation modal mounts; banner unfurls on accept. |
| Forget me on this device | `system.forgetMe` | navigation | `60-confirmation-dialog` | `WIPE_LOCAL_DATA` (initial dispatch with `scope: "all", confirmed: false`) | Routes through confirmation per [`data-inventory.md` § Wipe-Scope Policy](../../../data-inventory.md#3-wipe-scope-policy). On accept, redispatch with `confirmed: true`; handler iterates inventory rows; page reloads to drop in-memory state. | Confirmation modal mounts; on accept, "Wiped" banner appears, then full reload. |
| Erasure receipt | `system.erasureReceipt` | command | _(modal)_ | `REQUEST_ERASURE_RECEIPT` | Emits an [`erasure-receipt.schema.json`](../../../../../content-schema/schemas/erasure-receipt.schema.json); appends an [`audit-log-entry.schema.json`](../../../../../content-schema/schemas/audit-log-entry.schema.json) row with `type: "ERASURE"`; renders in `ErasureReceiptModal` with **Copy to clipboard**. Manual server-side fallback documented in [`docs/legal/erasure-process.md`](../../../../legal/erasure-process.md). | Modal fade-in; clipboard glint on copy. |
| Privacy policy | `system.privacy` | local-ui | _(modal)_ | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). Mirrors the footer affordance on screen `01-main-menu`. | Modal fade-in. |
| Processor list | `system.processors` | local-ui | _(modal)_ | `OPEN_PROCESSOR_LIST` | Opens an in-app modal rendering [`docs/legal/processors.md`](../../../../legal/processors.md). | Modal fade-in. |

### State Changes
- Re-derive on owning-reducer or local-UI-draft change:
  `state.ui.systemMenu.callerRoute` (callerRoute),
  `selectors.persistence.canSaveCurrentGame` (canSave),
  `selectors.persistence.hasLoadableSave` (canLoad),
  `selectors.session.restartGuard` (restartGuard),
  `state.ui.unsavedDrafts` (dirtyDrafts).
- Hover, focus, selected row, open tab, target cursor, drag ghost,
  and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- After guard approval and exit animation:
  Save Game → `55-save-load`;
  Load Game → `55-save-load`;
  Options → `56-options`;
  Main Menu → `60-confirmation-dialog`;
  Manage packs → `71-pack-manager`;
  Safe mode → `60-confirmation-dialog`;
  Resume → caller screen.
- Forget me → `60-confirmation-dialog`; on accept, dispatches
  `WIPE_LOCAL_DATA scope=all confirmed=true` and reloads the page.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets fall back through the resolver.
  Missing gameplay records, invalid content IDs, or rejected
  commands fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Error toast text is produced by `formatUserError(err, locale)`
  declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.
- **Save / load debounce.** All command-emitting buttons and
  hotkeys are debounced 250 ms (trailing edge); dispatcher
  single-flight is the safety net. See
  [`command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).
- **Save eligibility.** The Save Game item is disabled per the
  `canSaveNow(state)` predicate enumerated in
  [`content-schema/save-eligibility.md`](../../../../../content-schema/save-eligibility.md).
  Disabled reasons surface as localized strings:
  `save.disabled.in_battle`, `save.disabled.not_your_turn`,
  `save.disabled.modal_open`, `save.disabled.animating`.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they must
  not invent new behavior.

---

## 🔍 Sync Check

- **UI: ⚠** — Action set matches sibling [`spec.md` § Component Tree](./spec.md#component-tree) (post-rewrite, expanded for ManagePacks / SafeMode / ForgetMe / PrivacyFooter / ErasureReceiptModal). The legacy `mockup.html` action IDs (`system.main`, `system.quit`) are out of date — flagged in sibling [`architecture.md` § Issues](./architecture.md#-issues).
- **Schema: ✔** — `erasure-receipt.schema.json` and `audit-log-entry.schema.json` carry rows in [`schema-matrix.md`](../../../schema-matrix.md) (L85, L86). Save-eligibility reasons match the enum in [`save-eligibility.md`](../../../../../content-schema/save-eligibility.md).
- **Tasks: ✔** — Every command-emitting row resolves: local-UI prefixes match [`screen-command-coverage.json` `localUiPrefixes`](../../../screen-command-coverage.json); `OPEN_PACK_MANAGER`, `ENTER_SAFE_MODE`, `WIPE_LOCAL_DATA`, `REQUEST_ERASURE_RECEIPT`, `OPEN_PRIVACY_POLICY` are declared in [`command-schema.md`](../../../command-schema.md). Screen task: [`tasks/phase-2/07-ui-screen-backlog/54-system-menu-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/54-system-menu-screen.md).

## ⚠ Issues

- **Mockup-vs-interactions ID drift.** `mockup.html` exposes
  `data-action="system.main"` and `data-action="system.quit"`, which
  do not match the canonical action IDs in this table
  (`system.mainMenu` for the return-to-main-menu flow; no Quit-to-
  desktop action). Canonical write-up lives in sibling
  [`architecture.md` § Issues](./architecture.md#-issues); reference
  there for the resolution path. Skill did not invent a `system.quit`
  row (Hard Prohibition B) and did not edit the mockup (Hard
  Prohibition D).
