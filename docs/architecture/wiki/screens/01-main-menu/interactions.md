# Screen 01: Main Menu — Interaction Map

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.
- [`architecture.md`](./architecture.md) — screen diagrams.

## Purpose
Boot shell menu. Routes the player into setup, save/load, high
scores, credits, or quit confirmation, and opens the privacy modal.
No deterministic gameplay state is created here.

## Actions

All six tokens are **local-ui** routing tokens (prefixes `OPEN_` and
`REQUEST_` per
[`screen-command-coverage.json`](../../../screen-command-coverage.json));
they do not enter the deterministic command log. See
[`data-contracts.md` § 3](./data-contracts.md#3-commands--events).

Every navigation row plays the **Standard menu feedback** described
in § Animation, then a route fade. The `Privacy` row uses a modal
fade-in instead.

| UI element | Action ID | Type | Next screen / surface | Token | Data updated |
| --- | --- | --- | --- | --- | --- |
| New Game | `mainMenu.newGame` | navigation | `02-new-game-setup` | `OPEN_NEW_GAME_SETUP` | Creates local setup draft only. |
| Load Game | `mainMenu.loadGame` | navigation | `55-save-load` | `OPEN_LOAD_GAME` | Reads save manifests; does not load until a slot is confirmed. |
| High Score | `mainMenu.highScore` | navigation | `57-high-scores` | `OPEN_HIGH_SCORES` | Reads completed-game score records. |
| Credits | `mainMenu.credits` | navigation | `05-intro-cinematic` | `OPEN_CREDITS_OR_INTRO` | Routes to presentation-only cinematic shell. |
| Quit | `mainMenu.quit` | navigation | `60-confirmation-dialog` | `REQUEST_QUIT_CONFIRMATION` | No gameplay mutation. |
| Privacy | `mainMenu.privacy` | local-ui | _(modal)_ | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). |

## Animation
**Standard menu feedback** (used by every navigation row): storm /
cloud shimmer, title glint, hovered command icon glow, pressed
command depresses, route fade after guard approval.

The `Privacy` row plays a **modal fade-in** instead of a route fade.

Under `config.ui.reducedMotion === true`, motion is replaced by
static highlights; visible state changes are preserved.

## State Changes
Authoritative selectors refresh their bound handles whenever the
owning reducer or local UI draft changes:

- `state.shell.availableCommands` → `menu.commands`.
- `state.persistence.hasLoadableSave` → `lastSaveAvailable`.
- `state.shell.quitRequiresConfirmation` → `quitGuard`.

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

## Navigation Outcomes
Each navigation row routes **only after** guard approval and the
exit animation completes (see § Animation):

- New Game → `02-new-game-setup`
- Load Game → `55-save-load`
- High Score → `57-high-scores`
- Credits → `05-intro-cinematic`
- Quit → `60-confirmation-dialog`

## Disabled & Error Cases
- `Load Game` is disabled when `state.persistence.hasLoadableSave`
  is `false`; the disabled reason renders from
  `ui.main-menu.status.*`.
- `Quit` dispatches `REQUEST_QUIT_CONFIRMATION` (instead of closing
  immediately) when `state.shell.quitRequiresConfirmation` is `true`.
- `Privacy` is always enabled.
- Presentation assets may use resolver fallback. Missing gameplay
  records, invalid content IDs, or rejected commands **fail loudly**
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the current screen open, preserve any local
  draft when useful, show localized error text, and play failure
  feedback.
- Error toast strings are produced by
  `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md). **Never
  construct error text inline.**

## AI Implementation Notes
- This file owns **behavior, timing, and command routing**.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams **mirror** these
  interactions; they must not introduce new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Six action rows, animation strings, and disabled rules match sibling [`spec.md`](./spec.md) and [`mockup.html`](./mockup.html) (`data-action` attributes on `mainMenu.newGame`, `mainMenu.loadGame`, `mainMenu.highScore`, `mainMenu.credits`, `mainMenu.quit`, `mainMenu.privacy`).
- **Schema: ✔** — All six tokens are local-ui per [`screen-command-coverage.json`](../../../screen-command-coverage.json#localUiPrefixes); `OPEN_PRIVACY_POLICY` is explicitly registered in [`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md). No closed-enum drift.
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.07-main-menu-screen`](../../../../../tasks/mvp/07-ui-shell/07-main-menu-screen.md) acceptance criteria explicitly bind every command listed here; the privacy footer is additively owned by [`mvp.07-ui-shell.25-privacy-footer-and-disclosure-modal`](../../../../../tasks/mvp/07-ui-shell/25-privacy-footer-and-disclosure-modal.md).

## ⚠ Issues

_None._
