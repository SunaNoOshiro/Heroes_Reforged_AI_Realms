# Screen 55: Save / Load
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
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, and save/load metadata. | `content-schema/schemas/scenario.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `manifest.schema.json` | Pack identity, dependencies, content hashes, capabilities, and trust metadata. | `content-schema/schemas/manifest.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `mode` | `state.ui.saveLoad.mode` | Save or load mode. |
| `slots` | `selectors.persistence.saveSlotManifests` | Save metadata list. Reads only `${id}:manifest` records — payload is fetched only on Load confirmation. |
| `autosaveSlots` | `selectors.persistence.autosaveSlots` | Three rotating autosave slots (`auto-1`, `auto-2`, `auto-3`), newest-first. Rendered distinguishably from user slots. |
| `selectedSlot` | `state.ui.saveLoad.selectedSlotId` | Local selected slot. |
| `compatibility` | `selectors.persistence.selectedSaveCompatibility` | Version/hash/migration result computed against the migration registry, not a stubbed boolean. Last 4 save versions are migrated in-app; older saves surface "incompatible save migration needed". |
| `overwriteGuard` | `selectors.persistence.overwriteGuard` | Overwrite availability and confirmation need. |
| `quotaUsage` | `selectors.persistence.quotaUsage` | `{ used, quota }` from the IDB wrapper. Drives a "Manage saves" CTA above the slot list when `used / quota > 0.8`. |
| `recycleRing` | `selectors.persistence.recycle.savedSlots` | Per-slot rolling overwrite ring (cap 3, 7-day TTL) per [`pack-trust.md` § Save Quarantine](../../../pack-trust.md#2-save-quarantine). |
| `importStaging` | `selectors.persistence.import.staging` | In-memory staged save during import, owned by screen [`70-save-import`](../70-save-import/). |
| `lastDestructive` | `state.ui.lastDestructive` | Soft-delete / overwrite undo slot per [`undo-policy.md`](../../../undo-policy.md). Drives the non-modal undo toast while `now() < expiresAt`. Never enters saves or the canonical state hash. |

### Commands And Events
- `SELECT_SAVE_SLOT` from `saveLoad.selectSlot`: Updates preview and compatibility.
- `SAVE_GAME_SLOT` from `saveLoad.save`: Writes save manifest and payload after overwrite guard.
- `LOAD_GAME_SLOT` from `saveLoad.load`: Validates and loads selected save.
- `REQUEST_DELETE_SAVE_SLOT` from `saveLoad.delete`: Requires confirmation.
- `CLOSE_SAVE_LOAD` from `saveLoad.back`: Returns to caller.
- `OPEN_SAVE_IMPORT` from `saveLoad.import`: Routes to the quarantined import flow on screen [`70-save-import`](../70-save-import/).
- `RESTORE_OVERWRITTEN_SAVE` from `saveLoad.restoreOverwritten`: Restores from the rolling overwrite ring per [`pack-trust.md` § Save Quarantine](../../../pack-trust.md#2-save-quarantine).
- `DELETE_SAVE_SLOT` from the confirmation chain after `REQUEST_DELETE_SAVE_SLOT`: Marks the slot `softDeleted: true` with a 5 s tombstone TTL per [`undo-policy.md`](../../../undo-policy.md); populates `state.ui.lastDestructive`.
- `OVERWRITE_SAVE_SLOT` from the save flow when overwriting an existing slot: Clones the prior payload into the rolling overwrite ring before the new payload writes; populates `state.ui.lastDestructive`.
- `UNDO_LAST_DESTRUCTIVE` from the undo toast: Clears tombstone fields or restores the overwrite-ring entry; clears `state.ui.lastDestructive`.
- `EXPIRE_LAST_DESTRUCTIVE` from a scheduled effect at TTL: Runs the underlying file-system delete (or drops the ring entry) and clears `state.ui.lastDestructive`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.save-load.title`
- `ui.save-load.actions.*`
- `ui.save-load.status.*`
- `ui.save-load.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.save-load.background`
- `ui.save-load.frame`
- `ui.save-load.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.save-load.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Reads save manifests first. Loading validates schema version, content hashes, pack compatibility, ruleset version, and migration availability before hydrating state.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
- Migration support window: the **last 4 save versions** are migrated in-app via the registry owned by [`tasks/mvp/08-persistence/08-migration-registry.md`](../../../../../tasks/mvp/08-persistence/08-migration-registry.md). Older saves render the canonical "incompatible save migration needed" missing-state and the player is told to keep the file. Pack-hash mismatches continue to be handled by the load gate's warn-or-abort policy in [`docs/architecture/version-policy.md`](../../../version-policy.md), not by save migrators.

### Autosave And Storage Layout
- Autosave writes three rotating slots (`auto-1`, `auto-2`, `auto-3`); the slot list distinguishes them from user slots. Cadence and policy are owned by [`tasks/mvp/08-persistence/06-autosave.md`](../../../../../tasks/mvp/08-persistence/06-autosave.md).
- Each save is stored as two sibling IDB records under `${id}:manifest` and `${id}:payload` written inside a single transaction (see [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../../../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)). Slot list views read only manifest records.
- During multiplayer, only the host autosaves; peer machines render the slot list read-only with a "host saved" indicator. See `interactions.md` § "During multiplayer".
