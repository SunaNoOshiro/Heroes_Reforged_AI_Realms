# Screen 01: Main Menu — Data Contracts

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`interactions.md`](./interactions.md) — per-control behavior.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Content Schemas & Registries

| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Backdrop, frame, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by command handlers. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |

## 2. Runtime State Selectors

All three slices are runtime-only (not persisted). Local hover, focus,
drag ghost, and animation frame stay outside deterministic state.

| Binding handle | Selector | Notes |
| --- | --- | --- |
| `menu.commands` | `state.shell.availableCommands` | Controls enabled by shell mode and platform capabilities. |
| `lastSaveAvailable` | `state.persistence.hasLoadableSave` | `LOAD_GAME` disabled when no compatible save manifest exists. |
| `quitGuard` | `state.shell.quitRequiresConfirmation` | `QUIT` opens confirmation instead of closing immediately when `true`. |

## 3. Commands & Events

All tokens below are local-ui routing tokens. They use prefixes
(`OPEN_`, `REQUEST_`) listed in
[`screen-command-coverage.json`](../../../screen-command-coverage.json#localUiPrefixes)
and **do not enter the deterministic command log**.
`OPEN_PRIVACY_POLICY` is explicitly registered in
[`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md).

| Trigger | Token | Effect |
| --- | --- | --- |
| `mainMenu.newGame` | `OPEN_NEW_GAME_SETUP` | Routes to setup; creates local setup draft only. |
| `mainMenu.loadGame` | `OPEN_LOAD_GAME` | Routes to save/load; reads manifests, does not load until a slot is confirmed. |
| `mainMenu.highScore` | `OPEN_HIGH_SCORES` | Routes to read-only high-scores. |
| `mainMenu.credits` | `OPEN_CREDITS_OR_INTRO` | Routes to presentation-only cinematic shell. |
| `mainMenu.quit` | `REQUEST_QUIT_CONFIRMATION` | Opens confirmation dialog. No gameplay mutation. |
| `mainMenu.privacy` | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). |

## 4. Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys
- `ui.main-menu.title`
- `ui.main-menu.actions.*`
- `ui.main-menu.status.*`
- `ui.main-menu.errors.*`
- `ui.main-menu.footer.privacy`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Audio & VFX IDs
- `ui.main-menu.background`
- `ui.main-menu.frame`
- `ui.main-menu.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.main-menu.*`

## 7. Save & Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, scalar command inputs, and explicit draft records
  named by the owning system.
- **Never persist**: hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## 8. Validation & Fallback
- Routes only into `02-new-game-setup`, `55-save-load`,
  `57-high-scores`, `05-intro-cinematic`, or `60-confirmation-dialog`.
  No deterministic gameplay state is created on this screen.
- **Presentation** may fall back through the asset resolver.
- **Gameplay records, invalid commands, and unresolved content IDs
  fail loudly before controls become enabled**, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Token list, state selectors, and footer entry match sibling [`interactions.md` § Actions](./interactions.md#actions) and [`spec.md` § State Bindings](./spec.md#state-bindings); footer link target matches [`mockup.html`](./mockup.html) (`data-action="mainMenu.privacy"`).
- **Schema: ✔** — `asset-index.schema.json`, `localization.schema.json`, and `ruleset.schema.json` exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/). No enum values are inlined here, so no enum drift surface.
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.07-main-menu-screen`](../../../../../tasks/mvp/07-ui-shell/07-main-menu-screen.md) cites all six tokens and the `ui.main-menu.*` localization keys; the additive footer is owned by [`mvp.07-ui-shell.25-privacy-footer-and-disclosure-modal`](../../../../../tasks/mvp/07-ui-shell/25-privacy-footer-and-disclosure-modal.md).

## ⚠ Issues

_None._
