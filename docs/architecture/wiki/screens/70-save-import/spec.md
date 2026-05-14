# Screen 70: Save Import

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Quarantined save-import surface. Validates the source against
[`save.schema.json`](../../../../../content-schema/schemas/save.schema.json)
**before** any pack mount, asset fetch, or IndexedDB write per
[`pack-trust.md`](../../../pack-trust.md). Discloses source,
validation result, referenced packs, compatibility seal
(`ok` / `skew` / `tamper` / `unsupported`), and target slot. Pack
trust review (screen 72) gates `CONFIRM_SAVE_IMPORT`.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-import dialog rendered over the dimmed save/load caller.
- `mockup.html` is visible UI only. Logic, timing, and
  implementation notes live in the sibling Markdown files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `source` | `state.ui.saveImport.source` | `{ kind: "file" \| "url" \| "share-link", value }`. Literal source string before parsing. |
| `stagingState` | `state.ui.saveImport.stagingState` | `validating \| schema_ok \| schema_too_new \| schema_no_migration \| schema_invalid`. |
| `stagedSave` | `selectors.persistence.import.staging` | In-memory parsed save (read-only). Cleared on `CANCEL_SAVE_IMPORT`, on tab unload, and on import completion. |
| `compatibility` | `selectors.persistence.selectedSaveCompatibility` | Discriminated union per [`pack-trust.md` § Save Version Bounds](../../../pack-trust.md#3-save-version-bounds): `{ status: "ok" } \| { status: "skew", mismatched } \| { status: "tamper", expectedStateHash, actualStateHash } \| { status: "unsupported", reason }`. |
| `referencedPacks` | `selectors.packs.referencedFromStaging` | `{ id, version, contentHash, status: installed \| missing \| mismatched, transitive: boolean }[]`. |
| `pendingTrust` | `selectors.packs.pendingTrustDecisions` | Drives the "Review pack trust" CTA. |
| `targetSlot` | `state.ui.saveImport.targetSlotId` | Slot id chosen for the import. |
| `overwriteRing` | `selectors.persistence.recycle.savedSlots` | Per-slot rolling overwrite ring (cap 3 entries, 7-day TTL). |

### Mechanics Mapping
- Reads only the staged save. No gameplay command may dispatch
  until pack trust review and compatibility checks clear.
- Schema validate runs **before** any pack fetch or asset load.
  Terminal rejections: `too-new`, `no-migration`, `schema_invalid`,
  `tamper`. Caps, traversal rules, and trust-anchor lookup
  precedence are pinned in
  [`pack-trust.md` § Resource Limits](../../../pack-trust.md#1-resource-limits)
  — do not invent per-screen thresholds.

### Animation Contract
- Source disclosure fades in. Validation seal transitions colour
  (green / amber / red / black) per outcome. Reduced-motion mode
  preserves the colour transition as a static highlight plus
  localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and every authoritative state
  binding.
- Interactions file covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams that mirror
  the interactions.
- Data contracts identify every schema, config, localization, and
  asset field required to build the screen.

### AI Implementation Notes
- Screen slug: `save-import`; system group: `system`; curation
  marker: `curated-pass-1`.
- Build runtime components from the package contract; do not add
  affordances not listed here.
- Localization keys live under `ui.save-import.*` per
  [`pack-trust.md` § Error Codes](../../../pack-trust.md#10-error-codes).
- Owning task:
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md).

---

## 🔍 Sync Check

- **UI: ✔** — Regions and state bindings match sibling
  [`interactions.md`](./interactions.md),
  [`data-contracts.md`](./data-contracts.md),
  [`architecture.md`](./architecture.md), and
  [`mockup.html`](./mockup.html).
- **Schema: ✔** — `save.schema.json` validate-before-mount contract
  and the four-arm `compatibility` discriminated union match
  [`pack-trust.md` § 3](../../../pack-trust.md#3-save-version-bounds);
  state-binding selectors match the canonical `selectors.persistence.*`
  / `selectors.packs.*` names used in
  [`pack-trust.md`](../../../pack-trust.md).
- **Tasks: ⚠** — Owning task
  [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  references this file in Read First. The rolling overwrite-ring
  slice surfaced by `overwriteRing` is **not** registered in
  [`data-inventory.md`](../../../data-inventory.md); see Issues.

## ⚠ Issues

- **Overwrite ring not registered in `data-inventory.md`.** This
  spec, [`data-contracts.md`](./data-contracts.md),
  [`interactions.md`](./interactions.md), and
  [`pack-trust.md` § 2](../../../pack-trust.md#2-save-quarantine)
  all name the per-slot rolling overwrite ring at
  `selectors.persistence.recycle.savedSlots` (cap 3 entries,
  7-day TTL), restored via `RESTORE_OVERWRITTEN_SAVE`. No matching
  row exists in
  [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md
  root contract ("every persisted field is registered in
  `data-inventory.md`"), the owning task
  [`mvp.08-persistence.11`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  must add the row before the slice can ship. Suggested values:
  Field=`save overwrite ring`,
  State path=`state.persistence.recycle.savedSlots`,
  Medium=`IndexedDB (hr-saves.recycle)`, Sensitivity=`low`,
  Retention=`per-slot ring (cap 3, 7-day TTL)`,
  Wipe scope=`WIPE_LOCAL_DATA scope=saves|all`,
  Notes=`save.schema.json`; restored via `RESTORE_OVERWRITTEN_SAVE`.
  Same gap is already flagged in
  [`pack-trust.md` § ⚠ Issues](../../../pack-trust.md). Skill did
  not edit `data-inventory.md` (Hard Prohibition D).
