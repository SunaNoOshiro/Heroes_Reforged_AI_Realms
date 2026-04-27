# Screen 59: Loading Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Loading/progress screen for scenario creation, save load, random map generation, asset warmup, and route handoff.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Full-screen illustrated loading plate with progress bar, current step text, small animated crest, and optional cancel/back on recoverable tasks.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- LoadingScreen
  - LoadingArtwork
  - ProgressBar
  - StepText
  - AnimatedCrest
  - RecoverableErrorPanel

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| loadingTask | state.ui.loading.taskId | Scenario generation, save load, asset warmup, or route. |
| progress | state.ui.loading.progress | Named step progress for presentation. |
| destination | state.ui.loading.destinationRoute | Route after load. |
| errors | state.ui.loading.errors | Recoverable validation or IO errors. |
| contentHashes | state.ui.loading.contentHashes | Pack/hash data for deterministic load. |

### Mechanics Mapping
- Coordinates async presentation/content work while deterministic game state creation remains explicit and seed/hash based. Failures show localized recovery actions.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Progress bar fills by named task, crest rotates, background torch flickers, and successful load fades to destination screen.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `loading-screen`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
