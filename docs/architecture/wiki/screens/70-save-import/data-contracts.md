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
| `save.schema.json` | Validate the parsed save before pack mount or slot write. | [`content-schema/schemas/save.schema.json`](../../../../../content-schema/schemas/save.schema.json) |
| `manifest.schema.json` | Resolve referenced packs and their capabilities for trust disclosure. | [`content-schema/schemas/manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `asset-index.schema.json` | Background, frame, icon registry lookups. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |

### Runtime State Selectors
| Element | Selector | Notes |
| --- | --- | --- |
| `source` | `state.ui.saveImport.source` | Literal source string (filename + size, URL, or pasted blob). No automatic parse. |
| `stagingState` | `state.ui.saveImport.stagingState` | State machine: `validating \| schema_ok \| schema_too_new \| schema_no_migration \| schema_invalid`. |
| `stagedSave` | `selectors.persistence.import.staging` | In-memory parsed save (read-only). Cleared on `CANCEL_SAVE_IMPORT`, on tab unload, and on import completion. |
| `compatibility` | `selectors.persistence.selectedSaveCompatibility` | `{ status: "ok" } \| { status: "skew", mismatched } \| { status: "tamper", expectedStateHash, actualStateHash } \| { status: "unsupported", reason }`. |
| `referencedPacks` | `selectors.packs.referencedFromStaging` | Per-pack disclosure rows for trust review. |
| `pendingTrust` | `selectors.packs.pendingTrustDecisions` | Drives the "Review pack trust" CTA. |
| `targetSlot` | `state.ui.saveImport.targetSlotId` | Slot id chosen for the import. |
| `overwriteRing` | `selectors.persistence.recycle.savedSlots` | Per-slot rolling overwrite ring (cap 3 entries, 7-day TTL). |
| `safeMode` (read-only gate) | `state.session.safeMode` | Gates the safe-mode-blocks-pack rejection per [`pack-trust.md` § Safe Mode](../../../pack-trust.md#5-safe-mode). |

### Commands And Events
| Action ID | Command | Notes |
| --- | --- | --- |
| `saveImport.open` | `OPEN_SAVE_IMPORT` | local-ui per [`command-schema.md`](../../../command-schema.md#save-import--pack-trust-commands). Mounts the staged-save in-memory area and resets the source picker. |
| `saveImport.begin` | `BEGIN_SAVE_IMPORT` | Runs size, ratio, wall-time, and schema-validate gates; quarantines on success. |
| `saveImport.review` | `OPEN_PACK_TRUST_PROMPT` | local-ui. Routes to screen 72 with the per-pack disclosure list. |
| `saveImport.confirm` | `CONFIRM_SAVE_IMPORT` | Promotes staged save into the target slot after trust review. |
| `saveImport.cancel` | `CANCEL_SAVE_IMPORT` | local-ui. Drops the staged save and clears the in-memory quarantine. |
| `saveImport.restoreOverwritten` | `RESTORE_OVERWRITTEN_SAVE` | Restores from the overwrite ring. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
Section panel titles:

- `ui.save-import.source.title`
- `ui.save-import.validation.title`
- `ui.save-import.packs.title`
- `ui.save-import.compatibility.title`
- `ui.save-import.target.title`
- `ui.save-import.notice.title`

Terminal rejections (no click-through):

- `ui.save-import.reject.too-large`
- `ui.save-import.reject.too-new`
- `ui.save-import.reject.no-migration`
- `ui.save-import.reject.bomb`
- `ui.save-import.reject.timeout`
- `ui.save-import.reject.safe-mode-blocks-pack`

Soft warnings and seals:

- `ui.save-import.warn.pack-skew`
- `ui.save-import.warn.untrusted-packs`
- `ui.save-import.error.tamper`
- `ui.save-import.seal.ok`
- `ui.save-import.seal.version-skew`
- `ui.save-import.seal.tamper-detected`
- `ui.save-import.confirm.overwrite`

Common keys: `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
`ui.common.close`.

### Asset, Sound, And VFX IDs
- `ui.save-import.background`
- `ui.save-import.frame`
- `ui.save-import.icons.seal`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.warn`,
  `audio.system.error`

### Save And Replay Fields
- The screen never enters the engine save state; staged-save data
  lives in memory only.
- `CONFIRM_SAVE_IMPORT` promotes a validated `save.schema.json`
  record into the slot store and moves the prior contents into the
  rolling overwrite ring.

### Validation And Fallback
- Schema validate runs **before** any pack fetch or asset load.
  Terminal failures (`too-large`, `bomb`, `timeout`, `too-new`,
  `no-migration`, `schema_invalid`, `tamper`,
  `safe-mode-blocks-pack`) end the flow without a click-through.
- Quarantine staging holds the parsed object in memory only — no
  IndexedDB write happens before the user confirms.
- Resource caps and the ZIP path-traversal sanitizer are pinned in
  [`pack-trust.md` § Resource Limits](../../../pack-trust.md#1-resource-limits);
  this screen is the user-visible surface for those refusals.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, commands, panel titles, and seal copy
  keys match sibling [`spec.md`](./spec.md),
  [`interactions.md`](./interactions.md),
  [`architecture.md`](./architecture.md), and
  [`mockup.html`](./mockup.html).
- **Schema: ✔** — `save.schema.json`, `manifest.schema.json`,
  `localization.schema.json`, and `asset-index.schema.json` all
  exist under
  [`content-schema/schemas/`](../../../../../content-schema/schemas/);
  the `compatibility` discriminated-union arms match
  [`pack-trust.md` § 3](../../../pack-trust.md#3-save-version-bounds).
- **Tasks: ⚠** — Owning task
  [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  references this file in Read First; six command tokens
  (`OPEN_SAVE_IMPORT`, `BEGIN_SAVE_IMPORT`, `OPEN_PACK_TRUST_PROMPT`,
  `CONFIRM_SAVE_IMPORT`, `CANCEL_SAVE_IMPORT`,
  `RESTORE_OVERWRITTEN_SAVE`) are present in
  [`command-schema.md` § Save-Import & Pack-Trust](../../../command-schema.md#save-import--pack-trust-commands).
  The `overwriteRing` slice is not registered in
  [`data-inventory.md`](../../../data-inventory.md); see sibling
  [`spec.md` § ⚠ Issues](./spec.md) — aligned.

## ⚠ Issues

- **Overwrite ring not registered in `data-inventory.md`.** See
  sibling [`spec.md`](./spec.md) for the full description and
  suggested row. Same gap flagged in
  [`pack-trust.md` § ⚠ Issues](../../../pack-trust.md). Owning
  task:
  [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md).
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
