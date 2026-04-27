# Unit Editor Form

Status: planned

Module: [Content Editor (M4)](../04-content-editor.md)

Description:
Form for editing all fields of a Unit. The most complex editor since units have nested stats, ability lists, and cost maps.

Read First:
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- Unit schema, current unit data
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/editor/UnitEditor.tsx`
- Fields: all `Unit` schema fields as form controls
- Stats section: numeric inputs for HP, ATK, DEF, SPD, shots, dmgMin, dmgMax
- Cost section: resource cost inputs (7 resources)
- Abilities section: multi-select of available ability IDs with description tooltips
- Presentation bindings: text inputs for sprite/portrait/icon/animation asset IDs (no upload for MVP)
- Upgrade link: dropdown to select upgraded unit ID

Owned Paths:
- `src/ui/editor/UnitEditor.tsx`

Dependencies:
- phase-2.04-content-editor.01-editor-routing-plus-shell
- mvp.02-content-schemas.01-unit-schema

Acceptance Criteria:
- Editing HP value updates the form state immediately
- Setting `dmgMin > dmgMax` shows an inline warning
- All Emberwild reference units can be loaded into the editor and re-saved without data loss
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
