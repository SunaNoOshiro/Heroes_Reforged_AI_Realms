# Screen 03: Campaign Selection

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Campaign book selection with campaign list, faction emblem, progress medals, difficulty, and briefing route.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Leather campaign book with campaign shields on the left, campaign map parchment center, completion medals, and Begin/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CampaignSelection
  - CampaignBook
  - CampaignShieldList
  - CampaignMapPreview
  - ProgressMedals
  - BeginBackButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| campaigns | selectors.campaigns.availableCampaigns | Campaign records visible under installed packs. |
| selectedCampaign | state.ui.campaign.selectedCampaignId | Local selection. |
| unlockState | state.profile.campaignUnlocks | Locked/unlocked/completed medals. |
| difficulty | state.ui.campaign.difficulty | Campaign difficulty draft. |
| carryoverPreview | selectors.campaigns.carryoverPreview | Hero/artifact/resource carryover preview. |

### Mechanics Mapping
- Reads campaign definitions, unlocked campaign state, previous progress, selected difficulty, and carryover rules before opening the first briefing.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Book pages turn between campaigns, faction shield glints, locked campaign chains rattle, and Begin routes to briefing parchment.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `campaign-selection`; system group: `menus`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
