# Schema Validation with Inline Error Display

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Run Zod validation on every form change (debounced 300ms). Show validation errors inline next to the relevant field, not just a summary at the bottom.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- Zod validators (`02-content-schemas.md` Task 10)
- Form state from Tasks 2–3
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/editor/hooks/useFormValidation.ts`
- `useFormValidation(schema, data): { errors: Map<fieldPath, string>, isValid: boolean }`
- Error display: red border + error text below each invalid field
- "Export" button disabled when `isValid === false`

Owned Paths:
- `src/ui/editor/hooks/useFormValidation.ts`

Dependencies:
- phase-2.04-content-editor.02-unit-editor-form
- phase-2.04-content-editor.03-faction-editor-form

Acceptance Criteria:
- Setting HP to -1 immediately shows "Must be positive" below the HP field
- Setting `faction` to a nonexistent ID shows "Unknown faction ID"
- All errors clear when form becomes valid
- Validation runs even on initial load (to catch stale data)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
