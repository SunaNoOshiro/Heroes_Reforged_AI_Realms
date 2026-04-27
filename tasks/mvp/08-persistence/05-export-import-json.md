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

Inputs:
- Save format (Task 2)
- Screen package `docs/architecture/wiki/screens/55-save-load/`

Outputs:
- `src/persistence/export-import.ts`
- `exportSave(saveId: string): Promise<void>` — triggers file download as `save-name.hrsa.json`
- `importSave(file: File): Promise<SaveRecord>` — reads file, validates schema, adds to IndexedDB
- `src/ui/components/SaveLoadImportExportControls.tsx` — adds "Export"
  and "Import" controls consumed by the save/load screen

Owned Paths:
- `src/persistence/export-import.ts`
- `save-name.hrsa.json`
- `src/ui/components/SaveLoadImportExportControls.tsx`

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.08-persistence.02-log-only-save-format
- mvp.08-persistence.03-save-load-ui

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

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
