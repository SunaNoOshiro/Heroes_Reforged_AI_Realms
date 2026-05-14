# Screen 54: System Menu
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `audit-log-entry.schema.json` | Local on-device audit-log row appended by `REQUEST_ERASURE_RECEIPT`. | [`content-schema/schemas/audit-log-entry.schema.json`](../../../../../content-schema/schemas/audit-log-entry.schema.json) |
| `erasure-receipt.schema.json` | User-facing erasure receipt rendered in `ErasureReceiptModal`. | [`content-schema/schemas/erasure-receipt.schema.json`](../../../../../content-schema/schemas/erasure-receipt.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| Screen-specific registries | Saves, packs, and shell-state registries referenced below. | Loaded content / runtime registries. |

Schema-matrix rows for the schemas above (`AssetIndex`,
`Localization`, `AuditLogEntry`, `ErasureReceipt`, `Ruleset`) are
registered in [`schema-matrix.md`](../../../schema-matrix.md).

### Runtime State Selectors
| UI Element | Selector / state path | Notes |
| --- | --- | --- |
| `callerRoute` | `state.ui.systemMenu.callerRoute` | Screen to resume on close. UI-only; not persisted. |
| `canSave` | `selectors.persistence.canSaveCurrentGame` | Drives Save command availability per [`save-eligibility.md`](../../../../../content-schema/save-eligibility.md). |
| `canLoad` | `selectors.persistence.hasLoadableSave` | Drives Load command availability. |
| `restartGuard` | `selectors.session.restartGuard` | Confirm / disabled gate for restart flow. |
| `dirtyDrafts` | `state.ui.unsavedDrafts` | Local UI drafts requiring discard confirmation. |

### Commands And Events

**Local-UI route tokens** (`OPEN_*`, `REQUEST_*`, `CLOSE_*` —
matched by `localUiPrefixes` in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):

- `OPEN_SAVE_GAME` from `system.save` → routes to `55-save-load` in save mode.
- `OPEN_LOAD_GAME` from `system.load` → routes to `55-save-load` in load mode.
- `OPEN_OPTIONS` from `system.options` → routes to `56-options`.
- `REQUEST_RETURN_TO_MAIN_MENU` from `system.mainMenu` → opens `60-confirmation-dialog`; on accept, returns to `01-main-menu`.
- `CLOSE_SYSTEM_MENU` from `system.resume` → returns to `callerRoute`.
- `OPEN_PROCESSOR_LIST` from `system.processors` → in-app modal rendering [`docs/legal/processors.md`](../../../../legal/processors.md).

**Commands declared in
[`command-schema.md`](../../../command-schema.md)** (route through
the shared dispatcher; see Single-flight section for debounce
guarantees):

- `OPEN_PACK_MANAGER` from `system.managePacks` → routes to [`71-pack-manager`](../71-pack-manager/) per [`pack-trust.md`](../../../pack-trust.md). Declared in [`command-schema.md` § Pack-Trust Commands](../../../command-schema.md).
- `ENTER_SAFE_MODE` from `system.safeMode` → routes through [`60-confirmation-dialog`](../60-confirmation-dialog/) per [`pack-trust.md` § Safe Mode](../../../pack-trust.md#5-safe-mode). Owned by `mvp.08-persistence.12-pack-trust-prompt-and-manager`.
- `WIPE_LOCAL_DATA` from `system.forgetMe` → routes through [`60-confirmation-dialog`](../60-confirmation-dialog/) per [`data-inventory.md` § Wipe-Scope Policy](../../../data-inventory.md#3-wipe-scope-policy). Payload `{ scope: "all" \| "saves" \| "profile" \| "chat", confirmed: boolean }`. The handler iterates the `data-inventory.md` rows. Owned by `mvp.08-persistence.14-wipe-local-data-handler`.
- `REQUEST_ERASURE_RECEIPT` from `system.erasureReceipt` → emits an [`erasure-receipt.schema.json`](../../../../../content-schema/schemas/erasure-receipt.schema.json) value and appends an [`audit-log-entry.schema.json`](../../../../../content-schema/schemas/audit-log-entry.schema.json) row with `type: "ERASURE"`. Rendered by `ErasureReceiptModal`. Owned by `mvp.07-ui-shell.25-erasure-receipt-modal`.
- `OPEN_PRIVACY_POLICY` from `system.privacy` → in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). Mirrors the footer affordance on screen `01-main-menu`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.system-menu.title`
- `ui.system-menu.actions.*`
- `ui.system-menu.status.*`
- `ui.system-menu.errors.*`
- `ui.system-menu.footer.privacy`
- `ui.system-menu.footer.processors`
- `ui.privacy.forget-me.label`
- `ui.privacy.forget-me.confirm`
- `ui.privacy.erasure-receipt.title`
- `ui.privacy.erasure-receipt.copy`
- `ui.privacy.erasure-receipt.serverFallback`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- Save-disabled reasons (per `canSaveNow(state)` in
  [`content-schema/save-eligibility.md`](../../../../../content-schema/save-eligibility.md)):
  `save.disabled.in_battle`, `save.disabled.not_your_turn`,
  `save.disabled.modal_open`, `save.disabled.animating`.

### Asset, Sound, And VFX IDs
- `ui.system-menu.background`
- `ui.system-menu.frame`
- `ui.system-menu.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.system-menu.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs; never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Routes to save / load / options / confirmation never mutate
  gameplay. Destructive actions require confirmation and preserve
  deterministic state until accepted.
- Missing presentation assets fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Sibling [`interactions.md` § Actions](./interactions.md#actions) lists the same command IDs and routes; sibling [`spec.md` § State Bindings](./spec.md#state-bindings) lists the same selectors.
- **Schema: ✔** — All five schemas resolve and carry rows in [`schema-matrix.md`](../../../schema-matrix.md) (`AssetIndex` L36, `Localization` L38, `Ruleset` L40, `AuditLogEntry` L85, `ErasureReceipt` L86 — the latter explicitly cites screen `54-system-menu`).
- **Tasks: ✔** — Owning screen task is [`tasks/phase-2/07-ui-screen-backlog/54-system-menu-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/54-system-menu-screen.md); upstream handlers `mvp.08-persistence.14-wipe-local-data-handler`, `mvp.08-persistence.12-pack-trust-prompt-and-manager`, and `mvp.07-ui-shell.25-erasure-receipt-modal` are declared in [`command-schema.md`](../../../command-schema.md).

## ⚠ Issues

- **No new gaps surfaced here.** The known
  `state.profile.auditLog` (`hr-profile.audit`) data-inventory gap
  recorded in
  [`data-inventory.md` § Issues](../../../data-inventory.md) is
  already tracked there against
  `mvp.02-content-schemas.41-error-and-audit-schemas`; not
  re-flagged. The mockup-vs-interactions ID drift (`system.main` /
  `system.quit`) is flagged in sibling
  [`architecture.md` § Issues](./architecture.md#-issues) — see
  there for the canonical write-up.
