# Publish Disclaimer Flow

Status: planned

Module: [Content Editor (Phase 2)](../04-content-editor.md)

Description:
Wire the Map Editor `Publish…` affordance to screen
[`73-ugc-publish-disclaimer`](../../../docs/architecture/wiki/screens/73-ugc-publish-disclaimer/).
On accept, write a `signed-acks/<contentHash>.json` companion file
into the staged `.hrmod` and dispatch
`EXPORT_SCENARIO_AS_PACK` against the OS file-picker. No network
upload at v1.

Read First:
- [`docs/architecture/wiki/screens/73-ugc-publish-disclaimer/`](../../../docs/architecture/wiki/screens/73-ugc-publish-disclaimer/)
- [`docs/architecture/wiki/screens/65-map-editor/interactions.md`](../../../docs/architecture/wiki/screens/65-map-editor/interactions.md)
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)

Inputs:
- Map Editor scenario draft.
- Active content-policy doc hash (`policyVersion`).

Outputs:
- `src/editor/publish-flow.ts`
- `src/editor/__tests__/publish-flow.test.ts`
- `src/ui/screens/ugc-publish-disclaimer-screen.tsx`

Owned Paths:
- `src/editor/publish-flow.ts`
- `src/editor/__tests__/publish-flow.test.ts`
- `src/ui/screens/ugc-publish-disclaimer-screen.tsx`

Dependencies:
- phase-2.04-content-editor.06-mod-pack-export-import
- mvp.02-content-schemas.32-safe-user-text-helper-and-jsx-lint

Acceptance Criteria:
- `docs/architecture/wiki/screens/65-map-editor/`'s "Publish…"
  affordance routes through
  `docs/architecture/wiki/screens/73-ugc-publish-disclaimer/`
  with the candidate pack pre-filled.
- Both ack checkboxes MUST be true before export enables.
- On accept, the ack file is written into the archive at
  `signed-acks/<contentHash>.json` with timestamp +
  policy-version hash.
- File-picker rejection drops the staged pack but preserves the
  modal open state.
- Tests cover the disabled-export gate, accept path, and
  cancel path.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
