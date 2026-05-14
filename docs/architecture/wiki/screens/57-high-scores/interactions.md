# Screen 57: High Scores — Interaction Map

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.
- [`architecture.md`](./architecture.md) — screen diagrams.

## Purpose
High-score ledger. Renders completed-game rankings and lets the
player select a row, change the filter, and return to the caller.
**Read-only** — no gameplay state mutates on this screen.

## Actions

All three tokens are **local-ui** routing / selection / draft tokens.
They match prefixes `SELECT_`, `SET_`, and `CLOSE_` listed in
[`screen-command-coverage.json`](../../../screen-command-coverage.json#localUiPrefixes)
and **do not enter the deterministic command log**. See
[`data-contracts.md` § 3](./data-contracts.md#3-commands--events).

Every row plays the **Standard score-screen feedback** described in
§ Animation; `Back` plays a route fade after guard approval.

| UI element | Action ID | Type | Next screen / surface | Token | Data updated |
| --- | --- | --- | --- | --- | --- |
| Select row | `scores.selectRow` | local-ui | Current screen | `SELECT_HIGH_SCORE_ROW` | Sets `state.ui.highScores.selectedRecordId`; details panel re-renders. |
| Change filter | `scores.filter` | local-ui | Current screen | `SET_HIGH_SCORE_FILTER` | Sets `state.ui.highScores.filter`; ranking table re-projects. |
| Back | `scores.back` | navigation | `01-main-menu` or previous screen | `CLOSE_HIGH_SCORES` | Clears `state.ui.highScores.selectedRecordId` and `newRecordId`; returns to caller. |

## Animation

**Standard score-screen feedback** (used by every row):

- Score rows cascade in on screen entry.
- Top-three plaques glint.
- Filter tabs turn pages on `SET_HIGH_SCORE_FILTER`.
- A `state.ui.highScores.newRecordId` row pulses **once** when
  present (typically set when a victory routes here).

`Back` plays a route fade after guard approval. Under
`config.ui.reducedMotion === true`, motion is replaced by static
highlights; visible state changes are preserved.

## State Changes

Authoritative selectors refresh their bound handles whenever the
owning reducer or local UI draft changes:

- `state.profile.highScores` → `scoreRecords`.
- `state.ui.highScores.filter` → `filter`.
- `state.ui.highScores.selectedRecordId` → `selectedRecord`.
- `selectors.profile.sortedHighScores` → `sortOrder`.
- `state.ui.highScores.newRecordId` → `newRecordId`.

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

## Navigation Outcomes
- `Back` routes to `01-main-menu` **or** the caller screen
  (whichever opened this view) after guard approval and the exit
  animation.

## Disabled & Error Cases
- Controls are disabled when required selectors, registry records,
  ownership, phase, or route guards fail.
- Presentation assets may use resolver fallback. **Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly**
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep this screen open, preserve local draft when
  useful, render localized error text, and play failure feedback.
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

- **UI: ⚠** — Three action rows align with sibling [`spec.md` § Component Tree](./spec.md#component-tree) and [`data-contracts.md` § 3](./data-contracts.md#3-commands--events). [`mockup.html`](./mockup.html) carries `data-action="scores.back"`; it does **not** draw the filter strip or a row-select hot-state, so `scores.selectRow` and `scores.filter` have no visible `data-action` in the SVG. Spec is canonical; tracked in sibling [`spec.md` ⚠ Issues](./spec.md).
- **Schema: ✔** — All three tokens are local-ui per [`screen-command-coverage.json`](../../../screen-command-coverage.json#localUiPrefixes) (`SELECT_`, `SET_`, `CLOSE_` prefixes). None require a row in [`command-schema.md`](../../../command-schema.md).
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.57-high-scores-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/57-high-scores-screen.md) acceptance criteria bind every token listed here; the additive player-label render is owned by [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md).

## ⚠ Issues

_None._ — Mockup-omission gap is tracked in sibling [`spec.md` ⚠ Issues](./spec.md); display-name drift is tracked in sibling [`data-contracts.md` ⚠ Issues](./data-contracts.md).
