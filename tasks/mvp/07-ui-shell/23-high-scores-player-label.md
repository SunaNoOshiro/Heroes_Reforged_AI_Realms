# High Scores Player Label Render

Status: planned

Module: [UI Shell](../07-ui-shell.md)

Description:
Update [`57-high-scores`](../../../docs/architecture/wiki/screens/57-high-scores/)
to render `playerLabel` instead of `playerName` (or `displayName`)
when `state.privacy.options.displayNameMode === "hashed"`. When
`displayNameMode === "clear"` and the score record carries a
`playerName`, render that instead.

Read First:
- [`docs/architecture/wiki/screens/57-high-scores/data-contracts.md`](../../../docs/architecture/wiki/screens/57-high-scores/data-contracts.md)
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

Inputs:
- `state.profile.highScores` rows.
- `state.privacy.options.displayNameMode` toggle.

Outputs:
- `src/ui/high-scores/score-row.tsx`
- `src/ui/high-scores/__tests__/score-row.test.tsx`

Owned Paths:
- `src/ui/high-scores/score-row.tsx`
- `src/ui/high-scores/__tests__/score-row.test.tsx`

Dependencies:
- mvp.07-ui-shell.22-privacy-pane-in-options

Acceptance Criteria:
- `docs/architecture/wiki/screens/57-high-scores/` score rows
  render `playerLabel` by default.
- When `displayNameMode === "clear"` and `playerName` is present,
  the row renders `playerName` instead.
- Tests cover both branches and the missing-label fallback
  ("Anonymous").

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
