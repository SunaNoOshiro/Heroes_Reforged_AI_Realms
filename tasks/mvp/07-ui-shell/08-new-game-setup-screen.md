# New Game Setup Screen

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Implement the setup flow that creates a local draft for player slot,
faction, hero, map or scenario, difficulty, and seed selection. The
screen routes into loading once the draft is confirmed; it must not
mutate deterministic gameplay state until the scenario loader accepts
the final setup record.

Read First:
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- `docs/architecture/wiki/screens/02-new-game-setup/spec.md`
- `docs/architecture/wiki/screens/02-new-game-setup/interactions.md`
- `docs/architecture/wiki/screens/02-new-game-setup/data-contracts.md`
- `docs/architecture/wiki/screens/02-new-game-setup/architecture.md`
- `docs/architecture/wiki/screens/02-new-game-setup/mockup.html`
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Screen package `docs/architecture/wiki/screens/02-new-game-setup/`
- Main menu route from Task 7
- Scenario list from `mvp.08-persistence.04-scenario-loader`
- Available factions from the content runtime registry

Outputs:
- `src/ui/screens/NewGameSetup.tsx`
- Setup draft type stored in the UI store
- Confirm action that emits a serializable setup request for scenario
  loading

Owned Paths:
- `src/ui/screens/NewGameSetup.tsx`

Dependencies:
- mvp.07-ui-shell.07-main-menu-screen
- mvp.08-persistence.04-scenario-loader

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/02-new-game-setup/mockup.html`, `docs/architecture/wiki/screens/02-new-game-setup/interactions.md`, and `docs/architecture/wiki/screens/02-new-game-setup/data-contracts.md`
- Changing setup options updates only the UI draft
- Confirm is disabled until required setup fields are selected
- Confirm routes to the loading screen and passes a deterministic setup
  request; random seeds are explicit scalar values
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
