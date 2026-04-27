# Screen 19: Status Bar

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure status line and message history strip showing hover descriptions, command feedback, resource changes, and disabled reasons.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- The bottom status strip is expanded into a scrollable message drawer with the map still visible above and resource/date chrome locked in place.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- AdventureStatusBar
  - MessageTicker
  - MessageHistoryDrawer
  - PinnedMessage
  - ResourceDeltaBadges

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| hoverContext | state.ui.adventure.hoverContext | Current hover/focus description. |
| latestMessage | state.ui.messages.latest | Most recent localized status event. |
| messageHistory | state.ui.messages.history | Client-side message history, not replay authoritative. |
| resourceDeltas | selectors.economy.lastVisibleDeltas | Recent command-result deltas. |
| drawerOpen | state.ui.statusBar.drawerOpen | Local expanded/collapsed state. |

### Mechanics Mapping
- Status messages are UI feedback derived from hover context, command results, and localized errors. They do not control reducers or alter replay state.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- New messages slide in from the left, resource deltas glow, pinned messages receive a wax seal, and drawer expansion pushes no gameplay layout.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `status-bar`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
