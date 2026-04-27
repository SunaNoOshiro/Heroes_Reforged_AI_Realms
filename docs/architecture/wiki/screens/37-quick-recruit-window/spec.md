# Screen 37: Quick Recruit Window

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Condensed town-wide recruitment window for buying available creatures across all built dwellings in one pass.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Dense seven-row recruitment ledger with creature portraits, stock, max affordable quantity, checkboxes, destination army preview, and total cost footer.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- QuickRecruitWindow
  - DwellingRecruitRows
  - SelectionCheckboxes
  - TotalCostFooter
  - DestinationArmyPreview
  - RecruitAllButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| dwellingRows | selectors.towns.quickRecruitRows | Built dwellings, stock, creature IDs, and costs. |
| selectedRows | state.ui.quickRecruit.selectedDwellingIds | Local checked rows. |
| destinationArmy | selectors.towns.quickRecruitDestinationArmy | Hero or garrison target. |
| totalCost | selectors.economy.quickRecruitTotalCost | Aggregated cost for selected rows. |
| rowGuards | selectors.towns.quickRecruitRowGuards | Per-row disabled reasons. |

### Mechanics Mapping
- Each checked row validates dwelling built state, stock, resources, growth availability, destination capacity, and merge rules. Commit applies rows in deterministic order.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Checked rows glow, total cost rolls up, recruited stacks march into army slots, and unavailable rows remain dark with localized disabled reasons.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `quick-recruit-window`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
