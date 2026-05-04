# Screen 70: Save Import

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Quarantined save-import surface. Validates the file against
[`save.schema.json`](../../../../../content-schema/schemas/save.schema.json)
**before** any pack mount, asset fetch, or IndexedDB write per
[`pack-trust.md`](../../../pack-trust.md). Discloses the source,
schema-validate result, referenced packs, compatibility seal
(ok / skew / tamper / unsupported), and target slot. Gates pack
trust review (screen 72) before allowing confirmation.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- System-import dialog over the dimmed save/load caller.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| source | state.ui.saveImport.source | `{ kind: "file" \| "url" \| "share-link", value }` literal source string before parsing. |
| stagingState | state.ui.saveImport.stagingState | `validating \| schema_ok \| schema_too_new \| schema_no_migration \| schema_invalid`. |
| stagedSave | selectors.persistence.import.staging | In-memory parsed save (read-only). |
| compatibility | selectors.persistence.selectedSaveCompatibility | Discriminated union per `pack-trust.md` § Save Version Bounds. |
| referencedPacks | selectors.packs.referencedFromStaging | `{ id, version, contentHash, status: installed \| missing \| mismatched, transitive: boolean }[]`. |
| pendingTrust | selectors.packs.pendingTrustDecisions | Drives the "Review pack trust" button. |
| targetSlot | state.ui.saveImport.targetSlotId | Slot id chosen for the import. |
| overwriteRing | selectors.persistence.recycle.savedSlots | Per-slot rolling overwrite ring (cap 3, 7-day TTL). |

### Mechanics Mapping
- Reads only the staged save. Cannot dispatch any gameplay command
  until trust review and compatibility checks are clear.
- Schema validate runs before any pack fetch or asset load; fails
  surface as terminal states (`too-new`, `no-migration`,
  `schema_invalid`, `tamper`).
- Reference: [`pack-trust.md` § Resource Limits](../../../pack-trust.md#1-resource-limits).

### Animation Contract
- Source disclosure fades in; validation result transitions seal
  colour (green/amber/red/black). Reduced-motion mode preserves
  visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams.
- Data contracts identify schema/config/localization fields required
  to implement the screen.

### AI Implementation Notes
- Screen slug: `save-import`; system group: `system`; curation
  marker: `curated-pass-1`.
- Build runtime components from the package contract; do not add
  affordances not listed here.
- Localization keys live under `ui.save-import.*` per
  [`pack-trust.md` § Error Codes](../../../pack-trust.md#10-error-codes).
- Owning task:
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../../../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md).
