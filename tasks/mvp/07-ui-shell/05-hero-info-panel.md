# Hero Info Panel

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Side panel shown when a hero is selected. Displays primary stats, army composition, and movement points remaining.

Read First:
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`
- `docs/architecture/wiki/screens/46-hero-screen/interactions.md`
- `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`
- `docs/architecture/wiki/screens/46-hero-screen/architecture.md`
- `docs/architecture/wiki/screens/46-hero-screen/mockup.html`

Inputs:
- Zustand store (Task 2)
- Hero data from game state
- Screen package `docs/architecture/wiki/screens/46-hero-screen/`

Outputs:
- `src/ui/components/HeroPanel.tsx`
- Hero portrait + name + level
- Primary stats: ATK, DEF, POW, KNW
- Army list: up to 7 stacks, each showing unit icon + count
- MP bar: current / max movement points
- Skills tab: secondary skills (Basic/Advanced/Expert level badges) — empty for MVP heroes

Owned Paths:
- `src/ui/components/HeroPanel.tsx`

Dependencies:
- mvp.07-ui-shell.02-zustand-store

Acceptance Criteria:
- Panel shows correct hero data when hero is selected
- Panel hides when hero is deselected (click empty map)
- Army list updates after recruiting units into hero army
- MP bar depletes visually as hero moves
- Layout, bindings, and commands match `docs/architecture/wiki/screens/46-hero-screen/mockup.html`, `docs/architecture/wiki/screens/46-hero-screen/interactions.md`, and `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`.
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
- 3 hours
