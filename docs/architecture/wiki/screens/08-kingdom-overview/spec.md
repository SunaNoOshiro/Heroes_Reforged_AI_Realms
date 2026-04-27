# Screen 08: Kingdom Overview

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure-layer kingdom ledger showing owned towns, heroes, daily income, movement status, and strategic warnings without changing gameplay state.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- A parchment ledger overlays the dimmed adventure map: town rows on the left, hero rows on the right, resource income strip at the bottom, and small brass row selectors.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- KingdomOverview
  - TownLedger
  - HeroLedger
  - DailyIncomeStrip
  - StrategicWarnings
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| townRows | state.players.active.townIds | Owned towns with build, income, and garrison summary. |
| heroRows | state.players.active.heroIds | Owned heroes with movement, mana, army strength, and location. |
| incomeTotals | selectors.economy.dailyIncomeByResource | Daily income preview from town and mine ownership. |
| selectedRow | state.ui.kingdomOverview.selectedRowId | Local focus row for keyboard and pointer navigation. |
| warnings | selectors.adventure.kingdomWarnings | Threats, idle heroes, empty towns, and blocked build state. |

### Mechanics Mapping
- Summarizes owned towns, heroes, income, garrison pressure, and movement readiness. Selecting a row focuses a town or hero; no gameplay command is committed until a route opens another screen.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Ledger slides up over the map, selected rows receive a brass outline, resource deltas count upward after day/week changes, and close fades back to map focus.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `kingdom-overview`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
