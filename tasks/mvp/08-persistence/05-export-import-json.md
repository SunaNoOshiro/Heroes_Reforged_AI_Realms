# Export / Import JSON

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Allow players to export a save file as a JSON file (for backup to Drive/Dropbox) and import it back. No server required — uses browser File API.

Read First:
- `docs/architecture/wiki/screens/55-save-load/spec.md`
- `docs/architecture/wiki/screens/55-save-load/interactions.md`
- `docs/architecture/wiki/screens/55-save-load/data-contracts.md`
- `docs/architecture/wiki/screens/55-save-load/architecture.md`
- `docs/architecture/wiki/screens/55-save-load/mockup.html`
- `docs/architecture/wiki/screens/70-save-import/spec.md`
- `docs/architecture/pack-trust.md`

Inputs:
- Save format (Task 2)
- Screen package `docs/architecture/wiki/screens/55-save-load/`

Outputs:
- `src/persistence/export-import.ts`
- `exportSave(saveId: string): Promise<void>` — triggers file download as `save-{name}-{date}.hrsa.json`. The full JSON blob is finalized in memory before `URL.createObjectURL` + anchor-click is invoked in a single microtask. Streaming downloads are forbidden for `.hrsa.json` so a tab kill mid-export cannot produce a truncated file the player keeps as their only backup.
- `exportReplay(saveId: string): Promise<void>` — same as `exportSave` but writes a replay envelope projection (`intent: "replay"`, PII stripped, hash-derived id) per [`docs/architecture/replay-format.md`](../../../docs/architecture/replay-format.md). The download filename convention is `replay-{shortHash}.hrsa.json`.
- `importSave(file: File): Promise<SaveRecord>` — reads file, validates schema, runs the migration registry chain, adds to IndexedDB. `intent: "replay"` files route to the Replay viewer rather than the slot list.
- `src/ui/components/SaveLoadImportExportControls.tsx` — adds "Export Save", "Export as Replay", and "Import" controls consumed by the save/load screen

Owned Paths:
- `src/persistence/export-import.ts`
- `save-{name}-{date}.hrsa.json`
- `replay-{shortHash}.hrsa.json`
- `src/ui/components/SaveLoadImportExportControls.tsx`

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.08-persistence.02-log-only-save-format
- mvp.08-persistence.03-save-load-ui
- mvp.08-persistence.10-save-schema-and-validator
- mvp.08-persistence.11-save-import-screen-and-quarantine

Acceptance Criteria:
- Exported file is valid JSON that can be re-imported
- Importing a corrupted file shows a clear error (not a crash)
- Imported save appears in save list and loads correctly
- File name includes save name and date for easy identification
- Save/load UI composes the import/export controls without moving the
  existing `SaveLoadScreen.tsx` ownership from Task 3
- Layout, bindings, and commands match `docs/architecture/wiki/screens/55-save-load/mockup.html`, `docs/architecture/wiki/screens/55-save-load/interactions.md`, and `docs/architecture/wiki/screens/55-save-load/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.
- **Export atomicity:** the entire JSON blob is finalized in memory
  before the download is offered. A unit test that mocks
  `URL.createObjectURL` asserts the blob is fully constructed before
  the anchor click. Streaming download paths must not be used.
- **Replay export PII contract:** `exportReplay(saveId)` produces a
  JSON envelope with `intent: "replay"`, an empty `name`, zeroed
  `createdAt` / `savedAt`, and a deterministic id derived from
  `canonicalContentHash`; the `mp` block is stripped per
  [`docs/architecture/replay-format.md`](../../../docs/architecture/replay-format.md).
- An imported `intent: "replay"` file is routed to the Replay viewer
  and does not appear in the user-save slot list.
- The import path itself is owned by
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](./11-save-import-screen-and-quarantine.md)
  and routes through screen
  [`70-save-import`](../../../docs/architecture/wiki/screens/70-save-import/);
  this task narrows scope to the export side and the validator
  hand-off (Task 10) for re-import shape checks.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
