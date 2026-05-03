# Screen 39: Battle Results

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Post-combat result panel with victory/defeat banner, experience gain, casualties, spoils, captured artifacts, and continue routing.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- A centered results parchment sits over a dim battlefield with two casualty columns, experience ribbon, spoils row, and a large continue check button.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- BattleResultsDialog
  - OutcomeBanner
  - ExperienceBar
  - AttackerCasualties
  - DefenderCasualties
  - SpoilsRow
  - ContinueButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| battle.outcome | state.battle.result.outcome | Win/loss/retreat/surrender outcome. |
| experience | state.battle.result.experienceGained | Hero XP reward. |
| casualties | state.battle.result.casualties | Lost stacks by side. |
| spoils | state.battle.result.spoils | Resources/artifacts gained. |
| nextRoute | state.battle.result.returnRoute | Adventure, town, defeat, or campaign route. |

### Mechanics Mapping
- Applies battle outcome exactly once: surviving stacks, hero experience, artifacts, spoils, retreat/surrender state, and victory-condition triggers.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Outcome banner drops in, experience bar fills, spoils appear in sequence, continue button glows after all results are acknowledged.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `battle-results`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
