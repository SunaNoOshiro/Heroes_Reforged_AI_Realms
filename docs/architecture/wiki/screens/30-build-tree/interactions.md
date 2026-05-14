# Screen 30: Town Hall / Build Tree
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town construction graph: built / available / locked / selected
building nodes, prerequisite links, resource cost, and the
one-build-per-day guard.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select building node (click) | `buildTree.selectBuilding` | local-ui | Current | `SELECT_BUILDING_NODE` | Updates `state.ui.buildTree.selectedBuildingId`; detail and cost panel refresh. |
| Build | `buildTree.build` | command | Current | `BUILD_BUILDING` (`{ townId, buildingId }`) | Spends resources, marks building built, sets `builtToday`. |
| Close | `buildTree.close` | navigation | `24-town-screen` | `CLOSE_BUILD_TREE` | Dismisses the dialog and returns to the town screen. |

Selection is implicit on node click — no separate `data-action`
attribute in `mockup.html`. Animation per action (shared):
available node pulses, prerequisite path lights, resource cost
flashes, newly built structure brightens into the town panorama.
See sibling `spec.md` § Animation Contract and `architecture.md`
§ Animation Flow.

`SELECT_BUILDING_NODE` and `CLOSE_BUILD_TREE` are UI-local tokens
matched by the `SELECT_` / `CLOSE_` entries in `localUiPrefixes`
of
[`screen-command-coverage.json`](../../../screen-command-coverage.json).
Only `BUILD_BUILDING` enters the deterministic command log; its
shape is defined in
[`command-schema.md` § BUILD_BUILDING](../../../command-schema.md#build_building).

### State Changes
- `state.towns.byId[selected].buildings` refreshes `town.buildings`
  after the reducer commits the build.
- `state.towns.byId[selected].availableBuilds` refreshes
  `availableBuildings` after the reducer recomputes the
  prerequisite frontier.
- `state.towns.byId[selected].builtToday` refreshes `builtToday`
  after the reducer sets the daily-build flag (cleared at
  `END_DAY`).
- `state.ui.buildTree.selectedBuildingId` refreshes
  `selectedBuilding` from the local UI draft on node click.
- `state.players.active.resources` refreshes `player.resources`
  after the reducer deducts cost.
- Hover, focus, selected row, open tab, target cursor, drag ghost,
  and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `Close` routes to `24-town-screen` after guard approval and the
  exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use the resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Error toast / tooltip text is produced by
  `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md). Never
  construct error strings inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions
  rather than invent new behavior.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The table below names a specific code; the gate
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
fires if a row is missing for any other named code.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Build (`BUILD_BUILDING`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 (`DISPATCHER_*` → inline); disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs `buildTree.build` and `buildTree.close`
  appear as `data-action` attrs in `mockup.html`. Node selection
  is implicit on slot click (no separate button), consistent with
  sibling `spec.md` § Component Tree and the implicit selection
  row in `data-contracts.md` § Commands And Events.
- **Schema: ✔** — `BUILD_BUILDING` payload (`townId`, `buildingId`)
  matches
  [`command-schema.md` § BUILD_BUILDING](../../../command-schema.md#build_building).
  `SELECT_*` / `CLOSE_*` fall under `localUiPrefixes` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task
  [`30-build-tree-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/30-build-tree-screen.md)
  references this file in Read First and asserts every
  interaction token is resolved through
  `screen-command-coverage.json`.

## ⚠ Issues

- **`builtToday` not in `data-inventory.md`.** This file refreshes
  `state.towns.byId[selected].builtToday` from `BUILD_BUILDING`,
  but
  [`data-inventory.md` § 1](../../../data-inventory.md) has no
  matching row. The engine reducer task that owns the
  daily-build flag
  ([`mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`](../../../../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md))
  must add it. See sibling `spec.md` § ⚠ Issues for the full
  list of missing town and build-tree rows. Not closed here per
  Hard Prohibition D.
