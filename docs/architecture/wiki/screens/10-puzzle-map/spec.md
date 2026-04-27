# Screen 10: Puzzle Map

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Obelisk puzzle map view revealing grail-location fragments according to visited obelisks.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- A large torn parchment map fills the center with square fragment tiles, hidden soot masks, revealed terrain hints, and an obelisk progress plaque.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- PuzzleMapScreen
  - FragmentGrid
  - ObeliskProgress
  - GrailHintPanel
  - MapJumpButton
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| obeliskProgress | state.players.active.obelisksVisited | Visited count and total obelisks. |
| fragmentGrid | selectors.grail.revealedPuzzleFragments | Visible fragment mask from deterministic scenario data. |
| selectedFragment | state.ui.puzzleMap.selectedFragment | Local selected clue tile. |
| grailRegionHint | selectors.grail.visibleRegionHint | Text/region hint allowed by current reveal progress. |
| mapJumpTarget | selectors.grail.selectedFragmentMapFocus | Optional camera focus for revealed clue. |

### Mechanics Mapping
- Revealed tiles are derived from visited obelisk count and scenario grail metadata. Clicking a revealed tile only changes local focus unless a map jump is explicitly requested.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- New fragments peel open with parchment curl, hidden fragments shimmer subtly, and focused clue tiles pulse with a gold border.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `puzzle-map`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
