# AI-Content Badge On Info Cards

Status: planned

Module: [UI Shell](../07-ui-shell.md)

Description:
Add an `[AI]` badge to hero / unit / faction / scenario info-card
screen packages whenever the owning pack declares
`manifest.aiProvenance.present === true`. Clicking the badge
dispatches `OPEN_AI_PROVENANCE` and routes to screen 74
(`ai-provenance-detail`).

Read First:
- [`docs/architecture/wiki/screens/74-ai-provenance-detail/spec.md`](../../../docs/architecture/wiki/screens/74-ai-provenance-detail/spec.md)
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)

Inputs:
- `manifest.aiProvenance.present` per pack id.
- Existing info-card screens: hero, unit, creature-info,
  faction selectors.

Outputs:
- `src/ui/badges/ai-badge.tsx`
- `src/ui/badges/__tests__/ai-badge.test.tsx`
- Edits to `src/ui/info-cards/*` to host the badge.

Owned Paths:
- `src/ui/badges/ai-badge.tsx`
- `src/ui/badges/__tests__/ai-badge.test.tsx`

Owned Paths (shared):
- `src/ui/info-cards/` (existing info-card components extend with
  the badge slot)

Dependencies:
- mvp.02-content-schemas.38-manifest-ai-provenance-and-capabilities-default

Acceptance Criteria:
- Badge renders only when `aiProvenance.present === true`.
- Badge click dispatches `OPEN_AI_PROVENANCE` with the target pack
  id.
- Badge does not render when the owning pack lacks the
  `aiProvenance` block (canonical packs).
- Localization key under `ui.ugc.warning.ai-content`.
- `docs/architecture/wiki/screens/74-ai-provenance-detail/`
  receives the click target via `OPEN_AI_PROVENANCE`.

Owned Paths (shared) acceptance:
- `src/ui/info-cards/` is **owned by** the existing info-card
  screen tasks (hero, unit, creature-info); this task is additive
  (adds the AI badge slot only) and must not rewrite their visual
  contract or component trees.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
