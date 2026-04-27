# Screen 57: High Scores

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
High score ledger showing completed game rankings, player names, score, days, difficulty, scenario, and campaign medals.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Large stone-and-parchment ranking table with top-three plaques, filter tabs, selected score details, and Back button.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- HighScores
  - RankingTable
  - MedalPlaques
  - FilterTabs
  - SelectedScoreDetails
  - BackButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| scoreRecords | state.profile.highScores | Completed game score records. |
| filter | state.ui.highScores.filter | Scenario, campaign, difficulty, or all. |
| selectedRecord | state.ui.highScores.selectedRecordId | Local selected row. |
| sortOrder | selectors.profile.sortedHighScores | Deterministic ranking order. |
| newRecordId | state.ui.highScores.newRecordId | Optional highlight after victory. |

### Mechanics Mapping
- Reads profile score records and sorts deterministically by score/date tie-breakers. It is read-only except clearing/importing through confirmed profile actions.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Score rows cascade, top-three plaques glint, filter tabs turn pages, and new records pulse once after victory.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `high-scores`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
