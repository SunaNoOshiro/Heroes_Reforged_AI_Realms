# Screen 11: Quest Log

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure quest ledger listing active, completed, failed, and repeatable map-object quests with requirements, deadlines, and rewards.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Tabbed parchment book over the map with active quest list on the left, selected quest details on the right, reward slots, and source/focus controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- QuestLog
  - QuestTabs
  - QuestList
  - QuestDetails
  - RequirementChecklist
  - RewardSlots
  - SourceFocusButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| questFilter | state.ui.questLog.filter | Local tab: active, completed, failed, or all. |
| questRows | selectors.quests.visibleQuestRows | Quest rows visible to the active player. |
| selectedQuest | state.ui.questLog.selectedQuestId | Local selected quest. |
| requirements | selectors.quests.selectedQuestRequirements | Artifacts, creatures, resources, hero level, or deadline. |
| rewardPreview | selectors.quests.selectedQuestRewards | Visible reward slots from quest registry. |

### Mechanics Mapping
- Quest state is read from scenario quest records and hero/player progress. The log can focus a source object or reveal completion requirements; it does not grant rewards.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Quest tabs flip pages, newly updated quests stamp a seal, selected objectives underline, and source focus closes through a map fade.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `quest-log`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
