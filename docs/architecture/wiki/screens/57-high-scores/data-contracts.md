# Screen 57: High Scores — Data Contracts

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`interactions.md`](./interactions.md) — per-control behavior.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Content Schemas & Registries

| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Background, frame, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and tie-breakers consumed by ranking selectors. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |

All three schemas are registered in
[`schema-matrix.md`](../../../schema-matrix.md). No screen-specific
registry is introduced here — score records resolve through the
profile selector listed in § 2.

## 2. Runtime State Selectors

| Binding handle | Selector | Persisted? | Notes |
| --- | --- | --- | --- |
| `scoreRecords` | `state.profile.highScores` | **Yes** — IndexedDB (`hr-profile.profile`); row in [`data-inventory.md`](../../../data-inventory.md). | Rolling top-10 completed-game records. |
| `filter` | `state.ui.highScores.filter` | No — UI runtime only. | Scenario / campaign / difficulty / all. |
| `selectedRecord` | `state.ui.highScores.selectedRecordId` | No — UI runtime only. | Locally selected row id. |
| `sortOrder` | `selectors.profile.sortedHighScores` | No — pure selector. | Deterministic ranking order (score then date tie-breakers). |
| `newRecordId` | `state.ui.highScores.newRecordId` | No — UI runtime only. | Highlight set on entry after a victory; cleared on `CLOSE_HIGH_SCORES`. |

## 3. Commands & Events

All three tokens below are **local-ui**. They match prefixes
`SELECT_`, `SET_`, and `CLOSE_` listed in
[`screen-command-coverage.json`](../../../screen-command-coverage.json#localUiPrefixes)
and **do not enter the deterministic command log**. No row in
[`command-schema.md`](../../../command-schema.md) is required.

| Trigger | Token | Effect |
| --- | --- | --- |
| `scores.selectRow` | `SELECT_HIGH_SCORE_ROW` | Sets `state.ui.highScores.selectedRecordId`. |
| `scores.filter` | `SET_HIGH_SCORE_FILTER` | Sets `state.ui.highScores.filter`. |
| `scores.back` | `CLOSE_HIGH_SCORES` | Clears `state.ui.highScores.selectedRecordId` + `newRecordId`; returns to caller (`01-main-menu` or the prior screen). |

## 4. Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys
- `ui.high-scores.title`
- `ui.high-scores.actions.*`
- `ui.high-scores.status.*`
- `ui.high-scores.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Audio & VFX IDs
- `ui.high-scores.background`
- `ui.high-scores.frame`
- `ui.high-scores.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.high-scores.*`

## 7. Save & Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, scalar command inputs, and explicit draft records
  named by the owning system. The only persisted slice on this
  screen is `state.profile.highScores` (see § 2).
- **Never persist**: hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

## 8. Display Name Policy
- **Default (`displayNameMode === "hashed"`).** Each row renders
  `playerLabel` — a short opaque identifier derived from
  `playerHash` (see [`data-inventory.md`](../../../data-inventory.md)
  rows `playerLabel` and `playerHash`).
- **Opt-in (`displayNameMode === "clear"`).** When the score record
  carries a `playerName`, that string renders instead of
  `playerLabel`.
- The toggle lives in `state.privacy.options.displayNameMode` (see
  the `privacy options` row in
  [`data-inventory.md`](../../../data-inventory.md)).
- Owning task:
  [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md).

## 9. Validation & Fallback
- Reads `state.profile.highScores` and renders them via
  `selectors.profile.sortedHighScores`. **Read-only** — clearing or
  importing scores happens through confirmed profile actions on
  other screens.
- **Presentation** may fall back through the asset resolver.
- **Gameplay records, invalid commands, and unresolved content IDs
  fail loudly before controls become enabled**, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Three local-ui tokens, five state bindings, and the display-name policy match sibling [`interactions.md` § Actions](./interactions.md#actions), [`spec.md` § State Bindings](./spec.md#state-bindings), and [`mockup.html`](./mockup.html) (`data-action="scores.back"`).
- **Schema: ⚠** — `asset-index.schema.json`, `localization.schema.json`, and `ruleset.schema.json` exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/) and are listed in [`schema-matrix.md`](../../../schema-matrix.md). No enum values are inlined here, so no enum-drift surface. ⚠ noted because the § 8 display-name policy contradicts the wording of the `state.profile.highScores` row in [`data-inventory.md`](../../../data-inventory.md) — see ⚠ Issues.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.57-high-scores-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/57-high-scores-screen.md) cites all selectors and tokens; the player-label render is additively owned by [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md).

## ⚠ Issues

- **`data-inventory.md` row drifts from § 8.** The `state.profile.highScores` row in [`data-inventory.md`](../../../data-inventory.md) says rows "render `playerLabel`, **never** `playerName`". § 8 above — and the owning task [`mvp.07-ui-shell.23-high-scores-player-label`](../../../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md) — state that `playerName` renders when `state.privacy.options.displayNameMode === "clear"` and the record carries one. The task is the implementation owner and is canonical; the inventory note is stale. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), the inventory note should be reworded to match the task. Suggested values: replace "renders `playerLabel`, never `playerName`" with "renders `playerLabel` by default; `playerName` only when `state.privacy.options.displayNameMode === 'clear'` and the record carries one". Audit did not edit the inventory (skill prohibition D).
