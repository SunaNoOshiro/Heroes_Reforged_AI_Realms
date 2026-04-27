# Command Hook — UI → Dispatch → Re-render

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Wire the UI to the sim via a `useDispatch` hook. Every UI action (button click, hex click, modal interaction) calls `dispatch(command)`, which runs the sim, then pushes the new state snapshot to Zustand.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`

Inputs:
- Command dispatcher (`01-engine-core.md` Task 6)
- Zustand store (Task 2)
- Replay API (`01-engine-core.md` Task 8)
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`

Outputs:
- `src/ui/hooks/useDispatch.ts`
- `useDispatch(): (cmd: Command) => DispatchResult`
- On success: updates `store.gameState` with new state, clears any error toast
- On validation error: shows error toast with the `ValidationError.message`
- Hex click on map → `MOVE_HERO` if hero selected and hex is reachable

Owned Paths:
- `src/ui/hooks/useDispatch.ts`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
- mvp.01-engine-core.04-implement-fixed-point-math-library
- mvp.01-engine-core.05-eslint-rule-ban-math-random-and-floats-in-src-engine

Acceptance Criteria:
- Clicking a reachable hex with hero selected dispatches `MOVE_HERO` and hero moves visually
- Clicking an invalid move target shows error toast and does NOT update game state
- All command dispatches are synchronous from the UI's perspective (no `await` in the hot path)
- Dispatching the `END_PLAYER_TURN` screen alias triggers canonical
  `END_DAY` handling and then AI thinking (async, shows "AI is
  thinking..." indicator)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
