# Screen 70: Save Import
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `save.schema.json` | Validate the parsed save before pack mount or slot write. | `content-schema/schemas/save.schema.json` |
| `manifest.schema.json` | Resolve referenced packs and their capabilities for trust disclosure. | `content-schema/schemas/manifest.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `asset-index.schema.json` | Background, frames, icons. | `content-schema/schemas/asset-index.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `source` | `state.ui.saveImport.source` | Literal source string (filename + size, URL, or pasted blob). No automatic parse. |
| `stagingState` | `state.ui.saveImport.stagingState` | State machine: `validating \| schema_ok \| schema_too_new \| schema_no_migration \| schema_invalid`. |
| `stagedSave` | `selectors.persistence.import.staging` | In-memory parsed save (read-only). Cleared on cancel, tab unload, or completion. |
| `compatibility` | `selectors.persistence.selectedSaveCompatibility` | `{ status: "ok" } \| { status: "skew", mismatched } \| { status: "tamper", expectedStateHash, actualStateHash } \| { status: "unsupported", reason }`. |
| `referencedPacks` | `selectors.packs.referencedFromStaging` | Per-pack disclosure rows for trust review. |
| `pendingTrust` | `selectors.packs.pendingTrustDecisions` | Drives the "Review pack trust" CTA. |
| `targetSlot` | `state.ui.saveImport.targetSlotId` | Slot id chosen for the import. |
| `overwriteRing` | `selectors.persistence.recycle.savedSlots` | Per-slot overwrite ring (cap 3, 7-day TTL). |

### Commands And Events
- `OPEN_SAVE_IMPORT` from `saveImport.open`: Mount the staged-save in-memory area and reset the source picker.
- `BEGIN_SAVE_IMPORT` from `saveImport.begin`: Run size/ratio caps and schema validate; quarantine on success.
- `OPEN_PACK_TRUST_PROMPT` from `saveImport.review`: Route to screen 72 with the per-pack disclosure list.
- `CONFIRM_SAVE_IMPORT` from `saveImport.confirm`: Promote staged save into the target slot.
- `CANCEL_SAVE_IMPORT` from `saveImport.cancel`: Drop the staged save and clear the staging area.
- `RESTORE_OVERWRITTEN_SAVE` from `saveImport.restoreOverwritten`: Restore from the overwrite ring.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
- `ui.save-import.source.title`
- `ui.save-import.validation.title`
- `ui.save-import.packs.title`
- `ui.save-import.compatibility.title`
- `ui.save-import.target.title`
- `ui.save-import.notice.title`
- `ui.save-import.reject.too-large`
- `ui.save-import.reject.too-new`
- `ui.save-import.reject.no-migration`
- `ui.save-import.reject.bomb`
- `ui.save-import.reject.timeout`
- `ui.save-import.reject.safe-mode-blocks-pack`
- `ui.save-import.warn.pack-skew`
- `ui.save-import.warn.untrusted-packs`
- `ui.save-import.error.tamper`
- `ui.save-import.seal.ok`
- `ui.save-import.seal.version-skew`
- `ui.save-import.seal.tamper-detected`
- `ui.save-import.confirm.overwrite`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.save-import.background`
- `ui.save-import.frame`
- `ui.save-import.icons.seal`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.warn`, `audio.system.error`

### Save And Replay Fields
- This screen never enters the save state; the staged-save in-memory
  area is presentation-only.
- Confirmation promotes a validated `save.schema.json` record into
  the slot store via `CONFIRM_SAVE_IMPORT`.

### Validation And Fallback
- Schema validate runs before any pack fetch or asset load. Failure
  paths terminate without a click-through.
- Quarantine staging holds the parsed object in memory only — there
  is no IndexedDB write before the user confirms.
- Resource caps and the ZIP path-traversal sanitizer are pinned in
  [`pack-trust.md` § Resource Limits](../../../pack-trust.md#1-resource-limits);
  this screen is the user-visible surface for those refusals.
