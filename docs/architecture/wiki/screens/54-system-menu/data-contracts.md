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
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `callerRoute` | `state.ui.systemMenu.callerRoute` | Screen to resume. |
| `canSave` | `selectors.persistence.canSaveCurrentGame` | Save command availability. |
| `canLoad` | `selectors.persistence.hasLoadableSave` | Load command availability. |
| `restartGuard` | `selectors.session.restartGuard` | Restart disabled/confirm state. |
| `dirtyDrafts` | `state.ui.unsavedDrafts` | Local drafts needing discard confirmation. |

### Commands And Events
- `OPEN_SAVE_GAME` from `system.save`: Routes to save mode.
- `OPEN_LOAD_GAME` from `system.load`: Routes to load mode.
- `OPEN_OPTIONS` from `system.options`: Routes to settings.
- `REQUEST_RETURN_TO_MAIN_MENU` from `system.mainMenu`: Requires confirmation.
- `CLOSE_SYSTEM_MENU` from `system.resume`: Returns to gameplay.
- `OPEN_PACK_MANAGER` from `system.managePacks`: Routes to screen [`71-pack-manager`](../71-pack-manager/) per [`pack-trust.md`](../../../pack-trust.md).
- `ENTER_SAFE_MODE` from `system.safeMode`: Routes through screen [`60-confirmation-dialog`](../60-confirmation-dialog/) per [`pack-trust.md` § Safe Mode](../../../pack-trust.md#5-safe-mode).
- `WIPE_LOCAL_DATA` from `system.forgetMe`: Routes through screen [`60-confirmation-dialog`](../60-confirmation-dialog/) per [`data-inventory.md` § Wipe-Scope Policy](../../../data-inventory.md#3-wipe-scope-policy). Payload `{ scope: "all" \| "saves" \| "profile" \| "chat", confirmed: boolean }`. The handler iterates `data-inventory.md` rows.

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
- `ui.privacy.forget-me.label`
- `ui.privacy.forget-me.confirm`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.system-menu.background`
- `ui.system-menu.frame`
- `ui.system-menu.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.system-menu.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Routes to save/load/options/confirmation without mutating gameplay. Destructive actions require confirmation and preserve deterministic state until accepted.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
