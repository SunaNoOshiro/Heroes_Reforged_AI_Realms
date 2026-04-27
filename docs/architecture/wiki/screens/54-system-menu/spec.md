# Screen 54: System Menu

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
In-game system menu overlay for save, load, options, restart, main menu, and quit confirmation.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Compact stone command tablet centered over dimmed current gameplay screen with vertical beveled command buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- SystemMenu
  - DimmedGameplayBackdrop
  - CommandTablet
  - SaveLoadButtons
  - OptionsButton
  - ConfirmRoutes

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| callerRoute | state.ui.systemMenu.callerRoute | Screen to resume. |
| canSave | selectors.persistence.canSaveCurrentGame | Save command availability. |
| canLoad | selectors.persistence.hasLoadableSave | Load command availability. |
| restartGuard | selectors.session.restartGuard | Restart disabled/confirm state. |
| dirtyDrafts | state.ui.unsavedDrafts | Local drafts needing discard confirmation. |

### Mechanics Mapping
- Routes to save/load/options/confirmation without mutating gameplay. Destructive actions require confirmation and preserve deterministic state until accepted.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Current screen darkens, tablet drops in, hovered command glows, and route buttons crossfade into child dialogs.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `system-menu`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
