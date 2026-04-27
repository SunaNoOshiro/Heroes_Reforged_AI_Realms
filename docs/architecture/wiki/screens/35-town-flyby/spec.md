# Screen 35: Town Flyby

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Optional cinematic town entry/faction panorama flyby before the interactive town screen appears.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Letterboxed full-panorama shot with slow camera path markers, faction crest, loading/progress strip, and skip button.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- TownFlyby
  - PanoramaCameraPath
  - FactionCrest
  - AssetWarmupProgress
  - SkipButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| townId | state.towns.selectedTownId | Town being entered. |
| factionId | state.towns.byId[selected].factionId | Faction visuals and music. |
| assetWarmup | state.ui.assetWarmup.townScreen | Presentation loading state. |
| cameraPath | selectors.presentation.townFlybyPath | Deterministic presentation path from asset metadata. |
| skipAvailable | config.ui.allowSkipCinematics | Skip button availability. |

### Mechanics Mapping
- Presentation-only transition loads town panorama assets, faction audio, and hotspot metadata before opening the interactive town screen.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Camera eases across the skyline, parallax layers drift, faction crest fades in, and skip accelerates to the town screen without gameplay mutation.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `town-flyby`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
