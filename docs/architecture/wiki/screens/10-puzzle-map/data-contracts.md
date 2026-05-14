# Screen 10: Puzzle Map
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
Only schemas this screen actually reads at render time.

| Schema | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Modal frame, fragment tiles, plaque, buttons, cursors, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title plaque, hint strip, button labels, disabled reasons, error keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `scenario.schema.json` (extended) | Reads the optional `grail` block (`coordinate`, `fragmentCount`) added by [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md). | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `map-object.schema.json` (extended) | Recognizes `category: "obelisk"` map objects whose visit feeds the reveal mask. Enum extension owned by the same upstream task. | [`content-schema/schemas/map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json) |

`ruleset.schema.json`, `artifact.schema.json`, and other gameplay
schemas are **not** read by this screen.

### Runtime State Selectors
| UI Element | Selector / State path | Notes |
| --- | --- | --- |
| `obeliskProgress` | `state.players.active.obelisksVisited` | Visited count and total obelisks; `active` is shorthand for `state.players[state.currentPlayerId]`. |
| `fragmentGrid` | `selectors.grail.revealedPuzzleFragments` | Deterministic fragment mask from `(scenario.grail, obelisksVisited.length)`. |
| `selectedFragment` | `state.ui.puzzleMap.selectedFragment` | Local selected clue tile; transient. |
| `grailRegionHint` | `selectors.grail.visibleRegionHint` | Text / region hint allowed by current reveal progress. |
| `mapJumpTarget` | `selectors.grail.selectedFragmentMapFocus` | Optional camera focus for the revealed clue. |

All four `selectors.grail.*` paths and the `obelisksVisited` field
are exported by [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md).

### Commands And Events
| Token | Action ID | Coverage classification |
| --- | --- | --- |
| `SELECT_PUZZLE_FRAGMENT` | `puzzle.selectFragment` | UI-local (prefix `SELECT_`). Updates `state.ui.puzzleMap.selectedFragment`. |
| `FOCUS_GRAIL_HINT_REGION` | `puzzle.jumpToMap` | UI-local (prefix `FOCUS_`). Routes to `07-adventure-map` and pans camera to `selectors.grail.selectedFragmentMapFocus`. |
| `CLOSE_PUZZLE_MAP` | `puzzle.close` | UI-local (prefix `CLOSE_`). Returns to previous adventure context. |

None of these tokens enter the deterministic command log. They are
gated by the `localUiPrefixes` policy in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(checked by `npm run validate:commands`) and therefore do not require
a row in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.puzzle-map.title` (formats `Puzzle Map - Obelisks {visited} / {total}`)
- `ui.puzzle-map.actions.jump`, `ui.puzzle-map.actions.close`
- `ui.puzzle-map.status.hint`, `ui.puzzle-map.status.hidden`
- `ui.puzzle-map.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.puzzle-map.background`, `ui.puzzle-map.frame`
- `ui.puzzle-map.icons.fragment.hidden`,
  `ui.puzzle-map.icons.fragment.revealed`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.puzzle-map.parchment-open`, `vfx.puzzle-map.shimmer`,
  `vfx.puzzle-map.clue-pulse`

### Save And Replay Fields
- Persist only reducer-approved gameplay state. `obelisksVisited` is
  part of `AdventureState.players[]` and therefore included in the
  save payload owned by `mvp.08-persistence.*`.
- Do **not** persist `state.ui.puzzleMap.selectedFragment`, hover,
  focus, tooltip, scroll, animation frame, or any transient visual
  effect.
- Replays use stable IDs and scalar inputs (object IDs for obelisks);
  never raw paths, localized labels, rendered positions, or
  wall-clock timestamps.

### Validation And Fallback
- Revealed tiles are derived from visited obelisk count and scenario
  grail metadata. Clicking a revealed tile only changes local focus
  unless a map jump is explicitly requested.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (e.g. scenario has no `grail` block),
  invalid commands, and unresolved content IDs fail loudly before
  controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Asset, localization, and VFX IDs cover every visible
  region in `mockup.html` (modal frame, fragment grid, plaque, hint
  strip, buttons). Sibling [`spec.md`](./spec.md) state bindings
  match this table row-for-row.
- **Schema: ⚠** — The `grail` block on
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json)
  and the `"obelisk"` value on `map-object.schema.json#category` are
  scheduled additions, not yet in `main` (owning task
  [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md)
  is `planned` per
  [`tasks/task-status.json`](../../../../../tasks/task-status.json)).
  Not CI-blocking — the doc correctly documents what the screen will
  consume; flagged so the implementer knows the schema cross-refs
  resolve only after task 22 lands.
- **Tasks: ✔** — Commands cleared via UI-local prefix coverage in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  owning task
  [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md)
  reads this file first.

## ⚠ Issues

- **`state.ui.puzzleMap.selectedFragment` not registered in
  `data-inventory.md`.** Transient UI slice; persistence contract
  ("every persisted field is registered" — see
  [`data-inventory.md`](../../../data-inventory.md)) does not require
  a row. Already flagged from sibling [`spec.md`](./spec.md) — see
  that file's `## ⚠ Issues`. No new action; if the slice ever
  becomes session-persistent, the owning task
  [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md)
  must add the row. Skill did not edit `data-inventory.md` (Hard
  Prohibition D).
