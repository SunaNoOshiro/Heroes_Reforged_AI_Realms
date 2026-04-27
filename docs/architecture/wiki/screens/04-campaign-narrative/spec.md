# Screen 04: Campaign Inter-Mission Narrative

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Campaign briefing or inter-mission narrative screen with story text, portrait, mission objectives, carryover, and Start Mission control.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Wide parchment briefing with illustrated portrait panel, scrolling story text, objective plaques, carryover slots, and Start/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CampaignNarrative
  - StoryScroll
  - SpeakerPortrait
  - ObjectivePlaques
  - BonusChoiceSlots
  - StartMissionButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| campaignNode | state.campaign.currentNodeId | Current campaign mission node. |
| storyText | localization.campaign[node].briefing | Localized briefing/intermission text. |
| objectives | registries.scenarios.byId[mission].objectives | Victory and loss objective records. |
| bonusChoices | state.ui.campaignNarrative.selectedBonus | Local starting bonus choice. |
| carryover | selectors.campaigns.currentCarryover | Heroes/artifacts/resources carried into mission. |

### Mechanics Mapping
- Loads campaign node data, localized narrative, objective records, bonus choices, carryover state, and selected difficulty before mission initialization.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Narrative text types in, portrait fades from sepia, objective seals stamp, and Start transitions through loading.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `campaign-narrative`; system group: `menus`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
