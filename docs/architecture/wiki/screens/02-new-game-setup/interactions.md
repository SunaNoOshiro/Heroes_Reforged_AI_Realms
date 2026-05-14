# Screen 02: New Game Setup — Interaction Map

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.
- [`architecture.md`](./architecture.md) — screen diagrams.

## Purpose
Scenario setup shell for single scenario, campaign, random map,
multiplayer, difficulty, player color, and starting options. The
screen builds a **local setup draft** and routes into
[`59-loading-screen`](../59-loading-screen/) only when the player
confirms.

## Actions

Three tokens are **local-ui** (prefixes `SET_`, `SELECT_`, `CANCEL_`
per [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json));
they do not enter the deterministic command log. `CREATE_GAME_FROM_SETUP`
is aliased to the canonical [`SCENARIO_LOAD`](../../../command-schema.md#scenario_load)
command and does enter the log. See
[`data-contracts.md` § 3](./data-contracts.md#3-commands--events).

Every row plays the **Standard setup feedback** described in
§ Animation, then a route fade where applicable.

| UI element | Action ID | Type | Next screen | Token | Data updated |
| --- | --- | --- | --- | --- | --- |
| Select mode | `newGame.selectMode` | local-ui | _(current)_ | `SET_NEW_GAME_MODE` | Updates setup draft and visible fields. |
| Select scenario | `newGame.selectScenario` | local-ui | _(current)_ | `SELECT_SCENARIO` | Updates preview and player slots. |
| Start game | `newGame.start` | navigation | `59-loading-screen` | `CREATE_GAME_FROM_SETUP` → `SCENARIO_LOAD` | Validates setup and creates the deterministic initial game request. |
| Back | `newGame.back` | navigation | `01-main-menu` | `CANCEL_NEW_GAME_SETUP` | Discards setup draft. |

## Animation
**Standard setup feedback**: mode tabs depress on press, scenario
preview parchment slides in on selection, player color flags flip on
slot edits, and **Start** fades into loading once validation succeeds.

Under `config.ui.reducedMotion === true`, motion is replaced by static
highlights; visible state changes are preserved.

## State Changes
Authoritative selectors refresh their bound handles whenever the
owning reducer or local UI draft changes:

- `state.ui.newGame.mode` → `setupMode`.
- `selectors.scenarios.availableScenarios` → `scenarioList`.
- `state.ui.newGame.selectedScenarioId` → `selectedScenario`.
- `state.ui.newGame.playerSlots` → `playerSlots`.
- `state.ui.newGame.difficulty` → `difficulty`.

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

## Navigation Outcomes
Each navigation row routes **only after** guard approval and the
exit animation completes:

- `Start game` → `59-loading-screen` (after the setup draft validates
  and `SCENARIO_LOAD` is accepted).
- `Back` → `01-main-menu` (after the local draft is discarded).

## Disabled & Error Cases
- Disable `Start game` until required selectors, registry records,
  player-slot legality, victory / loss conditions, and route guards
  are satisfied.
- Presentation assets may use resolver fallback. Missing gameplay
  records, invalid content IDs, or rejected commands **fail loudly**
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the current screen open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Error toast strings are produced by `formatUserError(err, locale)`
  per [`error-formatter.md`](../../../error-formatter.md). **Never
  construct error text inline.**

## AI Implementation Notes
- This file owns **behavior, timing, and command routing**.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams **mirror** these
  interactions; they must not introduce new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action rows, animation strings, and disabled rules match sibling [`spec.md` § State Bindings](./spec.md#state-bindings) and [`mockup.html`](./mockup.html) (`data-action="newGame.start"`, `data-action="newGame.back"`; mode rows visible in the left panel).
- **Schema: ✔** — `SET_NEW_GAME_MODE`, `SELECT_SCENARIO`, and `CANCEL_NEW_GAME_SETUP` match local-ui prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json); `CREATE_GAME_FROM_SETUP` is aliased to [`SCENARIO_LOAD`](../../../command-schema.md#scenario_load) in `commandAliases` of the same file. No closed-enum drift.
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.08-new-game-setup-screen`](../../../../../tasks/mvp/07-ui-shell/08-new-game-setup-screen.md) reads this file and its siblings; acceptance criteria require the rendered tokens to dispatch live when their engine task is `done` and to render disabled with a localized reason otherwise.

## ⚠ Issues

_None._
