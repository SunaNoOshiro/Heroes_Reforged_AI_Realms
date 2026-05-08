# Mod Pack Export / Import

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Export the currently edited content (units, faction, buildings, worlds)
as a content pack JSON file. Import an existing pack to continue editing.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- Editor state, `ContentPack` format
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/editor/ExportPanel.tsx`
- Export: bundles all edited entities into a `ContentPack` JSON → triggers file download
- Import: reads a `.json` file, loads into editor (validates first)
- Mod pack includes: `{ manifest: { id, version, author }, units[], faction, buildings[], spells[] }`

Owned Paths:
- `src/ui/editor/ExportPanel.tsx`
- `.json`

Dependencies:
- phase-2.04-content-editor.04-schema-validation-with-inline-error-display
- mvp.08-persistence.05-export-import-json

Acceptance Criteria:
- Exported file is a valid `ContentPack` JSON that passes `loadContentPack()`
- Importing a pack populates all editor forms with the pack's data
- Importing a pack with validation errors shows which entities failed and why
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
