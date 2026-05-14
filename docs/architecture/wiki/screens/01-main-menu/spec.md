# Screen 01: Main Menu — Spec

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

## Description
Boot shell menu. Full-bleed fantasy painting, title treatment, and
icon-backed command buttons. **No deterministic gameplay state is
created on this screen.**

## Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## Visual Contract
- Curation status: `anchor-v1`.
- Full-screen illustrated backdrop, ornate gold border, oversized
  game title at upper-left, vertical icon-backed command buttons on
  the right, version label and privacy footer at the bottom.
- Dense classic-fantasy strategy UI: fixed `800 × 600` viewport,
  ornate gold frame, red / brown / stone panels, compact icon slots.
- [`mockup.html`](./mockup.html) contains **visible UI only**. Logic,
  transitions, and implementation notes live in the markdown package.

## Component Tree
- `MainMenuShell`
  - `BackdropPainting`
  - `LogoTitle`
  - `CommandStack`
  - `VersionLabel`
  - `PrivacyFooter`
  - `RouteFadeOverlay`

## State Bindings

All three bindings are runtime-only; the authoritative selector drives
the bound handle.

| Binding handle | Selector | Notes |
| --- | --- | --- |
| `menu.commands` | `state.shell.availableCommands` | Controls enabled by shell mode and platform capabilities. |
| `lastSaveAvailable` | `state.persistence.hasLoadableSave` | `Load Game` is disabled when no compatible save manifest exists. |
| `quitGuard` | `state.shell.quitRequiresConfirmation` | `Quit` opens the confirmation dialog instead of closing immediately when `true`. |

## Mechanics Mapping
- Routes only into `02-new-game-setup`, `55-save-load`,
  `57-high-scores`, `05-intro-cinematic`, or `60-confirmation-dialog`.
  No deterministic gameplay state is created here.
- UI previews stay **local** until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded view logic.

## Animation Contract
- Standard menu feedback (storm / cloud shimmer, title glint, hover
  glow, button press, route fade) is owned by
  [`interactions.md` § Animation](./interactions.md#animation).
- Animation **consumes** reducer or route results; it never decides
  gameplay outcomes.
- Under `config.ui.reducedMotion === true`, motion is replaced by
  static highlights; visible state changes are preserved with
  localized feedback.

## Acceptance Criteria
- [`mockup.html`](./mockup.html) is visually distinct from other
  screens and follows the visual direction above.
- This spec lists every visible region and authoritative state
  binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case, and
  error path.
- [`architecture.md`](./architecture.md) contains screen-specific
  diagrams — not copied archetype diagrams.
- [`data-contracts.md`](./data-contracts.md) identifies every
  schema / config / localization / asset / audio / VFX / save / replay
  field required to implement the screen.

## AI Implementation Notes
- Screen slug `main-menu`; system group `menus`; curation marker
  `anchor-v1`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree matches [`mockup.html`](./mockup.html) (`BackdropPainting`, `LogoTitle`, `CommandStack`, `VersionLabel`, `PrivacyFooter`, `RouteFadeOverlay`) and sibling [`architecture.md` § Visual Composition](./architecture.md#visual-composition) (reconciled this pass — see sibling Issues).
- **Schema: ✔** — No schema enums declared inline. State paths (`state.shell.availableCommands`, `state.persistence.hasLoadableSave`, `state.shell.quitRequiresConfirmation`) are runtime selectors (not persisted), so no row required in [`data-inventory.md`](../../../data-inventory.md).
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.07-main-menu-screen`](../../../../../tasks/mvp/07-ui-shell/07-main-menu-screen.md) reads this spec and its three siblings; the privacy footer is additively owned by [`mvp.07-ui-shell.25-privacy-footer-and-disclosure-modal`](../../../../../tasks/mvp/07-ui-shell/25-privacy-footer-and-disclosure-modal.md).

## ⚠ Issues

_None._
