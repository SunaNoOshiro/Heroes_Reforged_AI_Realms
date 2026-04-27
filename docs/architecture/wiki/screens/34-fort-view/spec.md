# Screen 34: Fort View

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town fortification inspection view showing fort/citadel/castle tier, wall/tower battle bonuses, and siege readiness.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Stone keep cutaway sits over the town panorama with wall segments, tower slots, moat/gate plaques, and siege bonus checklist.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- FortView
  - FortificationCutaway
  - WallSegmentList
  - TowerSlots
  - SiegeBonusChecklist
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| fortLevel | state.towns.byId[selected].fortificationLevel | Fort, Citadel, Castle, or none. |
| wallDefinition | selectors.towns.fortificationBattleLayout | Wall/tower/gate/moat definitions. |
| growthBonus | selectors.towns.fortificationGrowthBonus | Creature growth multiplier from fort tier. |
| buildPrereqs | selectors.towns.nextFortUpgradePrereqs | Next upgrade requirements. |
| selectedSegment | state.ui.fortView.selectedSegment | Local highlighted wall/tower segment. |

### Mechanics Mapping
- Reads built fortification level and faction wall rules to expose battle layout, tower shots, moat presence, growth bonus, and build prerequisites.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Wall segments highlight in construction order, tower icons flare, gate opens on hover, and missing upgrades pulse as dark silhouettes.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `fort-view`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
