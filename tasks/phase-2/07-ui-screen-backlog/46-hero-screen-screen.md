# Hero Screen Screen

Module: [UI Screen Backlog (P2)](../07-ui-screen-backlog.md)

Description:
Implement the full Hero Screen screen package. Existing component or polish tasks may cover part of this surface; this task owns the complete screen-level route, modal lifecycle, selectors, commands, localization keys, and asset bindings.

Read First:
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`
- `docs/architecture/wiki/screens/46-hero-screen/interactions.md`
- `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`
- `docs/architecture/wiki/screens/46-hero-screen/architecture.md`
- `docs/architecture/wiki/screens/46-hero-screen/mockup.html`

Inputs:
- Screen package `docs/architecture/wiki/screens/46-hero-screen/`
- Existing partial UI components and store selectors from dependencies
- Runtime registries, localization keys, and asset IDs listed in the screen data contracts

Outputs:
- `src/ui/screens/HeroScreen.tsx`
- Screen route or modal registration from the owning shell
- Integration with existing partial components without duplicating their owned files

Owned Paths:
- `src/ui/screens/HeroScreen.tsx`

Dependencies:
- mvp.07-ui-shell.05-hero-info-panel
- phase-2.01-spells-artifacts.00-hero-leveling
- phase-2.01-spells-artifacts.01a-hero-skill-assignment

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/46-hero-screen/mockup.html`, `docs/architecture/wiki/screens/46-hero-screen/interactions.md`, and `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`
- Existing partial components remain reusable children; this screen task owns orchestration, navigation, and missing controls
- Every command listed in `docs/architecture/wiki/screens/46-hero-screen/interactions.md` is resolved through `docs/architecture/screen-command-coverage.json`:
  schema-backed commands dispatch through the shared command hook, aliases map to their canonical command kind, UI-local tokens stay in route/draft state, and out-of-scope tokens render disabled with a localized not-yet-implemented reason that cites the owning task
- The task does not add engine reducer behavior for an out-of-scope token; any temporary command stub must return `ValidationError("STUB")` and be documented in the coverage map follow-up
- Missing presentation assets use resolver fallback; missing gameplay records fail before controls become enabled
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
