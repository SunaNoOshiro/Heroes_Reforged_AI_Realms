# Screen 18: Map Object Tooltip

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Right-click informational tooltip for adventure map objects, heroes, towns, resources, and guarded encounters.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Compact black-and-bronze tooltip floats near the hovered object with portrait, public name, ownership/guard hints, and no command buttons unless pinned.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MapObjectTooltip
  - TooltipAnchor
  - ObjectPortrait
  - PublicInfoRows
  - PinState
  - CloseHotspot

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| hoverObject | state.ui.adventure.hoverObjectId | Object under pointer or controller focus. |
| publicInfo | selectors.mapObjects.publicTooltipInfo | Name, type, owner, and visible hints. |
| hiddenGuard | selectors.scouting.hiddenTooltipFields | Masked fields due to fog/scouting rules. |
| pinState | state.ui.tooltips.pinnedObjectId | Local pinned tooltip state. |
| anchorPosition | state.ui.pointer.anchorRect | Screen-space placement only. |

### Mechanics Mapping
- Tooltip data is presentation-only and visibility-filtered; hidden army counts, rewards, or ownership stay masked when fog/scouting rules require it.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `map-object-tooltip`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
