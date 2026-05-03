# Screen 09: Map Object Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Generic adventure object visit dialog for shrines, events, guarded rewards, signs, one-shot pickups, and choice prompts.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- The map remains visible behind a centered carved dialog with object portrait, message parchment, reward/cost preview, and OK/Cancel buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MapObjectDialog
  - ObjectPortrait
  - ObjectMessage
  - RequirementPanel
  - RewardPreview
  - DialogButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| objectId | state.ui.adventure.pendingObjectVisit.objectId | Map object selected by movement or click. |
| heroId | state.adventure.selectedHeroId | Visiting hero context. |
| visitRecord | state.mapObjects.byId[objectId] | Object type, visited flags, rewards, requirements, and scripts. |
| rewardPreview | selectors.mapObjects.previewVisitReward | Visible deterministic reward/cost preview. |
| guardResult | selectors.mapObjects.visitGuard | Eligibility, disabled reason, and command availability. |

### Mechanics Mapping
- Visit resolution reads the object record, visit state, guard requirement, reward table, and hero eligibility before dispatching a deterministic object interaction command.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Dialog pops from the object position, portrait glows, reward icons sparkle on accepted visits, and rejected visits shake the message parchment.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `map-object-dialog`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
