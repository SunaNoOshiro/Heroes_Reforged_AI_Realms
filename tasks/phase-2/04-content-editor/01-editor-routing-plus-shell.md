# Editor Routing + Shell

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Add an "Editor" section to the app, accessible from the main menu.
Provides navigation between Unit, Spell, Artifact, Building, Faction,
World, and Scenario editors.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- React router (`react-router-dom`)
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/editor/EditorShell.tsx`
- Left sidebar: navigation between editor sections
- Breadcrumb header showing current entity
- "New" button per section, "Duplicate" to clone an existing entry

Owned Paths:
- `src/ui/editor/EditorShell.tsx`

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay

Acceptance Criteria:
- Navigating to `/editor/units` shows unit list
- "New Unit" creates a blank unit form
- Navigating away with unsaved changes shows confirmation dialog
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
