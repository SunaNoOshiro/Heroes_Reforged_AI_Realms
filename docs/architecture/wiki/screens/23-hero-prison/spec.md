# Screen 23: Hero Prison

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure prison dialog for releasing an imprisoned hero into the player's roster when limits and ownership rules allow.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- A barred prison cell portrait dominates the dialog, with hero class/level/army preview, roster capacity warning, and Release/Leave controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- HeroPrisonDialog
  - PrisonCellPortrait
  - ImprisonedHeroSummary
  - RosterCapacityPanel
  - ReleaseLeaveButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| prisonId | state.ui.adventure.pendingPrisonId | Visited prison object. |
| imprisonedHero | state.mapObjects.byId[prisonId].heroId | Hero record locked inside prison. |
| rosterSlots | selectors.heroes.availableRosterSlots | Player hero capacity and free slots. |
| releaseGuard | selectors.heroes.prisonReleaseGuard | Eligibility and disabled reason. |
| spawnTile | selectors.mapObjects.prisonReleaseTile | Tile where the released hero appears. |

### Mechanics Mapping
- Release validates prison object state, active player roster capacity, hero record availability, and scenario rules before creating the hero on the map.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Cell bars lift, hero portrait brightens, roster slot glows, released hero appears beside the prison, and the prison object becomes visited.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `hero-prison`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
