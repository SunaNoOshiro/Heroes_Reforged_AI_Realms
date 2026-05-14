# Screen 57: High Scores — Spec

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

## Description
High-score ledger. Renders completed-game rankings (player label,
score, days, difficulty, scenario, campaign medals) with optional
filter tabs and a selected-row details panel. **Read-only** — clearing
or importing scores happens through confirmed profile actions on
other screens.

## Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## Visual Contract
- Curation status: `curated-pass-6`.
- Stone-and-parchment ranking table with top-three medal plaques,
  filter tabs, an optional selected-row details panel, and a Back
  button.
- Dense classic-fantasy strategy UI: fixed `800 × 600` viewport,
  ornate gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, bottom status / resource feedback.
- [`mockup.html`](./mockup.html) contains **visible UI only**. Logic,
  transitions, and implementation notes live in the markdown package.

## Component Tree
- `HighScores`
  - `RankingTable`
  - `MedalPlaques`
  - `FilterTabs`
  - `SelectedScoreDetails`
  - `BackButton`

## State Bindings

All five handles refresh from their authoritative selector.
`state.profile.highScores` is the only persisted slice
(IndexedDB; registered in [`data-inventory.md`](../../../data-inventory.md)).
The four `state.ui.highScores.*` slices are runtime-only.

| Binding handle | Selector | Notes |
| --- | --- | --- |
| `scoreRecords` | `state.profile.highScores` | Completed-game records (rolling top-10). |
| `filter` | `state.ui.highScores.filter` | Scenario / campaign / difficulty / all. |
| `selectedRecord` | `state.ui.highScores.selectedRecordId` | Locally selected row id. |
| `sortOrder` | `selectors.profile.sortedHighScores` | Deterministic ranking order (score, then date tie-breakers). |
| `newRecordId` | `state.ui.highScores.newRecordId` | Optional highlight set on entry after victory. |

## Mechanics Mapping
- Reads `state.profile.highScores` and renders them via
  `selectors.profile.sortedHighScores`. Read-only screen.
- UI previews stay **local** until a listed token or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded view logic.
- **Display name policy.** Rows render `playerLabel` by default;
  `playerName` renders only when
  `state.privacy.options.displayNameMode === "clear"` and the record
  carries one. Owned by
  [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md);
  see [`data-contracts.md` § 8](./data-contracts.md#8-display-name-policy).

## Animation Contract
- **Standard score-screen feedback** owned by
  [`interactions.md` § Animation](./interactions.md#animation): score
  rows cascade in, top-three plaques glint, filter tabs turn pages on
  filter change, and a `newRecordId` row pulses **once** when present.
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
- Screen slug `high-scores`; system group `system`; curation marker
  `curated-pass-6`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Component Tree matches sibling [`architecture.md` § Visual Composition](./architecture.md#visual-composition). [`mockup.html`](./mockup.html) is a **simplified** visual sample: it draws `RankingTable`, one `MedalPlaques` slot, and `BackButton` but omits `FilterTabs` and `SelectedScoreDetails`. Spec is canonical per [`architecture.md` § Implementation Contract](./architecture.md#implementation-contract); see ⚠ Issues.
- **Schema: ✔** — No schema enums declared inline. Persisted slice `state.profile.highScores` has a row in [`data-inventory.md`](../../../data-inventory.md); the four `state.ui.highScores.*` slices are runtime-only and need no row.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.57-high-scores-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/57-high-scores-screen.md) reads all five package files; the additive player-label render is owned by [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md).

## ⚠ Issues

- **Mockup omits `FilterTabs` and `SelectedScoreDetails`.** [`mockup.html`](./mockup.html) shows `RankingTable`, one medal plaque, and the `BACK` button but no filter strip or details panel, although both regions are listed in this Component Tree and in sibling [`architecture.md` § Visual Composition](./architecture.md#visual-composition). Per [`architecture.md` § Implementation Contract](./architecture.md#implementation-contract), the markdown package is canonical (the mockup is a visual sample, not the contract). Suggested fix: the owning task [`phase-2.07-ui-screen-backlog.57-high-scores-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/57-high-scores-screen.md) extends the SVG to draw both regions (with `data-action="scores.filter"` and a selected-row panel), **or** the spec is amended to mark them as a future-pass-7 addition. Audit did not edit the mockup (skill prohibition D).
- **Display-name claim drifts from `data-inventory.md`.** This spec — together with sibling [`data-contracts.md` § 8](./data-contracts.md#8-display-name-policy) and owning task [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md) — states that `playerName` renders when `state.privacy.options.displayNameMode === "clear"`. The `state.profile.highScores` row in [`data-inventory.md`](../../../data-inventory.md) says rows render `playerLabel`, **never** `playerName`. The owning task is canonical (it specifies the render branch); the inventory note is stale. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), the inventory note should be reworded. Suggested fix: replace "renders `playerLabel`, never `playerName`" with "renders `playerLabel` by default; `playerName` only when `state.privacy.options.displayNameMode === 'clear'` and the record carries one". Audit did not edit the inventory (skill prohibition D).
