# Screen 41: Surrender Cost Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Combat surrender confirmation with ransom cost, available gold, surviving army value, hero survival outcome, and accept/decline controls.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- A compact parchment modal overlays the active battlefield, with a large gold cost plaque, survivor summary, and accept/decline buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- SurrenderCostDialog
  - GoldCostPlaque
  - SurvivorSummary
  - AvailableGold
  - OutcomeText
  - AcceptDeclineButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| survivingArmyValue | state.battle.surrender.armyValue | Cost basis. |
| surrenderCost | state.battle.surrender.cost | Computed ransom. |
| availableGold | state.players.active.resources.gold | Affordability guard. |
| heroOutcome | state.battle.surrender.heroOutcome | Hero survival and return route. |

### Mechanics Mapping
- Surrender cost derives from surviving army value and ruleset; accepting spends gold and resolves battle with hero survival route.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Gold cost plaque pulses, accept button glows only when affordable, accepted modal folds into battle result routing.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `surrender-cost-dialog`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
