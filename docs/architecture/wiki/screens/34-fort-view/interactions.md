# Screen 34: Fort View
## Interaction Map

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose

Inspect the town's built fort / citadel / castle tier, its wall and
tower battle bonuses, and the next upgrade's prerequisites. The
screen is read-only on gameplay state; the upgrade itself is enacted
from `30-build-tree`.

### Actions

| UI Element | Action ID | Type | Next Screen | Token | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select segment | `fortView.selectSegment` | local-ui | Current screen | `SELECT_FORT_SEGMENT` | Sets `state.ui.fortView.selectedSegment`; refreshes the bonus-detail plaque. |
| Build (next upgrade) | `fortView.buildTree` | navigation | `30-build-tree` | `OPEN_BUILD_TREE_FOR_FORT` | Routes to the build tree focused on the next fortification upgrade. |
| Close | `fortView.close` | navigation | `24-town-screen` | `CLOSE_FORT_VIEW` | Returns to the town screen. |

`SELECT_FORT_SEGMENT`, `OPEN_BUILD_TREE_FOR_FORT`, and
`CLOSE_FORT_VIEW` are UI-local routing / selection / close tokens
covered by the `SELECT_` / `OPEN_` / `CLOSE_` prefix lists in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
none enters the deterministic command log. The screen dispatches no
schema commands of its own — gameplay mutation lives downstream in
`30-build-tree`.

### Animation Cues

Single cue palette shared by the screen:

- Wall segments highlight in construction order when focused.
- Tower icons flare on hover.
- The gate opens on hover.
- Missing upgrades pulse as dark silhouettes on the cutaway.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### State Changes

- `state.towns.byId[selected].fortificationLevel` refreshes
  `fortLevel` after the owning reducer commits a fort build / upgrade
  (this screen never writes to it).
- `selectors.towns.fortificationBattleLayout` refreshes
  `wallDefinition` from the same source.
- `selectors.towns.fortificationGrowthBonus` refreshes `growthBonus`
  from the same source.
- `selectors.towns.nextFortUpgradePrereqs` refreshes `buildPrereqs`
  from the same source.
- `state.ui.fortView.selectedSegment` refreshes `selectedSegment`
  after a local `SELECT_FORT_SEGMENT` draft updates.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Navigation Outcomes

- `Build` routes to `30-build-tree` after route-guard approval and
  the exit animation.
- `Close` routes to `24-town-screen` after route-guard approval and
  the exit animation.

### Disabled And Error Cases

- Disable `Build` when `buildPrereqs` reports unsatisfied
  requirements (resources, dependent buildings, turn phase, or
  ownership).
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected route
  transitions fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve
  `state.ui.fortView.selectedSegment`, show localized error text,
  and play failure feedback.
- Error copy is produced by `formatUserError(err, locale)` declared
  in [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes

- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Three actions and three tokens line up with sibling [`spec.md § State Bindings`](./spec.md), [`architecture.md § Outgoing Transitions`](./architecture.md), and `data-action="fortView.buildTree"` / `data-action="fortView.close"` in [`mockup.html`](./mockup.html). The `fortView.selectSegment` action has no `data-action` attribute in the mockup because segment selection is implicit hover-and-click on the cutaway regions.
- **Schema: ✔** — All three tokens resolve via local-ui prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json). Outgoing routes `24-town-screen` and `30-build-tree` both exist as sibling screen packages.
- **Tasks: ⚠** — UI surface owned by [`phase-2.07-ui-screen-backlog.34-fort-view-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/34-fort-view-screen.md), which lists this file in its acceptance criteria. The engine source of the four read-only selectors is not named in any task's Outputs; see sibling `spec.md § ⚠ Issues`.

## ⚠ Issues

- **No persisted command on this screen.** The original interactions file did not state explicitly that the three tokens are local-ui and that the screen dispatches no schema commands. The rewrite makes that explicit. Meaning is preserved — the original `Type` column already marked `selectSegment` as `local-ui` and `buildTree` / `close` as `navigation`, none as `command`. See sibling `spec.md § ⚠ Issues` for the data-inventory / selector-ownership gaps that are visible from this file too — those are the same gaps, flagged in one place.
