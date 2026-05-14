# Screen 10: Puzzle Map
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Obelisk puzzle map view revealing grail-location fragments according
to visited obelisks. All three controls are UI-local; none enter the
deterministic command log.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select fragment (click a tile) | `puzzle.selectFragment` | local-ui | Current screen | `SELECT_PUZZLE_FRAGMENT` | Writes `state.ui.puzzleMap.selectedFragment`; hidden tiles are click-inert. | Focused clue tile pulses with a gold border (`slotHot` + `glow`); `audio.ui.click` on revealed-tile select. |
| Jump to map | `puzzle.jumpToMap` | navigation | `07-adventure-map` | `FOCUS_GRAIL_HINT_REGION` | Closes the modal and centers the adventure camera on `selectors.grail.selectedFragmentMapFocus`. | Reverse `modalIn` (parchment fold closes); camera pan + zoom on the revealed hex; `audio.adventure.*` cue on land. |
| Close | `puzzle.close` | navigation | `07-adventure-map` | `CLOSE_PUZZLE_MAP` | Clears `state.ui.puzzleMap.selectedFragment`; returns to the prior adventure context with no camera move. | Reverse `modalIn` (parchment fold closes); `audio.ui.click`. |

All three tokens match the UI-local prefix policy in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(`SELECT_`, `FOCUS_`, `CLOSE_` are all listed in `localUiPrefixes`),
so none are required in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### State Changes
- `state.players.active.obelisksVisited` refreshes `obeliskProgress`
  after the owning reducer
  ([`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md))
  appends a visit.
- `selectors.grail.revealedPuzzleFragments` refreshes `fragmentGrid`
  after `obelisksVisited` changes (pure selector; no separate
  reducer).
- `state.ui.puzzleMap.selectedFragment` refreshes `selectedFragment`
  on `puzzle.selectFragment` and is cleared on `puzzle.close`.
- `selectors.grail.visibleRegionHint` refreshes `grailRegionHint`
  whenever `obelisksVisited` changes.
- `selectors.grail.selectedFragmentMapFocus` refreshes
  `mapJumpTarget` whenever `selectedFragment` or
  `revealedPuzzleFragments` changes.
- UI-only hover, focus, drag ghost, and animation-frame state stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `puzzle.jumpToMap` routes to `07-adventure-map` after the close
  animation, then pans the camera to the revealed hex returned by
  `selectors.grail.selectedFragmentMapFocus`. The route is suppressed
  when `selectedFragment` is `null` or points at an unrevealed tile.
- `puzzle.close` routes to `07-adventure-map` after the close
  animation with no camera move.

### Disabled And Error Cases
- `JUMP` is disabled when `selectedFragment` is `null`, or when the
  selected fragment is unrevealed, or when
  `selectors.grail.selectedFragmentMapFocus` returns `null`.
  Hidden tiles are click-inert (no `puzzle.selectFragment` dispatch).
- Missing presentation assets use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay records
  (e.g. scenario has no `grail` block) fail loudly before controls
  become enabled, per the same doc.
- On rejection, keep the modal open, preserve `selectedFragment` when
  useful, show localized error text, and play failure feedback.
- Errors render via `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.
- [`data-contracts.md`](./data-contracts.md) owns the schema /
  localization / asset surface.

---

## 🔍 Sync Check

- **UI: ✔** — Per-control affordances (`puzzle.selectFragment`,
  `puzzle.jumpToMap`, `puzzle.close`) and button labels (`JUMP`,
  `CLOSE`) match the `data-action` attributes and text content in
  `mockup.html`. Sibling [`spec.md`](./spec.md) component tree
  aligned (`MapJumpButton`, `CloseButton`).
- **Schema: ✔** — All three tokens are UI-local by prefix per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`SELECT_`, `FOCUS_`, `CLOSE_`); none enter
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  Selectors `selectors.grail.*` are produced by upstream task
  [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md).
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md)
  reads this file first; the screen-coverage validator
  (`npm run validate:commands`) accepts every token via the UI-local
  prefix list.

## ⚠ Issues

_None._
