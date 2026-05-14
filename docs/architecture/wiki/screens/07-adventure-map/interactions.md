# Screen 07: Adventure Map — Interaction Map

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Purpose
Primary strategic map. Hosts the tile viewport, fog of war, hero
path preview, object interaction, minimap, hero / army sidebar,
resource bar, and date strip.

## 2. Actions

Three tokens are **local-ui** (prefixes `SELECT_`, `PREVIEW_`,
`OPEN_` per
[`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json)).
Two tokens are aliases resolved by
[`screen-command-coverage.json#commandAliases`](../../../screen-command-coverage.json):
`MOVE_HERO_ALONG_PATH` → [`MOVE_HERO`](../../../command-schema.md#move_hero),
`END_PLAYER_TURN` → [`END_DAY`](../../../command-schema.md#end_day).

Every row resolves into the shared § 3 Animation pool; per-action
subsetting is left to the owning UI task — see `## ⚠ Issues`.

| UI element | Action ID | Type | Next screen | Token | Data updated |
| --- | --- | --- | --- | --- | --- |
| Select hero | `adventure.selectHero` | local-ui | _(current)_ | `SELECT_ADVENTURE_HERO` | Updates selected hero draft and side panel. |
| Preview path | `adventure.previewPath` | local-ui | _(current)_ | `PREVIEW_HERO_PATH` | Computes visible route without spending movement. |
| Move hero | `adventure.moveHero` | command | _(current)_ or object dialog | `MOVE_HERO_ALONG_PATH` → `MOVE_HERO` | Consumes movement, reveals fog, may trigger object visit. |
| Open town | `adventure.openTown` | navigation | [`24-town-screen`](../24-town-screen/) | `OPEN_TOWN_SCREEN` | Routes if the selected town is owned and visible. |
| Cast adventure spell | `adventure.castSpell` | navigation | [`17-adventure-spell-targeting`](../17-adventure-spell-targeting/) | `OPEN_ADVENTURE_SPELL_TARGETING` | Creates spell-targeting UI draft. |
| End turn | `adventure.endTurn` | command | _(current)_ or AI-turn indicator | `END_PLAYER_TURN` → `END_DAY` | Commits turn transition and calendar updates. |

## 3. Animation
Pool of screen-wide animations that the rows above pick from:

- **A1.** Dotted path marches across the viewport.
- **A2.** Hero steps tile-by-tile after reducer acceptance.
- **A3.** Fog peels from newly revealed tiles.
- **A4.** Minimap viewport box tracks the camera.
- **A5.** Status messages scroll in the bottom strip.

Under `config.ui.reducedMotion === true`, motion is replaced by
static highlights; visible state changes are preserved.

## 4. State Changes
Authoritative selectors refresh their bound handles whenever the
owning reducer or local UI draft changes:

- `state.adventure.visibleTiles` → `map.tiles`.
- `state.adventure.selectedHeroId` → `selectedHero`.
- `state.ui.adventure.pathPreview` → `pathPreview` (non-replayed,
  non-hashed; clears when `MOVE_HERO` resolves per
  [`ui-frame-lag-contract.md` § 2](../../../ui-frame-lag-contract.md#2-optimistic-ui)).
- `state.players.active.resources` → `resources`.
- `state.calendar.currentDate` → `date`.

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay
state.

## 5. Navigation Outcomes
Each routed action transitions **only after** guard approval and
the exit animation completes:

- `Move hero` → _(current)_ or object dialog after the reducer
  accepts `MOVE_HERO` and any arrival object triggers (mine
  capture, town enter, battle initiation).
- `Open town` → [`24-town-screen`](../24-town-screen/).
- `Cast adventure spell` → [`17-adventure-spell-targeting`](../17-adventure-spell-targeting/).
- `End turn` → _(current)_ or AI-turn indicator after `END_DAY`
  resolves.

## 6. Disabled & Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands
  **fail loudly** per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the current screen open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Error toast strings are produced by `formatUserError(err, locale)`
  per [`error-formatter.md`](../../../error-formatter.md). **Never
  construct error text inline.**
- **End-day debounce.** End-turn buttons and hotkeys are debounced
  **250 ms** (trailing edge). Dispatcher single-flight on
  `(playerId, END_DAY)` is the safety net; the second arrival within
  the same tick returns `DUPLICATE_INTENT`. See
  [`command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).

## 7. Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Move hero (`MOVE_HERO_ALONG_PATH` → `MOVE_HERO`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |
| End turn (`END_PLAYER_TURN` → `END_DAY`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

## 8. AI Implementation Notes
- This file owns **behavior, timing, and command routing**.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams **mirror** these
  interactions; they must not introduce new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action rows match sibling [`spec.md` § 5 State Bindings](./spec.md#5-state-bindings) and the `data-action` hooks in [`mockup.html`](./mockup.html) (`adventure.openTown`, `adventure.castSpell`, `adventure.endTurn`). Three additional mockup buttons (`adventure.kingdom`, `adventure.questLog`, `adventure.sleep`) are absent from this table; flagged in `## ⚠ Issues` rather than invented here.
- **Schema: ✔** — `SELECT_ADVENTURE_HERO`, `PREVIEW_HERO_PATH`, `OPEN_TOWN_SCREEN`, and `OPEN_ADVENTURE_SPELL_TARGETING` resolve through [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) (`SELECT_`, `PREVIEW_`, `OPEN_`). `MOVE_HERO_ALONG_PATH` → [`MOVE_HERO`](../../../command-schema.md#move_hero) and `END_PLAYER_TURN` → [`END_DAY`](../../../command-schema.md#end_day) match [`screen-command-coverage.json#commandAliases`](../../../screen-command-coverage.json). Both canonical kinds are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json). `END_DAY` is also listed as a single-flight kind in [`command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).
- **Tasks: ✔** — Owning UI tasks ([`mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay`](../../../../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md), `02-zustand-store`, `03-hud-resource-bar-end-turn-button-mini-map-stub`, `06-command-hook-ui-dispatch-re-render`) read this file via the screen-package block in their `Read First`. Runtime owners: `mvp.05-adventure-map.03-hero-movement` for `MOVE_HERO`; `mvp.05-adventure-map.02-turn-structure` for `END_HERO_TURN` / `END_DAY`.

## ⚠ Issues

- **Mockup carries three buttons not enumerated in this table.** [`mockup.html`](./mockup.html) wires `data-action="adventure.kingdom"`, `data-action="adventure.questLog"`, and `data-action="adventure.sleep"`. Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md) (the four screen-package `.md` files describe the screen for the mockup), the next pass should add three rows: `adventure.kingdom` (`navigation` to [`08-kingdom-overview`](../08-kingdom-overview/) — Phase-2; render disabled with a localized reason citing [`phase-2.07-ui-screen-backlog.08-kingdom-overview-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md)), `adventure.questLog` (`navigation` to [`11-quest-log`](../11-quest-log/) — Phase-2; render disabled with a localized reason citing [`phase-2.07-ui-screen-backlog.11-quest-log-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/11-quest-log-screen.md)), `adventure.sleep` (`local-ui` toggle, under the `SET_` local-ui prefix per [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json)). Cross-flagged with [`spec.md ## ⚠ Issues`](./spec.md#-issues). Skill did not invent rows in this file (Hard Prohibition B — never invent features).
- **Mockup status line implies right-click and double-click semantics.** [`mockup.html`](./mockup.html) prints "A mounted hero waits. Right-click objects for details; double-click path to move." in the status strip, but this file does not name a right-click `data-action` (object-details preview) or a double-click → `MOVE_HERO_ALONG_PATH` shortcut. Per [`ui-input-arbitration.md`](../../../ui-input-arbitration.md) (single emit per gesture) the next pass should either (a) name these gestures explicitly as additional Actions rows wired to `PREVIEW_OBJECT_DETAILS` (local-ui) and `MOVE_HERO_ALONG_PATH` respectively, or (b) drop the status-line copy from the mockup. Skill did not edit the mockup or invent rows here. Cross-flagged with [`spec.md ## ⚠ Issues`](./spec.md#-issues).
- **Per-action animation subsetting deferred.** The previous version of this file repeated the same blob ("Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll") in the Animation column for every row, which is doc-fill. The audit moved the five effects into a numbered pool (A1–A5) in § 3 Animation but left per-action assignment for the owning UI task to verify — picking subsets per action was an interpretation, not in the original, so the table now omits the column. Cross-flagged with [`spec.md ## ⚠ Issues`](./spec.md#-issues) for the same reason; suggested mapping for the next pass: Select hero → A5, Preview path → A1 / A4, Move hero → A1–A5, Open town → A5, Cast spell → A5, End turn → A5.
