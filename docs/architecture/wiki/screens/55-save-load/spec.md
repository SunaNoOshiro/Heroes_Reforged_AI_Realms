# Screen 55: Save / Load

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Save/load slot browser with save metadata, compatibility checks, overwrite confirmation, and selected slot preview.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Ledger-style slot table with timestamp, scenario name, player, thumbnail, content hash status, mode tabs, and Save/Load/Delete/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- SaveLoadScreen
  - ModeTabs
  - SaveSlotTable
  - SlotPreview
  - CompatibilitySeal
  - ActionButtons

`SaveSlotTable` renders user slots and the three rotating autosave
slots (`auto-1`, `auto-2`, `auto-3`) in a single list, with autosave
rows distinguished by a locked name, autosave icon, and last End-Day
stamp. It also renders a "Manage saves" CTA above the slot list when
`quotaUsage.used / quota > 0.8`; the CTA recommends exporting older
saves before the next write fails. No new component nodes are
introduced — these affordances live inside the existing
`SaveSlotTable` so component-registry coverage stays stable.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| mode | state.ui.saveLoad.mode | Save or load mode. |
| slots | selectors.persistence.saveSlotManifests | User save metadata list. Manifest-only reads. |
| autosaveSlots | selectors.persistence.autosaveSlots | Rotating `auto-1`/`-2`/`-3` slots; rendered distinguishably from user slots. |
| selectedSlot | state.ui.saveLoad.selectedSlotId | Local selected slot. |
| compatibility | selectors.persistence.selectedSaveCompatibility | Version/hash/migration result. Computed against the migration registry; last 4 versions are migrated in-app. |
| overwriteGuard | selectors.persistence.overwriteGuard | Overwrite availability and confirmation need. |
| quotaUsage | selectors.persistence.quotaUsage | `{ used, quota }`. Drives the "Manage saves" CTA above the slot list when `used / quota > 0.8`. |

### Mechanics Mapping
- Reads save manifests first. Loading validates schema version, content hashes, pack compatibility, ruleset version, and migration availability before hydrating state.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Slot rows slide, selected thumbnail resolves, compatibility seal stamps, overwrite/delete actions route through confirmation.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `save-load`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
