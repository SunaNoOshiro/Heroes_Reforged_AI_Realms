# Screen 13: Hill Fort

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Hill Fort upgrade service where eligible hero stacks can be upgraded for calculated resource costs.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Stone fort service window with current army slots on the left, upgrade arrows in the center, upgraded creature targets and cost ledger on the right.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- HillFortDialog
  - CurrentArmySlots
  - UpgradePathList
  - CostLedger
  - UpgradeButtons
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| heroArmy | state.heroes.byId[selected].army | Hero stacks available for upgrade. |
| upgradeTargets | selectors.creatures.availableHillFortUpgrades | Upgrade path and target creature records. |
| selectedStack | state.ui.hillFort.selectedStackIndex | Local selected army slot. |
| costPreview | selectors.economy.upgradeCostPreview | Gold/resource cost for selected quantity. |
| resources | state.players.active.resources | Available resources for command guard. |

### Mechanics Mapping
- Each stack upgrade checks creature upgrade path, town/faction rules, hero ownership, resource cost, and destination army capacity before dispatching upgrade commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Eligible stack slots glow, selected stack marches across an arrow, upgraded portrait flashes, and resource cost ticks down after the command resolves.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `hill-fort`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
