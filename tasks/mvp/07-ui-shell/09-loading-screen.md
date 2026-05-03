# Loading Screen

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Implement the loading screen used while content packs, scenario data,
and renderer assets are resolved. Loading progress is presentation
state only. Gameplay starts after all required content IDs validate.

Read First:
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- `docs/architecture/wiki/screens/59-loading-screen/spec.md`
- `docs/architecture/wiki/screens/59-loading-screen/interactions.md`
- `docs/architecture/wiki/screens/59-loading-screen/data-contracts.md`
- `docs/architecture/wiki/screens/59-loading-screen/architecture.md`
- `docs/architecture/wiki/screens/59-loading-screen/mockup.html`
- [`docs/architecture/diagrams/04-map-loading.md`](../../../docs/architecture/diagrams/04-map-loading.md)
- [`docs/architecture/diagrams/17-cache-strategy.md`](../../../docs/architecture/diagrams/17-cache-strategy.md)

Inputs:
- Screen package `docs/architecture/wiki/screens/59-loading-screen/`
- New-game setup request from Task 8
- Async asset loader from `mvp.02b-asset-pipeline.05-async-asset-loader-with-caching`

Outputs:
- `src/ui/screens/LoadingScreen.tsx`
- Progress model for content, assets, save replay, and renderer warmup
- Error state that routes back to setup with a clear failure reason

Owned Paths:
- `src/ui/screens/LoadingScreen.tsx`

Dependencies:
- mvp.07-ui-shell.08-new-game-setup-screen
- mvp.02b-asset-pipeline.05-async-asset-loader-with-caching

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/59-loading-screen/mockup.html`, `docs/architecture/wiki/screens/59-loading-screen/interactions.md`, and `docs/architecture/wiki/screens/59-loading-screen/data-contracts.md`
- Missing presentation assets may fall back; missing gameplay content
  fails before the adventure map opens
- Progress updates do not read wall-clock time inside deterministic
  engine code
- Successful load routes into the adventure map with initialized UI
  state
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
