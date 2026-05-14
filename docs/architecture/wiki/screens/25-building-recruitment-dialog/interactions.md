# Screen 25: Building / Recruitment Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town dwelling recruitment dialog: pick a dwelling, set a quantity,
confirm purchase, and route the new / merged stack into the
destination army (hero or garrison).

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select dwelling | `recruit.selectDwelling` | local-ui | Current screen | `SELECT_RECRUIT_DWELLING` | Updates selected creature, stock, and cost preview. | Dwelling row highlights. |
| Change quantity | `recruit.changeQuantity` | local-ui | Current screen | `SET_RECRUIT_QUANTITY` | Updates local quantity and total cost. | Quantity counter ticks. |
| Max quantity | `recruit.max` | local-ui | Current screen | `SET_MAX_RECRUIT_QUANTITY` | Chooses max legal quantity from stock / resources / capacity. | MAX button fills the slider. |
| Recruit | `recruit.confirm` | command | Current screen | `RECRUIT_UNITS` | Spends resources, decrements stock, updates destination army. | Accepted recruits slide toward the destination army slot. |
| Cancel | `recruit.cancel` | navigation | `24-town-screen` | `CLOSE_RECRUITMENT_DIALOG` | Discards recruitment draft. | — |

The animation column above splits the screen-wide animation contract
in `spec.md` § Animation Contract by which action triggers each cue;
no new animations are introduced here.

### State Changes
- `state.towns.selectedTownId` refreshes `town.id` after the owning
  reducer or local UI draft changes.
- `state.towns.byId[selected].dwellingStock` refreshes
  `dwelling.stock` after the owning reducer (`RECRUIT_UNITS` decrement).
- `state.ui.town.selectedDwellingId` refreshes `selectedDwelling`
  from the `recruit.selectDwelling` local-ui draft.
- `state.ui.town.recruitQuantity` refreshes `recruitQuantity` from
  `recruit.changeQuantity` / `recruit.max` local-ui drafts.
- `state.townRecruit.destinationArmy` refreshes `destinationArmy`
  after the owning reducer accepts the recruit.
- UI-only hover, focus, selected row, drag ghost, and animation
  frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cancel routes to `24-town-screen` after guard approval and exit
  animation.
- Recruit stays on the current screen; the dialog refreshes its
  stock / cost / army readouts from the reducer result so the user
  can buy again from the same dwelling.

### Disabled And Error Cases
- Disable `recruit.confirm` when required selectors, registry
  records, resource costs, army capacity, ownership, phase, or
  route guards fail. Per
  [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md)
  the schema-side validation list is: hero is in town, town is
  friendly, dwelling exists, sufficient stock, sufficient resources,
  recruited units fit the army (≤ 7 stacks) or town garrison.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the dialog open, preserve the local draft, show
  localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they must
  not introduce hidden behavior.

## Error surfaces

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
| Recruit (`RECRUIT_UNITS`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs and animation cues align with sibling `spec.md` § Component Tree / Animation Contract and with the regions in `mockup.html` (dwelling list, quantity slider, MAX / BUY / CLOSE buttons). The Cancel target `24-town-screen` exists.
- **Schema: ✔** — `RECRUIT_UNITS` is defined in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and documented in [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md). The four UI-local tokens (`SELECT_RECRUIT_DWELLING`, `SET_RECRUIT_QUANTITY`, `SET_MAX_RECRUIT_QUANTITY`, `CLOSE_RECRUITMENT_DIALOG`) match the `SELECT_` / `SET_` / `CLOSE_` prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`.
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md) lists this file in Read First; engine command owner is `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`.

## ⚠ Issues

- **Per-action animation split is a clarification, not a meaning change.** The previous revision listed the full screen-wide animation set on every row, which violated `doc-audit` § 5 ("no ambiguity — every conditional is explicit"). The split here maps each cue to the action that triggers it as described in `spec.md` § Animation Contract; no new animation cues are introduced. See sibling `spec.md` § Animation Contract — aligned.
