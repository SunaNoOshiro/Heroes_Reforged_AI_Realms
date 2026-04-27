# Editor Integration Test

Status: planned

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
End-to-end test: create a custom unit in the editor, export it, import it as a content pack, and verify it loads and plays correctly in a battle.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- All tasks in this module
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/__tests__/editor-e2e.test.ts` (or Playwright test)
- Script: Open editor → create "Test Unit" (ATK 20, DEF 10, HP 100, speed 5) → export → load pack → start battle with custom unit

Owned Paths:
- `src/ui/__tests__/editor-e2e.test.ts`

Dependencies:
- phase-2.04-content-editor.01-editor-routing-plus-shell
- phase-2.04-content-editor.02-unit-editor-form
- phase-2.04-content-editor.03-faction-editor-form
- phase-2.04-content-editor.04-schema-validation-with-inline-error-display
- phase-2.04-content-editor.05-live-preview-panel-unit-card
- phase-2.04-content-editor.06-mod-pack-export-import

Acceptance Criteria:
- Custom unit appears in battle with correct stats
- Custom unit's damage formula produces correct results
- Test passes in headless browser (Playwright or jsdom)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
