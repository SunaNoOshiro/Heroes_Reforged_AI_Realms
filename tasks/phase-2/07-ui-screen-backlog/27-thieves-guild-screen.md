# Thieves Guild Screen

Status: planned

Module: [UI Screen Backlog (P2)](../07-ui-screen-backlog.md)

Description:
Implement the Thieves Guild screen package as a focused UI surface. Treat the screen package as canonical for layout, selectors, commands, localization keys, and asset IDs. Gameplay records remain ID-based; presentation resolves through registries.

Read First:
- `docs/architecture/wiki/screens/27-thieves-guild/spec.md`
- `docs/architecture/wiki/screens/27-thieves-guild/interactions.md`
- `docs/architecture/wiki/screens/27-thieves-guild/data-contracts.md`
- `docs/architecture/wiki/screens/27-thieves-guild/architecture.md`
- `docs/architecture/wiki/screens/27-thieves-guild/mockup.html`

Inputs:
- Screen package `docs/architecture/wiki/screens/27-thieves-guild/`
- UI app shell, Zustand store, and command dispatch hook
- Runtime selectors, registries, localization keys, and asset IDs listed in the screen data contracts

Outputs:
- `src/ui/screens/ThievesGuild.tsx`
- Screen route or modal registration from the owning shell
- Local UI draft state only where the screen package marks an interaction as local-ui

Owned Paths:
- `src/ui/screens/ThievesGuild.tsx`

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay
- mvp.07-ui-shell.02-zustand-store
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render
- mvp.07-ui-shell.04-town-screen-modal
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/27-thieves-guild/mockup.html`, `docs/architecture/wiki/screens/27-thieves-guild/interactions.md`, and `docs/architecture/wiki/screens/27-thieves-guild/data-contracts.md`
- Every command listed in `docs/architecture/wiki/screens/27-thieves-guild/interactions.md` is resolved through `docs/architecture/screen-command-coverage.json`:
  schema-backed commands dispatch through the shared command hook, aliases map to their canonical command kind, UI-local tokens stay in route/draft state, and out-of-scope tokens render disabled with a localized not-yet-implemented reason that cites the owning task
- The task does not add engine reducer behavior for an out-of-scope token; any temporary command stub must return `ValidationError("STUB")` and be documented in the coverage map follow-up
- Every selector listed in `docs/architecture/wiki/screens/27-thieves-guild/data-contracts.md` is read through the store or a boundary adapter, not by reaching into sim internals
- Missing presentation assets use resolver fallback; missing gameplay records fail before controls become enabled
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.
- Scope verified against the Deferred Mechanic Inventory in `tasks/README.md`: any baseline-corridor mechanic listed there as folded into a different parent must NOT be implemented as part of this task; if a folded mechanic is reached during implementation, stop and surface a scope question.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
