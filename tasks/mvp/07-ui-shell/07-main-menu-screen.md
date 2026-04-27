# Main Menu Screen

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Implement the application's first interactive surface. Routes the
player into New Game setup, Load, High Scores, Credits or intro, and
Quit confirmation. No deterministic gameplay state is created here.

Read First:
- `docs/architecture/wiki/screens/01-main-menu/spec.md`
- `docs/architecture/wiki/screens/01-main-menu/interactions.md`
- `docs/architecture/wiki/screens/01-main-menu/data-contracts.md`
- `docs/architecture/wiki/screens/01-main-menu/architecture.md`
- `docs/architecture/wiki/screens/01-main-menu/mockup.html`
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Screen package `docs/architecture/wiki/screens/01-main-menu/`
- Zustand shell-state slice from Task 2
- Persistence availability selector `state.persistence.hasLoadableSave`

Outputs:
- `src/ui/screens/MainMenu.tsx`
- Routes wired for: `OPEN_NEW_GAME_SETUP`, `OPEN_LOAD_GAME`,
  `OPEN_HIGH_SCORES`, `OPEN_CREDITS_OR_INTRO`, and
  `REQUEST_QUIT_CONFIRMATION`
- All localization keys from data-contracts
  (`ui.main-menu.*`, `ui.common.ok|cancel|back|close`) read through a
  `t()` helper

Owned Paths:
- `src/ui/screens/MainMenu.tsx`

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay
- mvp.07-ui-shell.02-zustand-store

Acceptance Criteria:
- Layout matches `docs/architecture/wiki/screens/01-main-menu/mockup.html`
- Load is disabled when `state.persistence.hasLoadableSave` is false
- Quit dispatches `REQUEST_QUIT_CONFIRMATION` when
  `state.shell.quitRequiresConfirmation` is true
- Every command listed in `docs/architecture/wiki/screens/01-main-menu/interactions.md` has a handler
- No gameplay state is created until New Game completes setup
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
