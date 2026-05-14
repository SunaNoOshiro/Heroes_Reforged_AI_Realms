# Screen 33: Shipyard
## Interaction Map

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose

Town-building or adventure-map shipyard service for spending resources
to spawn a boat on an adjacent legal water tile.

### Actions

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select water tile | `shipyard.selectTile` | local-ui | Current screen | `SELECT_BOAT_SPAWN_TILE` | Updates spawn preview. | Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples. |
| Build boat | `shipyard.build` | command | `24-town-screen` or `07-adventure-map` | `BUILD_BOAT` | Spends resources and creates boat entity at selected tile. | Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples. |
| Close | `shipyard.close` | navigation | `24-town-screen` or `07-adventure-map` | `CLOSE_SHIPYARD` | Returns to caller. | Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples. |

`SELECT_BOAT_SPAWN_TILE` and `CLOSE_SHIPYARD` are local-UI tokens
covered by the `SELECT_` / `CLOSE_` prefix lists in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
neither enters the deterministic command log. `BUILD_BOAT` is a schema
command defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
(`$defs/buildBoat`).

### State Changes

- `state.ui.shipyard.sourceId` refreshes `shipyardId` after the owning
  reducer or local UI draft changes.
- `selectors.towns.shipyardBoatSpawnTiles` refreshes `spawnTiles` after
  the owning reducer or local UI draft changes.
- `state.ui.shipyard.selectedSpawnTile` refreshes `selectedTile` after
  the owning reducer or local UI draft changes.
- `selectors.economy.shipyardBoatCost` refreshes `cost` after the owning
  reducer or local UI draft changes.
- `state.players.active.resources` refreshes `resources` after the
  owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes

- Build boat can route to `24-town-screen` or `07-adventure-map` after
  guard approval and exit animation.
- Close can route to `24-town-screen` or `07-adventure-map` after guard
  approval and exit animation.

### Disabled And Error Cases

- Disable controls when required selectors, registry records, resource
  costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never construct
  error toast text inline.

### AI Implementation Notes

- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than
  inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits the
default code → surface mapping from § 2. The table below maps each
action whose `Type` column is `command` to its default surface for this
screen's dominant error domain. A row whose Notes column reads
`override` replaces the § 2 default for that action; otherwise the
default applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Build boat (`BUILD_BOAT`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Actions, state changes, and navigation outcomes match sibling `spec.md` (component tree, state bindings) and `architecture.md` (outgoing transitions to `24-town-screen` / `07-adventure-map`).
- **Schema: ✔** — `BUILD_BOAT` resolves in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); `SELECT_BOAT_SPAWN_TILE` and `CLOSE_SHIPYARD` resolve via prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Engine command owned by [`phase-2.05-mod-system.06-build-boat-command-and-shipyard`](../../../../../tasks/phase-2/05-mod-system/06-build-boat-command-and-shipyard.md); UI surface owned by [`phase-2.07-ui-screen-backlog.33-shipyard-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/33-shipyard-screen.md), which lists this file in its acceptance criteria.

## ⚠ Issues

- **`Close` action duplicates the build-only animation string.** The `Close` row repeats the crane-swing / boat-hull-fade / counters-tick / spawn-tile-ripple animation that describes the build outcome. Sibling `spec.md § Animation Contract` carries the same single string, so the rewrite preserves it verbatim (Hard Prohibition A). A follow-up edit pass could split per-action animations (e.g. close exit fade vs. build outcome); not auto-applied because no canonical source disambiguates the two.
