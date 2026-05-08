# Live Preview Panel — Unit Card

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Sidebar panel that shows a rendered preview of the unit being edited: portrait, stat block, ability icons, and cost breakdown. Updates as the form changes.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- Current form data (possibly invalid), unit schema
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/editor/UnitPreviewCard.tsx`
- Shows: portrait (placeholder if art path is invalid), name, tier badge, all stats, ability list, weekly growth, gold + resource cost
- Gracefully handles missing/invalid art paths (shows placeholder icon)

Owned Paths:
- `src/ui/editor/UnitPreviewCard.tsx`

Dependencies:
- phase-2.04-content-editor.02-unit-editor-form

Acceptance Criteria:
- Card updates within 100ms of any form change
- Invalid art path shows a placeholder image (not a broken img tag)
- Card matches the visual style of in-game unit display
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
