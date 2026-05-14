# Screen 30: Town Hall / Build Tree

## Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md` (this file)
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

## Description
Town construction graph. Renders built, available, locked, and
selected building nodes with prerequisite links, a resource-cost
panel, and the one-build-per-day guard.

## Visual Direction
Original internal UI contract. Never source third-party captures,
copied franchise art, or external product pixels as
implementation input. Curation status: `curated-pass-2`.

## Visual Contract
- Fixed 800x600 layout, ornate gold frame, red/brown/stone panels,
  compact icon slots, bottom status/resource feedback.
- A branching construction diagram fills the panel: built nodes
  are lit, available nodes glow, locked nodes are dark, and
  selected building details sit to the right.
- `mockup.html` carries visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

## Component Tree
- `BuildTreeDialog`
  - `BuildingGraph` — node grid, classes `slot` / `slotHot` per
    locked / available; built nodes draw on top of the panorama.
  - `PrerequisiteLinks` — gold connectors between nodes.
  - `SelectedBuildingDetails` — name, description, status (right
    panel).
  - `CostPanel` — per-resource cost from `building.cost`
    cross-checked against `player.resources`.
  - `BuiltTodayPlaque` — renders `builtToday: yes | no`.
  - `BuildCloseButtons` — BUILD (`buildTree.build`) and CLOSE
    (`buildTree.close`).

## State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `town.buildings` | `state.towns.byId[selected].buildings` | Built nodes. |
| `availableBuildings` | `state.towns.byId[selected].availableBuilds` | Available nodes derived from the prerequisite graph. |
| `selectedBuilding` | `state.ui.buildTree.selectedBuildingId` | Local selection (UI-only). |
| `player.resources` | `state.players.active.resources` | Cost availability. |
| `builtToday` | `state.towns.byId[selected].builtToday` | Daily build guard; cleared at `END_DAY`. |

`selected` is the active `townId` from the town-screen context.
Hover, focus, scroll, drag ghost, and animation frame stay
outside deterministic state.

## Mechanics Mapping
- BUILD validates ownership, prerequisites, resources, town-hall
  / castle rules, and the daily-build flag before committing.
- UI previews stay local until a listed command (`BUILD_BUILDING`)
  or route guard (`CLOSE_BUILD_TREE`) accepts them. See sibling
  `interactions.md` § Actions for the canonical command table.
- Costs, buildings, towns, and resources resolve through
  registries and content schemas (`building.schema.json`,
  `resource-id.schema.json`, `town-presentation.schema.json`) —
  never through hardcoded view logic.

## Animation Contract
- Available node pulses; prerequisite path lights; resource cost
  flashes; newly built structure brightens into the town
  panorama (see `architecture.md` § Animation Flow).
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with
  static highlights and localized feedback.

## Acceptance Criteria
- Mockup is visually distinct from other screens and follows the
  internal visual direction.
- Spec lists every visible region and the authoritative state
  bindings.
- `interactions.md` covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- `architecture.md` contains screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schemas, config,
  localization, asset, sound, VFX, save, and replay fields
  needed to implement the screen.

## AI Implementation Notes
- Screen slug `build-tree`; system group `town`; curation marker
  `curated-pass-2`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs /
  manifests; deterministic gameplay commands carry stable IDs
  and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, regions, and 800x600 layout match
  `mockup.html` (BUILD and CLOSE buttons present with
  `data-action` attrs `buildTree.build`, `buildTree.close`;
  Selected panel shows Cost, Wood, Ore, Built-today rows).
  Selection is implicit on node click, consistent with sibling
  `interactions.md` § Actions.
- **Schema: ✔** — `building.schema.json`,
  `town-presentation.schema.json`, `resource-id.schema.json`, and
  `command.schema.json` (for `BUILD_BUILDING`) are all present in
  `content-schema/schemas/`; rows registered in
  [`schema-matrix.md`](../../../schema-matrix.md) per sibling
  `data-contracts.md` § Content Schemas And Registries.
- **Tasks: ✔** — Owning task
  [`tasks/phase-2/07-ui-screen-backlog/30-build-tree-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/30-build-tree-screen.md)
  lists all five package files in Read First and outputs
  `src/ui/screens/BuildTree.tsx`.

## ⚠ Issues

- **Town and build-tree state slices missing from
  `data-inventory.md`.** Spec binds to
  `state.towns.byId[selected].buildings`, `availableBuilds`,
  `builtToday`, and `state.ui.buildTree.selectedBuildingId`, but
  [`data-inventory.md` § 1](../../../data-inventory.md) registers
  none of them (only `state.ui.options` covers part of the UI
  slice). Per CLAUDE.md root contract ("every persisted field is
  registered in `data-inventory.md`"), the engine task that owns
  the town reducer
  ([`mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`](../../../../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md),
  upstream of
  [`30-build-tree-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/30-build-tree-screen.md))
  must add the rows. Suggested values: gameplay rows
  domain=`towns`, persistence=`indexeddb`, retention=`scenario`;
  UI-slice row domain=`ui`, persistence=`session`,
  retention=`screen`. Not closed here per Hard Prohibition D.
