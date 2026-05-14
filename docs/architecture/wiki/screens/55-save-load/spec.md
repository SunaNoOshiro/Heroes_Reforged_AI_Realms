# Screen 55: Save / Load

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

Owning task:
[`mvp.08-persistence.03-save-load-ui`](../../../../../tasks/mvp/08-persistence/03-save-load-ui.md).

### Description
Slot browser for user saves and the three rotating autosave slots
(`auto-1`, `auto-2`, `auto-3`). Surfaces save metadata, compatibility
checks against the migration registry, overwrite confirmation with a
soft-delete undo toast, the rolling overwrite-ring restore, the
quarantined save-import route, and a "Manage saves" CTA when storage
quota approaches its limit.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Ledger-style slot table with timestamp, scenario name, player,
  thumbnail, content-hash status, mode tabs, and Save / Load / Delete
  / Back buttons.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots, right-click
  detail affordances, bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `SaveLoadScreen`
  - `ModeTabs`
  - `SaveSlotTable`
  - `SlotPreview`
  - `CompatibilitySeal`
  - `ActionButtons`

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
| `mode` | `state.ui.saveLoad.mode` | Save or Load mode. |
| `slots` | `selectors.persistence.saveSlotManifests` | User save metadata list; manifest-only reads. Payload is fetched only on Load confirmation. |
| `autosaveSlots` | `selectors.persistence.autosaveSlots` | Rotating `auto-1` / `auto-2` / `auto-3` slots; rendered distinguishably from user slots. |
| `selectedSlot` | `state.ui.saveLoad.selectedSlotId` | Local selected slot. |
| `compatibility` | `selectors.persistence.selectedSaveCompatibility` | Version/hash/migration result computed against the migration registry. Last 4 save versions are migrated in-app; older saves surface "incompatible save migration needed". |
| `overwriteGuard` | `selectors.persistence.overwriteGuard` | Overwrite availability and confirmation need. |
| `quotaUsage` | `selectors.persistence.quotaUsage` | `{ used, quota }` from the IDB wrapper. Drives the "Manage saves" CTA above the slot list when `used / quota > 0.8`. |
| `recycleRing` | `selectors.persistence.recycle.savedSlots` | Per-slot rolling overwrite ring (cap 3, 7-day TTL) per [`pack-trust.md` § Save Quarantine](../../../pack-trust.md#2-save-quarantine). Drives the Restore affordance. |
| `importStaging` | `selectors.persistence.import.staging` | In-memory staged save during import, owned by screen [`70-save-import`](../70-save-import/). Drives the Import entry-point. |
| `lastDestructive` | `state.ui.lastDestructive` | Soft-delete / overwrite undo slot per [`undo-policy.md`](../../../undo-policy.md). Drives the non-modal undo toast while `now() < expiresAt`. Never enters saves or the canonical state hash. |

### Mechanics Mapping
- Slot list reads save manifests first. Loading validates schema
  version, content hashes, pack compatibility, ruleset version, and
  migration availability before hydrating state.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded view logic.

### Animation Contract
- Slot rows slide, selected thumbnail resolves, compatibility seal
  stamps, overwrite/delete actions route through confirmation.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- `interactions.md` covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- `architecture.md` contains screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies schema / config / localization /
  asset / sound / VFX / save / replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug: `save-load`; system group: `system`; curation marker:
  `curated-pass-6`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and bindings match [`mockup.html`](./mockup.html) regions and [`interactions.md` § Actions](./interactions.md#actions). State Bindings expanded to include `recycleRing`, `importStaging`, `lastDestructive` (previously omitted) so the table matches [`data-contracts.md` § Runtime State Selectors](./data-contracts.md#runtime-state-selectors).
- **Schema: ✔** — Selector identifiers (`saveSlotManifests`, `autosaveSlots`, `selectedSaveCompatibility`, `overwriteGuard`, `quotaUsage`, `recycle.savedSlots`, `import.staging`) match [`data-contracts.md`](./data-contracts.md). Save IDB store rows for `playerHash`, `playerName`, `playerLabel`, save thumbnail are registered in [`data-inventory.md`](../../../data-inventory.md) under `hr-saves.slots`; UI-only `state.ui.lastDestructive` is out of scope per [`undo-policy.md` § 2](../../../undo-policy.md#2-state-slice).
- **Tasks: ✔** — Owning task [`mvp.08-persistence.03-save-load-ui`](../../../../../tasks/mvp/08-persistence/03-save-load-ui.md) reads this file first; its acceptance criteria match the autosave row, "Manage saves" CTA, and manifest-only read rule asserted above.

## ⚠ Issues

- **Missing bindings added inline.** Previous revision listed 7 of the 10 state bindings consumed by the screen (missing `recycleRing`, `importStaging`, `lastDestructive`). Added rows mirror sibling [`data-contracts.md`](./data-contracts.md) and [`interactions.md`](./interactions.md); no new semantics introduced.
- **`SaveLoadScreen.tsx` ownership note.** Task [`mvp.08-persistence.03-save-load-ui`](../../../../../tasks/mvp/08-persistence/03-save-load-ui.md) is the primary owner; the import-export composer in [`mvp.08-persistence.05-export-import-json`](../../../../../tasks/mvp/08-persistence/05-export-import-json.md) and the undo-toast wiring in [`mvp.08-persistence.27-undo-soft-delete`](../../../../../tasks/mvp/08-persistence/27-undo-soft-delete.md) are additive extensions per their `Owned Paths (shared)` declarations. Recorded here so future audits do not flag the multi-task touch surface as a contract violation.
