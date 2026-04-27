# HUD — Resource Bar, End-Turn Button, Mini-Map Stub

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
The persistent heads-up display visible during adventure map play. Shows current player resources, current day/week, and an end-turn button.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`
- `docs/architecture/wiki/screens/19-status-bar/spec.md`
- `docs/architecture/wiki/screens/19-status-bar/interactions.md`
- `docs/architecture/wiki/screens/19-status-bar/data-contracts.md`
- `docs/architecture/wiki/screens/19-status-bar/architecture.md`
- `docs/architecture/wiki/screens/19-status-bar/mockup.html`

Inputs:
- Zustand store (Task 2)
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`
- Screen package `docs/architecture/wiki/screens/19-status-bar/`

Outputs:
- `src/ui/components/HUD.tsx`
- Resource bar: shows current amounts for Gold, Wood, Ore, Crystal, Gem, Sulfur, Mercury
- Day/week counter: "Day 3 of Week 1" format
- End-turn button: dispatches the screen alias `END_PLAYER_TURN`, which
  maps to canonical `END_DAY` in
  `docs/architecture/screen-command-coverage.json`; disabled during AI
  turn or battle
- Mini-map area: placeholder `<div>` (full mini-map in Phase 2)
- Turn indicator: shows active player's color/name

Owned Paths:
- `src/ui/components/HUD.tsx`

Dependencies:
- mvp.07-ui-shell.02-zustand-store

Acceptance Criteria:
- Resource counts update immediately after any resource-changing command
- End-turn button is disabled (greyed) during AI turn
- End-turn button does not introduce a non-schema turn command; it routes
  through the existing `END_PLAYER_TURN` alias to `END_DAY`
- Day counter increments correctly
- HUD is visible on both adventure map and battle views
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Layout, bindings, and commands match `docs/architecture/wiki/screens/19-status-bar/mockup.html`, `docs/architecture/wiki/screens/19-status-bar/interactions.md`, and `docs/architecture/wiki/screens/19-status-bar/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.
- Phase-2 visual-fidelity tasks may only restyle this surface. Selectors,
  store reads, and command bindings remain owned by this task and must not
  be changed by `phase-2.06-visual-fidelity.*` work.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
