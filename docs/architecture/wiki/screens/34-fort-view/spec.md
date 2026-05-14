# Screen 34: Fort View

### Screen Package

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description

Town fortification inspection view. Shows the built fort / citadel /
castle tier, per-wall and per-tower battle bonuses, gate / moat
presence, and the next upgrade's prerequisites for siege readiness.

### Visual Direction

- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract

- Curation status: `curated-pass-4`.
- 800×600 fixed layout. Ornate gold frame over a town-panorama
  backdrop; a centered stone-keep cutaway panel labeled
  **Fortifications** carries wall segments, two tower slots, a
  centered keep silhouette, a status plaque, and the `BUILD` /
  `CLOSE` buttons.
- Missing-upgrade silhouettes pulse on the cutaway; tower icons
  flare on hover; gate opens on hover. Dense classic fantasy
  strategy UI: red / brown / stone panels, compact icon slots,
  right-click detail affordances.
- `mockup.html` carries visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree

- `FortView`
  - `FortificationCutaway`
  - `WallSegmentList`
  - `TowerSlots`
  - `SiegeBonusChecklist`
  - `CloseButton`

### State Bindings

| Element | Bound To | Notes |
| --- | --- | --- |
| `fortLevel` | `state.towns.byId[selected].fortificationLevel` | `none` / `fort` / `citadel` / `castle`. |
| `wallDefinition` | `selectors.towns.fortificationBattleLayout` | Wall, tower, gate, and moat definitions for the battle layout. |
| `growthBonus` | `selectors.towns.fortificationGrowthBonus` | Creature-growth multiplier the current tier applies. |
| `buildPrereqs` | `selectors.towns.nextFortUpgradePrereqs` | Buildings, resources, and turn gates blocking the next upgrade. |
| `selectedSegment` | `state.ui.fortView.selectedSegment` | Local highlighted wall or tower segment. UI-only draft. |

### Mechanics Mapping

- The screen reads the built fortification level and faction wall
  rules; it exposes the resulting battle layout, tower shot count,
  moat presence, growth bonus, and next-upgrade prerequisites. The
  upgrade itself is enacted from `30-build-tree`, not here.
- UI previews stay local until the dispatcher or a route guard
  accepts them.
- Costs, buildings, towns, and battle layouts resolve through
  registries and content schemas, not hardcoded view logic.

### Animation Contract

- Wall segments highlight in construction order on focus; tower
  icons flare on hover; the gate opens on hover; missing upgrades
  pulse as dark silhouettes on the cutaway.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and every authoritative state
  binding.
- Interactions file covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes

- Screen slug: `fort-view`; system group: `town`; curation marker:
  `curated-pass-4`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and `BUILD` / `CLOSE` buttons match sibling [`interactions.md § Actions`](./interactions.md) and the `data-action="fortView.buildTree"` / `data-action="fortView.close"` hooks in [`mockup.html`](./mockup.html). Mockup-visible title "Fortifications" is recorded in § Visual Contract.
- **Schema: ✔** — Every selector and state path is listed identically in sibling [`data-contracts.md § Runtime State Selectors`](./data-contracts.md) and [`architecture.md § State Inputs`](./architecture.md); referenced schemas (`building.schema.json`, `town-presentation.schema.json`, `ruleset.schema.json`, etc.) exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/).
- **Tasks: ⚠** — Owning UI task [`phase-2.07-ui-screen-backlog.34-fort-view-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/34-fort-view-screen.md) lists this file in Read First; the engine source of `fortificationBattleLayout` / `fortificationGrowthBonus` selectors is implied to be [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) (declared as a dependency), but that task does not currently name the selectors in its Outputs. See `## ⚠ Issues`.

## ⚠ Issues

- **Town fort state slices are not registered in [`data-inventory.md`](../../../data-inventory.md).** This spec asserts that `state.towns.byId[selected].fortificationLevel` is the persisted source of truth, but `data-inventory.md` has no row for it (grep returns no `towns` / `fortif` matches). Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), the owning engine task — likely [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) — must add a row. Suggested values: domain=`towns`, owner=`phase-2.01-spells-artifacts.13-siege-state-machine`, persistence=`indexeddb`, retention=`game`. The local UI draft slice `state.ui.fortView.selectedSegment` does not persist, so it is exempt under [`persistence.md`](../../../persistence.md), but the row check still applies to the gameplay slice. Skill did not add the row itself (Hard Prohibition D — never edit cross-checked files).
- **Selector ownership is implicit.** `selectors.towns.fortificationBattleLayout`, `selectors.towns.fortificationGrowthBonus`, and `selectors.towns.nextFortUpgradePrereqs` are referenced here, in `interactions.md`, and in `data-contracts.md`, but no task `.md` declares them as Outputs. The dependency on [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) is the most likely owner. Suggested follow-up: extend that task's Outputs to name these three selectors. Skill did not modify the task file (Hard Prohibition D).
