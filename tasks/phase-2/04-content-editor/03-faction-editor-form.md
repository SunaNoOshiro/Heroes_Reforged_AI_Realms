# Faction Editor Form

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Form for creating a new faction or editing an existing one.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- Faction schema, unit list (for ID picker)
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/editor/FactionEditor.tsx`
- Fields: faction ID, name, alignment, moraleGroup
- Unit slot grid: 7 tiers × 2 (base + upgrade), each a dropdown picking from all known units
- Hero list: add/remove hero IDs
- Building tree: drag-and-drop (or ordered list) of building IDs

Owned Paths:
- `src/ui/editor/FactionEditor.tsx`

Dependencies:
- phase-2.04-content-editor.01-editor-routing-plus-shell
- phase-2.04-content-editor.02-unit-editor-form
- mvp.02-content-schemas.02-faction-schema

Acceptance Criteria:
- Can create a faction with 7 custom unit slots
- Selecting a unit in one slot does not block it from being selected in another
- Saving faction with missing required fields shows validation errors (Task 4)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
