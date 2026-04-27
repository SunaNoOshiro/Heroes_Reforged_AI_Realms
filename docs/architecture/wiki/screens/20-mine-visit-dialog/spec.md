# Screen 20: Mine Visit Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Mine capture or visit dialog showing resource type, current owner, guard state, income, and flagging outcome.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Mine entrance portrait and colored ownership flag sit beside resource yield text, guard/visited state, and Claim/Leave controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MineVisitDialog
  - MinePortrait
  - OwnerFlag
  - IncomePreview
  - GuardSummary
  - ClaimLeaveButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| mineId | state.ui.adventure.pendingMineVisit.mineId | Visited mine object. |
| mineRecord | state.mapObjects.byId[mineId] | Resource type, owner, guard, and income. |
| activePlayer | state.turn.activePlayerId | Player color for flagging. |
| dailyIncome | selectors.economy.mineIncomePreview | Income gained if claimed. |
| guardState | selectors.mapObjects.mineGuardState | Unfought, defeated, or none. |

### Mechanics Mapping
- Capturing a mine validates hero position, guard resolution, player ownership, and mine rules before changing owner and updating daily income.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Flag cloth unfurls in the active player color, resource icon sparkles, income text ticks, and map mine sprite changes owner color on close.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `mine-visit-dialog`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
