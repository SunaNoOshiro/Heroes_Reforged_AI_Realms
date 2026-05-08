# Town Screen Modal

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Full-screen modal overlay when a hero visits a town (or player clicks a town). Shows the building list, recruit panel, and mage guild.

Read First:
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- `docs/architecture/wiki/screens/24-town-screen/spec.md`
- `docs/architecture/wiki/screens/24-town-screen/interactions.md`
- `docs/architecture/wiki/screens/24-town-screen/data-contracts.md`
- `docs/architecture/wiki/screens/24-town-screen/architecture.md`
- `docs/architecture/wiki/screens/24-town-screen/mockup.html`

Inputs:
- Zustand store (Task 2)
- Town data from game state
- Emberwild content pack
- Screen package `docs/architecture/wiki/screens/24-town-screen/`

Outputs:
- `src/ui/components/TownScreen.tsx`
- Building list: all buildings, show built (checkmark) / buildable (button) / requires more (greyed)
- Recruit panel: for each available dwelling, show unit portrait + count in stock + recruit button + cost
- Mage guild panel (stub): list available spells by level (Phase 2 will add actual spells)
- Close button returns to adventure map

Owned Paths:
- `src/ui/components/TownScreen.tsx`

Dependencies:
- mvp.07-ui-shell.02-zustand-store
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.05-adventure-map.18-transfer-stack-commands

Acceptance Criteria:
- Clicking "Build" on a valid building dispatches `BUILD_BUILDING` and updates UI
- Clicking "Recruit" on 0-stock unit shows disabled button
- Cost display updates after recruiting (resources decrease)
- Cannot build more than one building per day (button disabled after first build)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/24-town-screen/mockup.html`, `docs/architecture/wiki/screens/24-town-screen/interactions.md`, and `docs/architecture/wiki/screens/24-town-screen/data-contracts.md`.
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
