# Screen 48: Level Up Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Hero level-up modal. The player picks one of two deterministic
secondary-skill offers; confirm commits the resolved primary-stat
gain and the selected skill atomically.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select left skill card | `levelUp.selectLeft` | local-ui | Current screen | `SELECT_LEVEL_UP_CHOICE` (local-ui; `SELECT_` prefix per [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | `state.ui.levelUp.selectedChoiceId` ← left choice id. | Left card highlights; selection sound. |
| Select right skill card | `levelUp.selectRight` | local-ui | Current screen | `SELECT_LEVEL_UP_CHOICE` (local-ui) | `state.ui.levelUp.selectedChoiceId` ← right choice id. | Right card highlights; selection sound. |
| Confirm | `levelUp.confirm` | command | `46-hero-screen` or invoking screen | `APPLY_HERO_LEVEL_UP` → canonical `LEVEL_UP` per [`screen-command-coverage.json` §`commandAliases`](../../../screen-command-coverage.json) and [`command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json) | `state.heroes.byId[heroId]` (primary stats + skill grid); modal closes; `state.ui.levelUp.*` cleared. | XP bar fills to the next-level mark, primary-stat gem flashes, selected card stamps into the hero sheet, then exit animation. |

The two select actions stay local: only `levelUp.confirm` enters
the deterministic command log.

### State Changes
- `state.ui.levelUp.heroId`, `state.ui.levelUp.primaryStatGain`,
  `state.ui.levelUp.skillChoices` are seeded by the runtime when the
  modal opens (from the `HERO_LEVEL_UP` event per
  [`event.schema.json`](../../../../../content-schema/schemas/event.schema.json));
  the UI only reads them.
- `state.ui.levelUp.selectedChoiceId` is the only field the UI
  writes locally, set by `levelUp.selectLeft` / `levelUp.selectRight`
  and required before `levelUp.confirm` enables.
- `state.heroes.byId[heroId].experience` and the primary-stat /
  skill grid refresh after the dispatcher accepts `LEVEL_UP`.
- Hover, focus, selected-row glow, drag ghost, and animation frames
  stay outside deterministic gameplay state.

### Navigation Outcomes
- Confirm routes back to the invoking screen (typically
  `46-hero-screen`) after dispatcher approval and the exit
  animation.
- There is no cancel path; level-ups must resolve before the player
  resumes gameplay (the offer set is deterministic, so closing and
  re-opening yields the same two choices).

### Disabled And Error Cases
- `levelUp.confirm` is disabled until `selectedChoiceId` is set and
  the dispatcher's view selector reports the hero is still eligible.
- Disable controls when required selectors, registry records, target
  legality, ownership, phase, or route guards fail.
- Missing presentation assets fall back through the asset resolver.
- Missing gameplay records, invalid content IDs, or rejected
  commands fail loudly before controls enable.
- On rejection, keep the modal open, preserve the local draft, show
  localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions; they
  must not introduce new behavior.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The row below names the dispatcher's default rejection on the only
`command`-type action (`levelUp.confirm`). Engine-specific
`DISPATCHER_<token>` / `STORAGE_<token>` codes land alongside the
reducer that owns the command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Confirm (`APPLY_HERO_LEVEL_UP`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per [`error-ux.md` § 2 DISPATCHER_*](../../../error-ux.md#2-code--surface-mapping); disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Actions, next-screen routing, and animation cues
  match `mockup.html` data-action attributes (`levelUp.selectRight`,
  `levelUp.confirm`), sibling `spec.md` component tree, and
  `data-contracts.md` command list.
- **Schema: ✔** — `APPLY_HERO_LEVEL_UP` is an alias of canonical
  `LEVEL_UP` per
  [`screen-command-coverage.json` §`commandAliases`](../../../screen-command-coverage.json);
  the schema for `LEVEL_UP` is
  [`command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json).
  `SELECT_LEVEL_UP_CHOICE` matches the `SELECT_` local-ui prefix and
  does not enter the command log.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.48-level-up-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/48-level-up-dialog-screen.md);
  reducer-side leveling owned by
  [`phase-2.01-spells-artifacts.00-hero-leveling`](../../../../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md)
  and
  [`phase-2.01-spells-artifacts.09-leveling-up-hero-gains-skills-and-stats`](../../../../../tasks/phase-2/01-spells-artifacts/09-leveling-up-hero-gains-skills-and-stats.md).

## ⚠ Issues

- **`mockup.html` shows only the right select button.** The visible
  SVG renders `data-action="levelUp.selectRight"` and
  `data-action="levelUp.confirm"` but no explicit `levelUp.selectLeft`
  control — selection of the left card is implied by clicking the
  card itself (which is the intended runtime behavior). The two
  Action rows for `selectLeft` / `selectRight` remain accurate as a
  contract; flagged so a reader of the mockup does not infer the
  left action is missing. No file change required.
