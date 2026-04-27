# Accessibility Pass

Status: planned

Module: [Polish (M7)](../04-polish.md)

Description:
Ensure shared UI accessibility foundations and late-phase interactive
surfaces are playable by users with common accessibility needs:
keyboard navigation, screen reader support for menus, colorblind-safe
palette controls, reduced-motion controls, and non-color-only status
signals.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Shared UI shell components
- Representative late-phase UI surfaces listed in Dependencies
- Screen-package contracts for the dependent UI tasks

Outputs:
- Shared ARIA helpers and labels for common buttons, modals, lists, and
  route controls
- Keyboard navigation: Tab through HUD, menus, and dependent modal
  surfaces; Enter to confirm; Escape to close modals
- Colorblind mode and reduced-motion settings exposed through the
  options surface and consumed by shared UI theme tokens
- Font: minimum 14px in shared UI text; no color-only information in
  shared status components

Owned Paths:
- (none — cross-cutting accessibility pass; see "Files In Scope" below
  for the enumerated touch-set)

### Files In Scope (advisory, not enforced by lint)
- `src/ui/**/*.tsx` — ARIA labels on every interactive element
- `src/ui/shell/keyboard-nav.ts` — Tab/Enter/Escape handlers across HUD
  and modals
- `src/ui/theme/colorblind.ts` — palette + shape/pattern overlay tokens
- `src/ui/locales/**/*.json` — minimum-font-size + non-color-only copy
- `docs/planning/accessibility-pass.md` — WCAG 2.1 AA evidence sheet

Dependencies:
- mvp.07-ui-shell.03-hud-resource-bar-end-turn-button-mini-map-stub
- mvp.07-ui-shell.04-town-screen-modal
- mvp.07-ui-shell.05-hero-info-panel
- mvp.07-ui-shell.07-main-menu-screen
- mvp.07-ui-shell.08-new-game-setup-screen
- mvp.07-ui-shell.09-loading-screen
- phase-2.04-content-editor.07-editor-integration-test
- phase-2.07-ui-screen-backlog.56-options-screen
- phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status
- phase-3.02-ai-generation.07-generation-ui-prompt-preview-download
- phase-3.04-polish.04-tournament-mode-ui

Acceptance Criteria:
- Runs after the direct shared-shell, editor, options, multiplayer,
  generation, and tournament UI dependencies are merged; per-screen
  backlog tasks keep their own screen-package contracts
- Screen reader announces button names and modal titles for the
  dependent shared and late-phase surfaces
- HUD, menus, options, multiplayer lobby, generation UI, and tournament
  UI are keyboard-navigable without a mouse
- Colorblind and reduced-motion settings are available through the
  options screen and pass WCAG 2.1 AA for dependent shared components
- No `aria-hidden` element is focusable

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
