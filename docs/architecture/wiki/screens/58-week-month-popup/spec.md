# Screen 58: Week / Month Popup

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Start-of-week/month announcement popup for growth changes, plague, month creature, resource events, and calendar transition.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Small parchment proclamation over adventure map with creature/event icon, calendar date, growth/resource effects, and OK button.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- WeekMonthPopup
  - CalendarHeader
  - EventIcon
  - EffectList
  - OkButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| calendar | state.calendar.currentDate | Month/week/day after transition. |
| eventRecord | state.calendar.pendingAnnouncement | Week/month event to announce. |
| growthEffects | selectors.calendar.visibleGrowthEffects | Creature growth modifiers. |
| resourceEffects | selectors.calendar.visibleResourceEffects | Resource/income changes. |
| acknowledged | state.ui.calendarAnnouncement.acknowledged | Local acknowledgment state. |

### Mechanics Mapping
- Appears after the calendar reducer advances and weekly/monthly events are already computed. OK only acknowledges visible results.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Proclamation unfurls, event icon bounces, growth numbers sparkle, and OK folds the parchment back to adventure map.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `week-month-popup`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
