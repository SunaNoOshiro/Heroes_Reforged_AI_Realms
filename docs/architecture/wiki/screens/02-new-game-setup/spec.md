# Screen 02: New Game Setup

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Scenario setup shell for single scenario, campaign, random map, multiplayer, difficulty, player color, and starting options.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Stone-framed setup panel with mode tabs, scenario list, preview map, player slots, difficulty shields, and Start/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- NewGameSetup
  - ModeTabs
  - ScenarioList
  - ScenarioPreview
  - PlayerSlotTable
  - DifficultySelector
  - StartBackButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| setupMode | state.ui.newGame.mode | Single, campaign, random, multiplayer, or tutorial draft. |
| scenarioList | selectors.scenarios.availableScenarios | Compatible scenario records from installed packs. |
| selectedScenario | state.ui.newGame.selectedScenarioId | Local selected scenario. |
| playerSlots | state.ui.newGame.playerSlots | Human/AI/open/closed player slot draft. |
| difficulty | state.ui.newGame.difficulty | Ruleset difficulty draft. |

### Mechanics Mapping
- Creates a setup draft only. Starting the game validates selected scenario or generator config, pack compatibility, player slots, victory/loss conditions, and deterministic seed.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Mode tabs depress, scenario preview parchment slides in, player color flags flip, and Start fades into loading once validation succeeds.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `new-game-setup`; system group: `menus`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
